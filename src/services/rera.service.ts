import { SessionManager } from '../utils/session.manager';
import prisma from '../prisma/client';
import { Prisma } from '@prisma/client';
import { TokenRefreshService } from '../utils/token.refresh.service';
import { config } from '../configs/env.config';
import axios from 'axios';
import https from 'https';

export class ReraService {
  private static BASE_URL = config.mahaReraBaseUrl;
  private static SITE_BASE_URL = 'https://maharera.maharashtra.gov.in';
  private static SITE_HTTP_AGENT = new https.Agent({ keepAlive: true });

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

  private static normalizeUuid(value: any): string | null {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value).trim();
    const match = text.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
    return match ? match[0] : null;
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

  static async listProjectsByPincode(pincode: string, options?: { includeRevoked?: boolean }) {
    const normalized = String(pincode ?? '').trim();
    if (!normalized) {
      throw new Error('pincode is required');
    }

    const landRows = await prisma.reraProject_Land_Address.findMany({
      where: { pinCode: normalized },
      select: { projectId: true },
      distinct: ['projectId']
    });

    const projectIds = landRows
      .map(row => row.projectId)
      .filter((value): value is number => typeof value === 'number');

    if (projectIds.length === 0) {
      return [] as Array<{ projectId: number; reraNumber: string | null }>;
    }

    let filteredProjectIds = projectIds;
    if (!options?.includeRevoked) {
      const statusRows = await prisma.reraProject_Status.findMany({
        where: { projectId: { in: projectIds } },
        select: { projectId: true, isDeregistered: true, statusName: true }
      });

      const revokedIds = new Set(
        statusRows
          .filter(row => row.isDeregistered === 1 || row.statusName?.toLowerCase().includes('revoked'))
          .map(row => row.projectId)
      );

      filteredProjectIds = projectIds.filter(projectId => !revokedIds.has(projectId));
    }

    if (filteredProjectIds.length === 0) {
      return [] as Array<{ projectId: number; reraNumber: string | null }>;
    }

    const [projects, generalRows] = await Promise.all([
      prisma.reraProject.findMany({
        where: { projectId: { in: filteredProjectIds } },
        select: { projectId: true, reraNumber: true }
      }),
      prisma.reraProject_General.findMany({
        where: { projectId: { in: filteredProjectIds } },
        select: { projectId: true, projectRegistartionNo: true }
      })
    ]);

    const reraByProjectId = new Map<number, string>();
    for (const row of generalRows) {
      if (row.projectRegistartionNo) {
        reraByProjectId.set(row.projectId, row.projectRegistartionNo);
      }
    }
    for (const row of projects) {
      if (row.reraNumber) {
        reraByProjectId.set(row.projectId, row.reraNumber);
      }
    }

    return filteredProjectIds.map(projectId => ({
      projectId,
      reraNumber: reraByProjectId.get(projectId) ?? null
    }));
  }

  private static buildMahaReraSearchUrl(pincode: string, page: number, projectType: number) {
    const params = new URLSearchParams({
      project_type: String(projectType),
      project_name: '',
      project_location: pincode,
      project_completion_date: '',
      project_state: '27',
      project_district: '0',
      carpetAreas: '',
      completionPercentages: '',
      project_division: '',
      page: String(page),
      op: 'Search'
    });

    return `${this.SITE_BASE_URL}/projects-search-result?${params.toString()}`;
  }

  private static extractMaxPage(html: string): number {
    let maxPage = 1;
    const optionRegex = /<option value="(\d+)"/g;
    let match = optionRegex.exec(html);
    while (match) {
      const pageValue = this.toInt(match[1]);
      if (pageValue && pageValue > maxPage) {
        maxPage = pageValue;
      }
      match = optionRegex.exec(html);
    }

    if (maxPage > 1) {
      return maxPage;
    }

    const currentDataMatch = html.match(/data-current-data="(\d+)"/);
    const fallback = this.toInt(currentDataMatch?.[1]);
    return fallback && fallback > 0 ? fallback : 1;
  }

