import { SessionManager } from '../utils/session.manager';
import prisma from '../prisma/client';
import { Prisma } from '@prisma/client';
import { TokenRefreshService } from '../utils/token.refresh.service';
import { config } from '../configs/env.config';

export class ReraService {
  private static BASE_URL = config.mahaReraBaseUrl;

  private static toInt(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'number') return Number.isNaN(value) ? undefined : value;
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private static toDecimal(value: any): Prisma.Decimal | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    try {
      return new Prisma.Decimal(value);
    } catch {
      return undefined;
    }
  }

  private static toDate(value: any): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private static toBool(value: any): boolean | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    const normalized = String(value).toLowerCase();
    if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
    return undefined;
  }

  private static toFlag(value: any): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (typeof value === 'number') return value;
    const parsed = parseInt(String(value), 10);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  private static unwrapResponse(data: any): any {
    if (!data) return null;
    if (data.responseObject !== undefined) return data.responseObject;
    if (data.data && data.data.responseObject !== undefined) return data.data.responseObject;
    return data;
  }

  private static asArray(data: any): any[] {
    if (!data) return [];
    return Array.isArray(data) ? data : [data];
  }

  static async searchByReraNo(reraNo: string) {
    // Search is not stable via API.
    // User has opted to use Project ID directly.
    console.log('Search by RERA Number is currently disabled. Please use Project ID.');
    throw {
      response: { status: 400 },
      message: 'Search by RERA Number is not supported. Please provide projectId directly.'
    };
  }

  static async getCaptcha() {
    const client = await SessionManager.getClient();
    const response = await client.get(`${this.BASE_URL}/api/Auth/getCaptchaImage`, {
      responseType: 'arraybuffer',
      headers: {
        'Referer': `${this.BASE_URL}/searchproject/searchproject.html`
      }
    });
    return response.data;
  }

  static async fetchProjectDetails(projectId: string, captchaText: string | null, reraNo: string) {
    const client = await SessionManager.getClient();
    const projectIdInt = this.toInt(projectId);

    // 1. Verify Captcha (only if provided)
    if (captchaText && captchaText !== 'DUMMY') {
      await client.post(`${this.BASE_URL}/api/Auth/verifyCaptcha`, {
        captchaText: captchaText
      }, {
        headers: {
          'Referer': `${this.BASE_URL}/searchproject/searchproject.html`
        }
      });
    }

    // 2. Fetch all details in parallel
    // New microservice-based endpoints found in Postman/HAR
    const BASE_PATH = '/api/maha-rera-public-view-project-registration-service/public/projectregistartion';
    
    const endpoints = [
      `${BASE_PATH}/getProjectGeneralDetailsByProjectId`,
      `${BASE_PATH}/getProjectCurrentStatus`,
      `${BASE_PATH}/getStatusForProjectPreview`,
      `${BASE_PATH}/getProjectAndAssociatedPromoterDetails`,
      `${BASE_PATH}/getUploadedDocuments`,
      `${BASE_PATH}/getProjectLandCCDetailsResponse`,
      `${BASE_PATH}/getMigratedDocuments`,
      `${BASE_PATH}/getProjectBuildingDetails`, // Assuming this exists, based on pattern
      `${BASE_PATH}/getProjectBuildingWingsDtls`, // Assuming this exists
      `${BASE_PATH}/getBuildingWingUnitSummary`,
      `${BASE_PATH}/getBuildingWingsActivityDetails`, // Assuming this exists
      `${BASE_PATH}/getBuildingWingsCostEstimation`,
      `${BASE_PATH}/getProjectLitigationDetails`, // Assuming this exists
      `${BASE_PATH}/getProjectProfessionalByType`,
      `${BASE_PATH}/getProjectPhase`,
      `${BASE_PATH}/getProjectLandHeaderDetails`,
      `${BASE_PATH}/getProjectLandAddressDetails`,
      `${BASE_PATH}/getPromoterSpocDetails`
    ];

    const fetchEndpoints = async () => Promise.all(
      endpoints.map(endpoint =>
        client.post(`${this.BASE_URL}${endpoint}`, { projectId: projectId }, {
          headers: {
            'Referer': `${this.BASE_URL}/public/project/view/${projectId}`,
            'Content-Type': 'application/json'
          }
        }).then(res => ({ endpoint, data: res.data }))
          .catch(err => {
            console.error(`Error on ${endpoint}:`, err.response?.status);
            return { endpoint, error: err.message, status: err.response?.status };
          })
      )
    );

    let results = await fetchEndpoints();
    const hasAuthError = results.some(result => result.status === 401);

    if (hasAuthError) {
      console.log('🔄 Detected 401 responses. Refreshing token and retrying once...');
      await TokenRefreshService.refreshToken();
      results = await fetchEndpoints();
    }

    const hasSuccessful = results.some(result => result.data && !result.error);
    if (!hasSuccessful) {
      const unauthorized = results.some(result => result.status === 401);
      if (unauthorized) {
        throw {
          response: { status: 401 },
          message: 'Authentication failed after token refresh.'
        };
      }
      throw {
        response: { status: 502 },
        message: 'All MahaRERA API calls failed. No data to persist.'
      };
    }

    const aggregatedResponse = results.reduce((acc: any, curr: any) => {
      const key = curr.endpoint.split('/').pop()?.split('?')[0] || curr.endpoint;
      acc[key] = curr.data || { error: curr.error };
      return acc;
    }, {});

    // 3. Store in DB
    return await this.saveStructuredProjectData(aggregatedResponse, projectIdInt, reraNo);
  }

  private static async saveStructuredProjectData(aggregatedResponse: any, projectId: number | undefined, reraNo: string) {
    if (!projectId) {
      throw new Error('Invalid projectId. Unable to persist structured data.');
    }

    const generalPayloadRaw = this.unwrapResponse(aggregatedResponse.getProjectGeneralDetailsByProjectId);
    const assocPayload = this.unwrapResponse(aggregatedResponse.getProjectAndAssociatedPromoterDetails);
    const generalPayload = assocPayload?.projectDetails?.projectGeneralDetails || generalPayloadRaw;
    const landAddressFromAssoc = assocPayload?.projectDetails?.projectLegalLandAddressDetails;

    const statusPayload = this.unwrapResponse(aggregatedResponse.getProjectCurrentStatus);
    const landHeaderPayload = this.unwrapResponse(aggregatedResponse.getProjectLandHeaderDetails);
    const landAddressPayload = this.unwrapResponse(aggregatedResponse.getProjectLandAddressDetails) || landAddressFromAssoc;
    const promoterDetailsPayload = assocPayload?.promoterDetails;
    const spocPayload = this.unwrapResponse(aggregatedResponse.getPromoterSpocDetails);
    const professionalsPayload = this.unwrapResponse(aggregatedResponse.getProjectProfessionalByType);
    const ccDocsPayload = this.unwrapResponse(aggregatedResponse.getProjectLandCCDetailsResponse);
    const migratedDocsPayload = this.unwrapResponse(aggregatedResponse.getMigratedDocuments);
    const buildingSummaryPayload = this.unwrapResponse(aggregatedResponse.getBuildingWingUnitSummary);
    const buildingActivitiesPayload = this.unwrapResponse(aggregatedResponse.getBuildingWingsActivityDetails);
    const costEstimationPayload = this.unwrapResponse(aggregatedResponse.getBuildingWingsCostEstimation);
    const uploadedDocsPayload = this.unwrapResponse(aggregatedResponse.getUploadedDocuments);

    const generalData = generalPayload
      ? {
          projectId,
          projectIdTypeId: this.toInt(generalPayload.projectIdTypeId),
          projectStatusId: this.toInt(generalPayload.projectStatusId),
          projectName: generalPayload.projectName ?? null,
          projectStartDate: this.toDate(generalPayload.projectStartDate),
          projectProposeComplitionDate: this.toDate(generalPayload.projectProposeComplitionDate),
          projectDescription: generalPayload.projectDescription ?? null,
          userProfileId: this.toInt(generalPayload.userProfileId),
          projectRegistartionNo: generalPayload.projectRegistartionNo ?? null,
          reraRegistrationDate: this.toDate(generalPayload.reraRegistrationDate),
          projectLocationId: this.toInt(generalPayload.projectLocationId),
          projectTypeName: generalPayload.projectTypeName ?? null,
          projectStatusName: generalPayload.projectStatusName ?? null,
          projectCurrentStatus: generalPayload.projectCurrentStatus ?? null,
          projectLocationName: generalPayload.projectLocationName ?? null,
          registrationCertificateDmsRefNo: generalPayload.registrationCertificateDmsRefNo ?? null,
          registrationCertificateFileName: generalPayload.registrationCertificateFileName ?? null,
          originalProjectProposeCompletionDate: this.toDate(generalPayload.originalProjectProposeCompletionDate),
          registrationCertificateGenerationDate: this.toDate(generalPayload.registrationCertificateGenerationDate),
          acknowledgementNumber: generalPayload.acknowledgementNumber ?? null,
          promoterName: generalPayload.promoterName ?? null,
          isProjectAffiliatedPublicAuthority: this.toBool(generalPayload.isProjectAffiliatedPublicAuthority),
          projectAffiliatedPublicAuthorityName: generalPayload.projectAffiliatedPublicAuthorityName ?? null,
          noOfConsent: this.toInt(generalPayload.noOfConsent),
          consentProofDmsRefNo: generalPayload.consentProofDmsRefNo ?? null,
          consentProofFileName: generalPayload.consentProofFileName ?? null,
          userName: generalPayload.userName ?? null,
          currentSaleCount: this.toInt(generalPayload.currentSaleCount),
          currentConsentPercentage: this.toDecimal(generalPayload.currentConsentPercentage),
          projectApplicationType: generalPayload.projectApplicationType ?? null,
          projectApplicationDate: this.toDate(generalPayload.projectApplicationDate),
          isRegistrationApproved: this.toFlag(generalPayload.isRegistrationApproved),
          isBuilding: this.toFlag(generalPayload.isBuilding),
          isNaWithStructure: this.toFlag(generalPayload.isNaWithStructure),
          isNaWithoutStructure: this.toFlag(generalPayload.isNaWithoutStructure),
          totalNumberOfSoldUnits: this.toInt(generalPayload.totalNumberOfSoldUnits),
          totalNumberOfUnits: this.toInt(generalPayload.totalNumberOfUnits),
          isEligibleGeneralUpdate: this.toFlag(generalPayload.isEligibleGeneralUpdate),
          isMigrated: this.toFlag(generalPayload.isMigrated),
          projectFeesPayableAmount: this.toDecimal(generalPayload.projectFeesPayableAmount),
          realEstateAgentRERARegNo: generalPayload.realEstateAgentRERARegNo ?? null,
          extensionCertificateDmsRefNo: generalPayload.extensionCertificateDmsRefNo ?? null,
          extensionCertificateFileName: generalPayload.extensionCertificateFileName ?? null,
          moduleName: generalPayload.moduleName ?? null,
          projectCalculatedGrossFeesApplicable: this.toDecimal(generalPayload.projectCalculatedGrossFeesApplicable),
          receiptDmsRefNo: generalPayload.receiptDmsRefNo ?? null,
          receiptFileName: generalPayload.receiptFileName ?? null,
          projectFormSummaryId: this.toInt(generalPayload.projectFormSummaryId),
          isPromoter: this.toBool(generalPayload.isPromoter),
          form4ReferenceNo: generalPayload.form4ReferenceNo ?? null,
          form4CurrentStatus: generalPayload.form4CurrentStatus ?? null,
          extensionId: this.toInt(generalPayload.extensionId),
          correctionId: this.toInt(generalPayload.correctionId),
          isEligibleForUpdateMigratedProject: this.toFlag(generalPayload.isEligibleForUpdateMigratedProject),
          isFormFullyFilled: this.toFlag(generalPayload.isFormFullyFilled),
          projectPenaltyDetails: generalPayload.projectPenaltyDetails ?? null,
          userProfileTypeId: this.toInt(generalPayload.userProfileTypeId),
          isProjectLapsed: this.toFlag(generalPayload.isProjectLapsed),
          rerasubmissionNumber: generalPayload.rerasubmissionNumber ?? null,
          createdBy: generalPayload.createdBy ?? null,
          isActive: this.toBool(generalPayload.isActive)
        }
      : null;

    const statusCore = statusPayload?.coreStatus || statusPayload;
    const statusData = statusCore
      ? {
          projectId,
          statusId: this.toInt(statusCore.statusId),
          statusName: statusCore.statusName ?? null,
          isDeregistered: this.toFlag(statusCore.isDeregistered),
          isAbeyance: this.toFlag(statusCore.isAbeyance),
          isLandLessThen500: this.toFlag(statusCore.isLandLessThen500)
        }
      : null;

    const landHeaderData = landHeaderPayload
      ? {
          projectId,
          projectLandHeaderId: this.toInt(landHeaderPayload.projectLandHeaderId),
          ulbTypeId: landHeaderPayload.ulbTypeId ?? null,
          ulbOtherTypeName: landHeaderPayload.ulbOtherTypeName ?? null,
          ulbTypeName: landHeaderPayload.ulbTypeName ?? null,
          isPromoter: this.toFlag(landHeaderPayload.isPromoter),
          isPromoterLandowner: this.toFlag(landHeaderPayload.isPromoterLandowner),
          isOtherLandowner: this.toFlag(landHeaderPayload.isOtherLandowner),
          landAreaSqmts: this.toDecimal(landHeaderPayload.landAreaSqmts),
          proposedLandAreaSqmts: this.toDecimal(landHeaderPayload.proposedLandAreaSqmts),
          finalPlotBearingNumber: landHeaderPayload.finalPlotBearingNumber ?? null,
          aggregateArea: this.toDecimal(landHeaderPayload.aggregateArea),
          projectProposedNotSanctionedBuildUpArea: this.toDecimal(landHeaderPayload.projectProposedNotSanctionedBuildUpArea),
          totalPermissiblePlotFsi: this.toDecimal(landHeaderPayload.totalPermissiblePlotFsi),
          isOriginal: this.toFlag(landHeaderPayload.isOriginal)
        }
      : null;

    const landAddressList = this.asArray(landAddressPayload).map((item) => ({
      projectId,
      projectLandAddressId: this.toInt(item.projectLandAddressId),
      projectLandHeaderId: this.toInt(item.projectLandHeaderId),
      projectLegalLandHeaderId: this.toInt(item.projectLegalLandHeaderId),
      addressLine: item.addressLine ?? null,
      street: item.street ?? null,
      locality: item.locality ?? null,
      stateId: this.toInt(item.stateId),
      stateName: item.stateName ?? null,
      districtId: this.toInt(item.districtId),
      districtName: item.districtName ?? null,
      talukaId: this.toInt(item.talukaId),
      talukaName: item.talukaName ?? null,
      villageId: this.toInt(item.villageId),
      villageName: item.villageName ?? null,
      pinCode: item.pinCode ?? null,
      boundariesEast: item.boundariesEast ?? null,
      boundariesWest: item.boundariesWest ?? null,
      boundariesNorth: item.boundariesNorth ?? null,
      boundariesSouth: item.boundariesSouth ?? null,
      totalAreaSqmts: this.toDecimal(item.totalAreaSqmts),
      proposedAreaSqmts: this.toDecimal(item.proposedAreaSqmts),
      legalLandDetails: item.legalLandDetails ?? null,
      isOriginal: this.toFlag(item.isOriginal)
    }));

    const promoterDetailsData = promoterDetailsPayload
      ? {
          userProfileId: this.toInt(promoterDetailsPayload.userProfileId),
          promoterName: promoterDetailsPayload.promoterName ?? null,
          contactPersonName: promoterDetailsPayload.contactPersonName ?? null,
          buildingName: promoterDetailsPayload.buildingName ?? null,
          pincode: this.toInt(promoterDetailsPayload.pincode),
          stateName: promoterDetailsPayload.stateName ?? null,
          districtName: promoterDetailsPayload.districtName ?? null,
          talukaName: promoterDetailsPayload.talukaName ?? null,
          mobileNo: promoterDetailsPayload.mobileNo ?? null,
          emailId: promoterDetailsPayload.emailId ?? null,
          fullName: promoterDetailsPayload.fullName ?? null
        }
      : null;

    const spocList = this.asArray(spocPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      userProfileId: this.toInt(item.userProfileId),
      promoterSpocDetailsId: this.toInt(item.promoterSpocDetailsId),
      firstName: item.firstName ?? null,
      middleName: item.middleName ?? null,
      lastName: item.lastName ?? null,
      designation: item.designation ?? null,
      companyEntityName: item.companyEntityName ?? null,
      panNumber: item.panNumber ?? null,
      photographDmsRefNo: item.photographDmsRefNo ?? null,
      photographDmsFileName: item.photographDmsFileName ?? null,
      mobileNumber: item.mobileNumber ?? null,
      alternateMobileNumber: item.alternateMobileNumber ?? null,
      emailId: item.emailId ?? null,
      unitNumber: item.unitNumber ?? null,
      buildingName: item.buildingName ?? null,
      streetName: item.streetName ?? null,
      locality: item.locality ?? null,
      landmark: item.landmark ?? null,
      pinCode: this.toInt(item.pinCode),
      countryId: this.toInt(item.countryId),
      stateId: this.toInt(item.stateId),
      districtId: this.toInt(item.districtId),
      talukaId: this.toInt(item.talukaId),
      villageId: this.toInt(item.villageId),
      spocType: item.spocType ?? null,
      stateName: item.stateName ?? null,
      districtName: item.districtName ?? null,
      talukaName: item.talukaName ?? null,
      villageName: item.villageName ?? null,
      proofDocDmsRefNo: item.proofDocDmsRefNo ?? null,
      proofDocFileName: item.proofDocFileName ?? null,
      officeLandlineNumber: item.officeLandlineNumber ?? null,
      isAuthorizedFormB: this.toFlag(item.isAuthorizedFormB)
    }));

    const professionalsList = this.asArray(professionalsPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      userProfileId: this.toInt(item.userProfileId),
      promoterProfessionalId: this.toInt(item.promoterProfessionalId),
      professionalTypeId: this.toInt(item.professionalTypeId),
      professionalPersonalTypeId: this.toInt(item.professionalPersonalTypeId),
      firstName: item.firstName ?? null,
      middleName: item.middleName ?? null,
      lastName: item.lastName ?? null,
      entityCompanyName: item.entityCompanyName ?? null,
      executiveOfficerFirstName: item.executiveOfficerFirstName ?? null,
      executiveOfficerMiddleName: item.executiveOfficerMiddleName ?? null,
      executiveOfficerLastName: item.executiveOfficerLastName ?? null,
      executiveOfficerDesignation: item.executiveOfficerDesignation ?? null,
      realEstateAgentReraRegNo: item.realEstateAgentReraRegNo ?? null,
      architectCoARegistrationNo: item.architectCoARegistrationNo ?? null,
      engineerLicenseNo: item.engineerLicenseNo ?? null,
      caIcaiMembershipNo: item.caIcaiMembershipNo ?? null,
      other: item.other ?? null,
      panCardNo: item.panCardNo ?? null,
      photographnDMSRefNo: item.photographnDMSRefNo ?? null,
      photographnDMSFileName: item.photographnDMSFileName ?? null,
      primaryContactNo: item.primaryContactNo ?? null,
      alternateContactNo: item.alternateContactNo ?? null,
      officeLandlineNo: item.officeLandlineNo ?? null,
      emailId: item.emailId ?? null,
      unitNumber: item.unitNumber ?? null,
      buildingName: item.buildingName ?? null,
      streetName: item.streetName ?? null,
      locality: item.locality ?? null,
      landmark: item.landmark ?? null,
      pincode: this.toInt(item.pincode),
      stateId: this.toInt(item.stateId),
      districtId: this.toInt(item.districtId),
      talukaId: this.toInt(item.talukaId),
      villageId: this.toInt(item.villageId),
      promoterProfessionalProjectMapId: this.toInt(item.promoterProfessionalProjectMapId),
      projectComplianceId: this.toInt(item.projectComplianceId),
      projectWithdrawalUpdateId: this.toInt(item.projectWithdrawalUpdateId),
      stateName: item.stateName ?? null,
      districtName: item.districtName ?? null,
      talukaName: item.talukaName ?? null,
      villageName: item.villageName ?? null,
      professionalTypeName: item.professionalTypeName ?? null,
      professionalPersonalTypeName: item.professionalPersonalTypeName ?? null,
      isMappedWithOtherProject: this.toFlag(item.isMappedWithOtherProject),
      profileName: item.profileName ?? null,
      checked: this.toBool(item.checked),
      barEnrollmentNumber: item.barEnrollmentNumber ?? null
    }));

    const ccDocsList = this.asArray(ccDocsPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      projectLandCCDetailsId: this.toInt(item.projectLandCCDetailsId),
      projectLandHeaderId: this.toInt(item.projectLandHeaderId),
      projectLandDetailsId: this.toInt(item.projectLandDetailsId),
      ccIssuedEntityMode: item.ccIssuedEntityMode ?? null,
      ccIssuedEntityName: item.ccIssuedEntityName ?? null,
      ccIssuedDate: this.toDate(item.ccIssuedDate),
      ccIssuedTo: item.ccIssuedTo ?? null,
      ccDocumentDmsRefNo: item.ccDocumentDmsRefNo ?? null,
      ccDocumentFileName: item.ccDocumentFileName ?? null,
      isCcYearOld: this.toBool(item.isCcYearOld),
      additionalCcDocumentTypeId: this.toInt(item.additionalCcDocumentTypeId),
      additionalCcDocumentDmsRefNo: item.additionalCcDocumentDmsRefNo ?? null,
      additionalCcDocumentFileName: item.additionalCcDocumentFileName ?? null,
      uploadDate: this.toDate(item.uploadDate),
      createdBy: item.createdBy ?? null,
      isActive: this.toBool(item.isActive)
    }));

    const migratedDocsList = this.asArray(migratedDocsPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      documentName: item.documentName ?? null,
      userDocumentDMSRefNo: item.userDocumentDMSRefNo ?? null,
      documentFileName: item.documentFileName ?? null,
      createdDate: this.toDate(item.createdDate)
    }));

    const buildingSummaryList = this.asArray(buildingSummaryPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      projectName: item.projectName ?? null,
      projectCurrentStatus: item.projectCurrentStatus ?? null,
      projectRegistartionNo: item.projectRegistartionNo ?? null,
      projectBuildingId: this.toInt(item.projectBuildingId),
      buildingNameNumber: item.buildingNameNumber ?? null,
      buildingWingsNameNumber: item.buildingWingsNameNumber ?? null,
      projectBuildingWingsId: this.toInt(item.projectBuildingWingsId),
      noOfBuildingWingFloorProposed: this.toInt(item.noOfBuildingWingFloorProposed),
      noOfBuildingWingFloorSanctioned: this.toInt(item.noOfBuildingWingFloorSanctioned),
      noOfBuildingWingFloorHabitable: this.toInt(item.noOfBuildingWingFloorHabitable),
      residentialUnitCount: this.toInt(item.residentialUnitCount),
      nonResidentialUnitCount: this.toInt(item.nonResidentialUnitCount),
      totalUnitCount: this.toInt(item.totalUnitCount),
      advertisedBuildingNameNumber: item.advertisedBuildingNameNumber ?? null,
      isCorrectionEntryFloors: this.toBool(item.isCorrectionEntryFloors),
      isCorrectionEntryBuilding: this.toBool(item.isCorrectionEntryBuilding),
      isCorrectionEntryWings: this.toBool(item.isCorrectionEntryWings),
      fsiWithSanctionSqmts: this.toDecimal(item.fsiWithSanctionSqmts),
      isActive: this.toFlag(item.isActive)
    }));

    const buildingActivitiesList = this.asArray(buildingActivitiesPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      projectBuildingId: this.toInt(item.projectBuildingId),
      projectBuildingWingsId: this.toInt(item.projectBuildingWingsId),
      buildingNameNumber: item.buildingNameNumber ?? null,
      buildingWingsNameNumber: item.buildingWingsNameNumber ?? null,
      noOfWings: this.toInt(item.noOfWings),
      projectNAPlotHeaderId: this.toInt(item.projectNAPlotHeaderId),
      buildingPlotMode: item.buildingPlotMode ?? null,
      projectBuildingWingsActiviesDetailsId: this.toInt(item.projectBuildingWingsActiviesDetailsId),
      activityParticularId: this.toInt(item.activityParticularId),
      isAvailable: item.isAvailable ?? null,
      startDate: this.toDate(item.startDate),
      completionDate: this.toDate(item.completionDate),
      completionPercentage: this.toDecimal(item.completionPercentage),
      remarks: item.remarks ?? null,
      projectActivityParticularTypeName: item.projectActivityParticularTypeName ?? null,
      isProposed: this.toFlag(item.isProposed),
      isProposedText: item.isProposedText ?? null,
      details: item.details ?? null,
      complianceId: this.toInt(item.complianceId),
      withdrawalId: this.toInt(item.withdrawalId),
      activityParticularOtherName: item.activityParticularOtherName ?? null
    }));

    const costEstimationList = this.asArray(costEstimationPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      correctionId: this.toInt(item.correctionId),
      promoterProfessionalId: this.toInt(item.promoterProfessionalId),
      engineerName: item.engineerName ?? null,
      engineerLicenseNo: item.engineerLicenseNo ?? null,
      quantitySurveyor: item.quantitySurveyor ?? null,
      projectBuildingId: this.toInt(item.projectBuildingId),
      projectBuildingWingsId: this.toInt(item.projectBuildingWingsId),
      buildingNameNumber: item.buildingNameNumber ?? null,
      buildingWingsNameNumber: item.buildingWingsNameNumber ?? null,
      noOfWings: this.toInt(item.noOfWings),
      projectBuildingWingsCostEstimationId: this.toInt(item.projectBuildingWingsCostEstimationId),
      totalEstimatedCostAsOnRegDate: this.toDecimal(item.totalEstimatedCostAsOnRegDate),
      costIncurredAsOnCertificateDate: this.toDecimal(item.costIncurredAsOnCertificateDate),
      workDonePercentageAsPerCostEstimated: this.toDecimal(item.workDonePercentageAsPerCostEstimated),
      balanceCostToBeIncurred: this.toDecimal(item.balanceCostToBeIncurred),
      additionalCostIncurredExcludedCostEstimated: this.toDecimal(item.additionalCostIncurredExcludedCostEstimated),
      projectNAPlotHeaderId: this.toInt(item.projectNAPlotHeaderId),
      buildingPlotMode: item.buildingPlotMode ?? null
    }));

    const uploadedDocsList = this.asArray(uploadedDocsPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      projectDocumentUploadDetailsId: this.toInt(item.projectDocumentUploadDetailsId),
      projectBuildingId: this.toInt(item.projectBuildingId),
      documentTypeId: this.toInt(item.documentTypeId),
      documentDetails: item.documentDetails ?? null,
      documentDescription: item.documentDescription ?? null,
      approvalNo: item.approvalNo ?? null,
      approvalDate: this.toDate(item.approvalDate),
      issueDate: this.toDate(item.issueDate),
      certificateNo: item.certificateNo ?? null,
      orderNo: item.orderNo ?? null,
      projectProfessionalId: this.toInt(item.projectProfessionalId),
      udinNumber: item.udinNumber ?? null,
      planningCompetentAuthority: item.planningCompetentAuthority ?? null,
      affidavitDeclarationDate: this.toDate(item.affidavitDeclarationDate),
      authorizedSignatoryName: item.authorizedSignatoryName ?? null,
      certificateDate: this.toDate(item.certificateDate),
      issuingAuthority: item.issuingAuthority ?? null,
      documentDmsRefNo: item.documentDmsRefNo ?? null,
      documentFileName: item.documentFileName ?? null,
      currentUpdateMode: this.toInt(item.currentUpdateMode),
      isActive: this.toFlag(item.isActive),
      uploadDate: this.toDate(item.uploadDate),
      remarks: item.remarks ?? null
    }));

    return await prisma.$transaction(async (tx) => {
      const project = await tx.reraProject.upsert({
        where: { reraNumber: reraNo },
        update: {
          projectId,
          rawResponses: aggregatedResponse,
          projectName: generalData?.projectName || null
        },
        create: {
          reraNumber: reraNo,
          projectId,
          rawResponses: aggregatedResponse,
          projectName: generalData?.projectName || null
        }
      });

      if (generalData) {
        await tx.reraProject_General.deleteMany({ where: { projectId } });
        await tx.reraProject_General.create({ data: generalData });
      }

      if (statusData) {
        await tx.reraProject_Status.deleteMany({ where: { projectId } });
        await tx.reraProject_Status.create({ data: statusData });
      }

      if (landHeaderData) {
        await tx.reraProject_Land_Header.deleteMany({ where: { projectId } });
        await tx.reraProject_Land_Header.create({ data: landHeaderData });
      }

      if (landAddressList.length) {
        await tx.reraProject_Land_Address.deleteMany({ where: { projectId } });
        await tx.reraProject_Land_Address.createMany({ data: landAddressList });
      }

      if (promoterDetailsData) {
        if (promoterDetailsData.userProfileId) {
          await tx.reraPromoter_Details.deleteMany({ where: { userProfileId: promoterDetailsData.userProfileId } });
        }
        await tx.reraPromoter_Details.create({ data: promoterDetailsData });
      }

      if (spocList.length) {
        await tx.reraPromoter_SPOC.deleteMany({ where: { projectId } });
        await tx.reraPromoter_SPOC.createMany({ data: spocList });
      }

      if (professionalsList.length) {
        await tx.reraProject_Professionals.deleteMany({ where: { projectId } });
        await tx.reraProject_Professionals.createMany({ data: professionalsList });
      }

      if (ccDocsList.length) {
        await tx.reraCC_Documents.deleteMany({ where: { projectId } });
        await tx.reraCC_Documents.createMany({ data: ccDocsList });
      }

      if (migratedDocsList.length) {
        await tx.reraMigrated_Documents.deleteMany({ where: { projectId } });
        await tx.reraMigrated_Documents.createMany({ data: migratedDocsList });
      }

      if (buildingSummaryList.length) {
        await tx.reraBuilding_Wing_Summary.deleteMany({ where: { projectId } });
        await tx.reraBuilding_Wing_Summary.createMany({ data: buildingSummaryList });
      }

      if (buildingActivitiesList.length) {
        await tx.reraBuilding_Activities.deleteMany({ where: { projectId } });
        await tx.reraBuilding_Activities.createMany({ data: buildingActivitiesList });
      }

      if (costEstimationList.length) {
        await tx.reraCost_Estimation.deleteMany({ where: { projectId } });
        await tx.reraCost_Estimation.createMany({ data: costEstimationList });
      }

      if (uploadedDocsList.length) {
        await tx.reraUploaded_Documents.deleteMany({ where: { projectId } });
        await tx.reraUploaded_Documents.createMany({ data: uploadedDocsList });
      }

      return project;
    });
  }
}