  private static extractProjectsFromHtml(html: string) {
    const results: Array<{ projectId: number; reraNumber: string }> = [];
    const cardRegex = /<div class="row shadow[\s\S]*?<p class="p-0">#\s*([^<]+)<\/p>[\s\S]*?\/public\/project\/view\/(\d+)/g;
    let match = cardRegex.exec(html);
    while (match) {
      const reraNumber = match[1]?.trim();
      const projectId = this.toInt(match[2]);
      if (reraNumber && projectId) {
        results.push({ projectId, reraNumber });
      }
      match = cardRegex.exec(html);
    }
    return results;
  }

  private static async delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private static async fetchMahaReraSearchPage(pincode: string, page: number, projectType: number) {
    const url = this.buildMahaReraSearchUrl(pincode, page, projectType);
    const headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': `${this.SITE_BASE_URL}/projects-search-result`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    };

    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await axios.get(url, {
          headers,
          responseType: 'text',
          timeout: 15000,
          httpsAgent: this.SITE_HTTP_AGENT,
          maxRedirects: 5
        });

        const html = typeof response.data === 'string' ? response.data : String(response.data ?? '');
        return {
          html,
          projects: this.extractProjectsFromHtml(html),
          maxPages: this.extractMaxPage(html)
        };
      } catch (error: any) {
        lastError = error;
        const code = error?.code;
        const isRetryable = code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ECONNABORTED';
        if (!isRetryable || attempt === maxAttempts) {
          throw error;
        }
        await this.delay(500 * attempt);
      }
    }

    throw lastError;
  }

  static async listProjectsByPincodeLive(
    pincode: string,
    options?: { includeRevoked?: boolean; maxPages?: number }
  ) {
    const normalized = String(pincode ?? '').trim();
    if (!normalized) {
      throw new Error('pincode is required');
    }

    const projectTypes = options?.includeRevoked ? [0, 1] : [0];
    const deduped = new Map<number, { projectId: number; reraNumber: string }>();

    for (const projectType of projectTypes) {
      const firstPage = await this.fetchMahaReraSearchPage(normalized, 1, projectType);
      for (const item of firstPage.projects) {
        deduped.set(item.projectId, item);
      }

      const maxPage = options?.maxPages
        ? Math.min(options.maxPages, firstPage.maxPages)
        : firstPage.maxPages;

      for (let page = 2; page <= maxPage; page += 1) {
        const pageData = await this.fetchMahaReraSearchPage(normalized, page, projectType);
        for (const item of pageData.projects) {
          deduped.set(item.projectId, item);
        }
      }
    }

    return Array.from(deduped.values());
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

  static async fetchProjectDetails(projectId: string, captchaText: string | null, reraNo?: string) {
    const projectIdInt = this.toInt(projectId);

    if (projectIdInt) {
      const cachedProject = await prisma.reraProject.findUnique({
        where: { projectId: projectIdInt },
        select: { apiResponseJson: true, rawResponses: true }
      });

      const cachedResponse = cachedProject?.apiResponseJson ?? cachedProject?.rawResponses;
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const client = await SessionManager.getClient();

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
    await this.saveStructuredProjectData(aggregatedResponse, projectIdInt, reraNo);
    return aggregatedResponse;
  }

  private static async saveStructuredProjectData(aggregatedResponse: any, projectId: number | undefined, reraNo?: string) {
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
          registrationCertificateDMSRefNo: this.normalizeUuid(
            generalPayload.registrationCertificateDmsRefNo ?? generalPayload.registrationCertificateDMSRefNo
          ),
          registrationCertificateFileName: generalPayload.registrationCertificateFileName ?? null,
          originalProjectProposeCompletionDate: this.toDate(generalPayload.originalProjectProposeCompletionDate),
          registrationCertificateGenerationDate: this.toDate(generalPayload.registrationCertificateGenerationDate),
          acknowledgementNumber: generalPayload.acknowledgementNumber ?? null,
          promoterName: generalPayload.promoterName ?? null,
          isProjectAffiliatedPublicAuthority: this.toBool(generalPayload.isProjectAffiliatedPublicAuthority),
          projectAffiliatedPublicAuthorityName: generalPayload.projectAffiliatedPublicAuthorityName ?? null,
          noOfConsent: this.toInt(generalPayload.noOfConsent),
          consentProofDMSRefNo: this.normalizeUuid(
            generalPayload.consentProofDmsRefNo ?? generalPayload.consentProofDMSRefNo
          ),
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
          extensionCertificateDMSRefNo: this.normalizeUuid(
            generalPayload.extensionCertificateDmsRefNo ?? generalPayload.extensionCertificateDMSRefNo
          ),
          extensionCertificateFileName: generalPayload.extensionCertificateFileName ?? null,
          moduleName: generalPayload.moduleName ?? null,
          projectCalculatedGrossFeesApplicable: this.toDecimal(generalPayload.projectCalculatedGrossFeesApplicable),
          receiptDMSRefNo: this.normalizeUuid(
            generalPayload.receiptDmsRefNo ?? generalPayload.receiptDMSRefNo
          ),
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

    const resolvedReraNo = (reraNo && reraNo.trim()) || generalData?.projectRegistartionNo || null;

    if (!resolvedReraNo) {
      throw new Error('Unable to determine reraNo. Provide reraNo or ensure projectRegistartionNo is available.');
    }

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
      photographDMSRefNo: this.normalizeUuid(item.photographDmsRefNo ?? item.photographDMSRefNo),
      photographDMSFileName: item.photographDmsFileName ?? item.photographDMSFileName ?? null,
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
      proofDocDMSRefNo: this.normalizeUuid(item.proofDocDmsRefNo ?? item.proofDocDMSRefNo),
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
      photographnDMSRefNo: this.normalizeUuid(item.photographnDMSRefNo),
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
      ccDocumentDMSRefNo: this.normalizeUuid(item.ccDocumentDmsRefNo ?? item.ccDocumentDMSRefNo),
      ccDocumentFileName: item.ccDocumentFileName ?? null,
      isCcYearOld: this.toBool(item.isCcYearOld),
      additionalCcDocumentTypeId: this.toInt(item.additionalCcDocumentTypeId),
      additionalCcDocumentDMSRefNo: this.normalizeUuid(
        item.additionalCcDocumentDmsRefNo ?? item.additionalCcDocumentDMSRefNo
      ),
      additionalCcDocumentFileName: item.additionalCcDocumentFileName ?? null,
      uploadDate: this.toDate(item.uploadDate),
      createdBy: item.createdBy ?? null,
      isActive: this.toBool(item.isActive)
    }));

    const migratedDocsList = this.asArray(migratedDocsPayload).map((item) => ({
      projectId: this.toInt(item.projectId) ?? projectId,
      documentName: item.documentName ?? null,
      userDocumentDMSRefNo: this.normalizeUuid(item.userDocumentDMSRefNo),
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
      documentDMSRefNo: this.normalizeUuid(item.documentDmsRefNo ?? item.documentDMSRefNo),
      documentFileName: item.documentFileName ?? null,
      currentUpdateMode: this.toInt(item.currentUpdateMode),
      isActive: this.toFlag(item.isActive),
      uploadDate: this.toDate(item.uploadDate),
      remarks: item.remarks ?? null
    }));

    return await prisma.$transaction(async (tx) => {
      const project = await tx.reraProject.upsert({
        where: { reraNumber: resolvedReraNo },
        update: {
          projectId,
          rawResponses: aggregatedResponse,
          apiResponseJson: aggregatedResponse,
          projectName: generalData?.projectName || null
        },
        create: {
          reraNumber: resolvedReraNo,
          projectId,
          rawResponses: aggregatedResponse,
          apiResponseJson: aggregatedResponse,
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
    }, { maxWait: 30000, timeout: 120000 });
  }
}
