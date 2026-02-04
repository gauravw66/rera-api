-- CreateTable
CREATE TABLE "rera_projects" (
    "id" SERIAL NOT NULL,
    "reraNumber" TEXT NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectName" TEXT,
    "rawResponses" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_project_general" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectIdTypeId" INTEGER,
    "projectStatusId" INTEGER,
    "projectName" TEXT,
    "projectStartDate" TIMESTAMP(3),
    "projectProposeComplitionDate" TIMESTAMP(3),
    "projectDescription" TEXT,
    "userProfileId" INTEGER,
    "projectRegistartionNo" TEXT,
    "reraRegistrationDate" TIMESTAMP(3),
    "projectLocationId" INTEGER,
    "projectTypeName" TEXT,
    "projectStatusName" TEXT,
    "projectCurrentStatus" TEXT,
    "projectLocationName" TEXT,
    "registrationCertificateDmsRefNo" UUID,
    "registrationCertificateFileName" TEXT,
    "originalProjectProposeCompletionDate" TIMESTAMP(3),
    "registrationCertificateGenerationDate" TIMESTAMP(3),
    "acknowledgementNumber" TEXT,
    "promoterName" TEXT,
    "isProjectAffiliatedPublicAuthority" BOOLEAN,
    "projectAffiliatedPublicAuthorityName" TEXT,
    "noOfConsent" INTEGER,
    "consentProofDmsRefNo" UUID,
    "consentProofFileName" TEXT,
    "userName" TEXT,
    "currentSaleCount" INTEGER,
    "currentConsentPercentage" DECIMAL(65,30),
    "projectApplicationType" TEXT,
    "projectApplicationDate" TIMESTAMP(3),
    "isRegistrationApproved" INTEGER,
    "isBuilding" INTEGER,
    "isNaWithStructure" INTEGER,
    "isNaWithoutStructure" INTEGER,
    "totalNumberOfSoldUnits" INTEGER,
    "totalNumberOfUnits" INTEGER,
    "isEligibleGeneralUpdate" INTEGER,
    "isMigrated" INTEGER,
    "projectFeesPayableAmount" DECIMAL(65,30),
    "realEstateAgentRERARegNo" TEXT,
    "extensionCertificateDmsRefNo" UUID,
    "extensionCertificateFileName" TEXT,
    "moduleName" TEXT,
    "projectCalculatedGrossFeesApplicable" DECIMAL(65,30),
    "receiptDmsRefNo" UUID,
    "receiptFileName" TEXT,
    "projectFormSummaryId" INTEGER,
    "isPromoter" BOOLEAN,
    "form4ReferenceNo" TEXT,
    "form4CurrentStatus" TEXT,
    "extensionId" INTEGER,
    "correctionId" INTEGER,
    "isEligibleForUpdateMigratedProject" INTEGER,
    "isFormFullyFilled" INTEGER,
    "projectPenaltyDetails" JSONB,
    "userProfileTypeId" INTEGER,
    "isProjectLapsed" INTEGER,
    "rerasubmissionNumber" TEXT,
    "createdBy" TEXT,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_project_general_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_project_status" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "statusId" INTEGER,
    "statusName" TEXT,
    "isDeregistered" INTEGER,
    "isAbeyance" INTEGER,
    "isLandLessThen500" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_project_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_project_land_header" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectLandHeaderId" INTEGER,
    "ulbTypeId" TEXT,
    "ulbOtherTypeName" TEXT,
    "ulbTypeName" TEXT,
    "isPromoter" INTEGER,
    "isPromoterLandowner" INTEGER,
    "isOtherLandowner" INTEGER,
    "landAreaSqmts" DECIMAL(65,30),
    "proposedLandAreaSqmts" DECIMAL(65,30),
    "finalPlotBearingNumber" TEXT,
    "aggregateArea" DECIMAL(65,30),
    "projectProposedNotSanctionedBuildUpArea" DECIMAL(65,30),
    "totalPermissiblePlotFsi" DECIMAL(65,30),
    "isOriginal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_project_land_header_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_project_land_address" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectLandAddressId" INTEGER,
    "projectLandHeaderId" INTEGER,
    "projectLegalLandHeaderId" INTEGER,
    "addressLine" TEXT,
    "street" TEXT,
    "locality" TEXT,
    "stateId" INTEGER,
    "stateName" TEXT,
    "districtId" INTEGER,
    "districtName" TEXT,
    "talukaId" INTEGER,
    "talukaName" TEXT,
    "villageId" INTEGER,
    "villageName" TEXT,
    "pinCode" TEXT,
    "boundariesEast" TEXT,
    "boundariesWest" TEXT,
    "boundariesNorth" TEXT,
    "boundariesSouth" TEXT,
    "totalAreaSqmts" DECIMAL(65,30),
    "proposedAreaSqmts" DECIMAL(65,30),
    "legalLandDetails" JSONB,
    "isOriginal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_project_land_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_promoter_details" (
    "id" SERIAL NOT NULL,
    "userProfileId" INTEGER,
    "promoterName" TEXT,
    "contactPersonName" TEXT,
    "buildingName" TEXT,
    "pincode" INTEGER,
    "stateName" TEXT,
    "districtName" TEXT,
    "talukaName" TEXT,
    "mobileNo" TEXT,
    "emailId" TEXT,
    "fullName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_promoter_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_promoter_spoc" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userProfileId" INTEGER,
    "promoterSpocDetailsId" INTEGER,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "designation" TEXT,
    "companyEntityName" TEXT,
    "panNumber" TEXT,
    "photographDmsRefNo" TEXT,
    "photographDmsFileName" TEXT,
    "mobileNumber" TEXT,
    "alternateMobileNumber" TEXT,
    "emailId" TEXT,
    "unitNumber" TEXT,
    "buildingName" TEXT,
    "streetName" TEXT,
    "locality" TEXT,
    "landmark" TEXT,
    "pinCode" INTEGER,
    "countryId" INTEGER,
    "stateId" INTEGER,
    "districtId" INTEGER,
    "talukaId" INTEGER,
    "villageId" INTEGER,
    "spocType" TEXT,
    "stateName" TEXT,
    "districtName" TEXT,
    "talukaName" TEXT,
    "villageName" TEXT,
    "proofDocDmsRefNo" TEXT,
    "proofDocFileName" TEXT,
    "officeLandlineNumber" TEXT,
    "isAuthorizedFormB" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_promoter_spoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_project_professionals" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "userProfileId" INTEGER,
    "promoterProfessionalId" INTEGER,
    "professionalTypeId" INTEGER,
    "professionalPersonalTypeId" INTEGER,
    "firstName" TEXT,
    "middleName" TEXT,
    "lastName" TEXT,
    "entityCompanyName" TEXT,
    "executiveOfficerFirstName" TEXT,
    "executiveOfficerMiddleName" TEXT,
    "executiveOfficerLastName" TEXT,
    "executiveOfficerDesignation" TEXT,
    "realEstateAgentReraRegNo" TEXT,
    "architectCoARegistrationNo" TEXT,
    "engineerLicenseNo" TEXT,
    "caIcaiMembershipNo" TEXT,
    "other" TEXT,
    "panCardNo" TEXT,
    "photographnDMSRefNo" TEXT,
    "photographnDMSFileName" TEXT,
    "primaryContactNo" TEXT,
    "alternateContactNo" TEXT,
    "officeLandlineNo" TEXT,
    "emailId" TEXT,
    "unitNumber" TEXT,
    "buildingName" TEXT,
    "streetName" TEXT,
    "locality" TEXT,
    "landmark" TEXT,
    "pincode" INTEGER,
    "stateId" INTEGER,
    "districtId" INTEGER,
    "talukaId" INTEGER,
    "villageId" INTEGER,
    "promoterProfessionalProjectMapId" INTEGER,
    "projectComplianceId" INTEGER,
    "projectWithdrawalUpdateId" INTEGER,
    "stateName" TEXT,
    "districtName" TEXT,
    "talukaName" TEXT,
    "villageName" TEXT,
    "professionalTypeName" TEXT,
    "professionalPersonalTypeName" TEXT,
    "isMappedWithOtherProject" INTEGER,
    "profileName" TEXT,
    "checked" BOOLEAN,
    "barEnrollmentNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_project_professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_cc_documents" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectLandCCDetailsId" INTEGER,
    "projectLandHeaderId" INTEGER,
    "projectLandDetailsId" INTEGER,
    "ccIssuedEntityMode" TEXT,
    "ccIssuedEntityName" TEXT,
    "ccIssuedDate" TIMESTAMP(3),
    "ccIssuedTo" TEXT,
    "ccDocumentDmsRefNo" UUID,
    "ccDocumentFileName" TEXT,
    "isCcYearOld" BOOLEAN,
    "additionalCcDocumentTypeId" INTEGER,
    "additionalCcDocumentDmsRefNo" UUID,
    "additionalCcDocumentFileName" TEXT,
    "uploadDate" TIMESTAMP(3),
    "createdBy" TEXT,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_cc_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_migrated_documents" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "documentName" TEXT,
    "userDocumentDMSRefNo" UUID,
    "documentFileName" TEXT,
    "createdDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_migrated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_building_wing_summary" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectName" TEXT,
    "projectCurrentStatus" TEXT,
    "projectRegistartionNo" TEXT,
    "projectBuildingId" INTEGER,
    "buildingNameNumber" TEXT,
    "buildingWingsNameNumber" TEXT,
    "projectBuildingWingsId" INTEGER,
    "noOfBuildingWingFloorProposed" INTEGER,
    "noOfBuildingWingFloorSanctioned" INTEGER,
    "noOfBuildingWingFloorHabitable" INTEGER,
    "residentialUnitCount" INTEGER,
    "nonResidentialUnitCount" INTEGER,
    "totalUnitCount" INTEGER,
    "advertisedBuildingNameNumber" TEXT,
    "isCorrectionEntryFloors" BOOLEAN,
    "isCorrectionEntryBuilding" BOOLEAN,
    "isCorrectionEntryWings" BOOLEAN,
    "fsiWithSanctionSqmts" DECIMAL(65,30),
    "isActive" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_building_wing_summary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_building_activities" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectBuildingId" INTEGER,
    "projectBuildingWingsId" INTEGER,
    "buildingNameNumber" TEXT,
    "buildingWingsNameNumber" TEXT,
    "noOfWings" INTEGER,
    "projectNAPlotHeaderId" INTEGER,
    "buildingPlotMode" TEXT,
    "projectBuildingWingsActiviesDetailsId" INTEGER,
    "activityParticularId" INTEGER,
    "isAvailable" TEXT,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "completionPercentage" DECIMAL(65,30),
    "remarks" TEXT,
    "projectActivityParticularTypeName" TEXT,
    "isProposed" INTEGER,
    "isProposedText" BOOLEAN,
    "details" TEXT,
    "complianceId" INTEGER,
    "withdrawalId" INTEGER,
    "activityParticularOtherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_building_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_common_facilities" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectBuildingWingsActiviesDetailsId" INTEGER,
    "activityParticularId" INTEGER,
    "isAvailable" TEXT,
    "startDate" TIMESTAMP(3),
    "completionDate" TIMESTAMP(3),
    "completionPercentage" DECIMAL(65,30),
    "remarks" TEXT,
    "projectActivityParticularTypeName" TEXT,
    "isProposed" INTEGER,
    "isProposedText" BOOLEAN,
    "details" TEXT,
    "complianceId" INTEGER,
    "withdrawalId" INTEGER,
    "activityParticularOtherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_common_facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_cost_estimation" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "correctionId" INTEGER,
    "promoterProfessionalId" INTEGER,
    "engineerName" TEXT,
    "engineerLicenseNo" TEXT,
    "quantitySurveyor" TEXT,
    "projectBuildingId" INTEGER,
    "projectBuildingWingsId" INTEGER,
    "buildingNameNumber" TEXT,
    "buildingWingsNameNumber" TEXT,
    "noOfWings" INTEGER,
    "projectBuildingWingsCostEstimationId" INTEGER,
    "totalEstimatedCostAsOnRegDate" DECIMAL(65,30),
    "costIncurredAsOnCertificateDate" DECIMAL(65,30),
    "workDonePercentageAsPerCostEstimated" DECIMAL(65,30),
    "balanceCostToBeIncurred" DECIMAL(65,30),
    "additionalCostIncurredExcludedCostEstimated" DECIMAL(65,30),
    "projectNAPlotHeaderId" INTEGER,
    "buildingPlotMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_cost_estimation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_uploaded_documents" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "projectDocumentUploadDetailsId" INTEGER,
    "projectBuildingId" INTEGER,
    "documentTypeId" INTEGER,
    "documentDetails" TEXT,
    "documentDescription" TEXT,
    "approvalNo" TEXT,
    "approvalDate" TIMESTAMP(3),
    "issueDate" TIMESTAMP(3),
    "certificateNo" TEXT,
    "orderNo" TEXT,
    "projectProfessionalId" INTEGER,
    "udinNumber" TEXT,
    "planningCompetentAuthority" TEXT,
    "affidavitDeclarationDate" TIMESTAMP(3),
    "authorizedSignatoryName" TEXT,
    "certificateDate" TIMESTAMP(3),
    "issuingAuthority" TEXT,
    "documentDmsRefNo" UUID,
    "documentFileName" TEXT,
    "currentUpdateMode" INTEGER,
    "isActive" INTEGER,
    "uploadDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_uploaded_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_document_types_master" (
    "id" SERIAL NOT NULL,
    "documentTypeId" INTEGER,
    "documentSectionTypeId" INTEGER,
    "documentSectionName" TEXT,
    "documentTypeName" TEXT,
    "documentTypeDescription" TEXT,
    "isApprovalNo" INTEGER,
    "isIssueDate" INTEGER,
    "isCertificateDate" INTEGER,
    "isIssuingAuthority" BOOLEAN,
    "isActive" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_document_types_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_promoter_past_projects" (
    "id" SERIAL NOT NULL,
    "userProfileId" INTEGER,
    "userProfilePastExperienceId" INTEGER,
    "projectTypeId" INTEGER,
    "isAnyPastExperience" INTEGER,
    "isProjectsRegisteredWithMahaRERA" INTEGER,
    "mahaRERARegistrationNumber" TEXT,
    "projectName" TEXT,
    "address" TEXT,
    "landArea" DECIMAL(65,30),
    "numberOfBuildingsPlots" INTEGER,
    "numberOfApartments" INTEGER,
    "totalCost" DECIMAL(65,30),
    "originalProposedCompletionDate" TIMESTAMP(3),
    "actualCompletionDate" TIMESTAMP(3),
    "roleName" TEXT,
    "projectStatusId" TEXT,
    "createdBy" TEXT,
    "projectTypeName" TEXT,
    "projectId" INTEGER NOT NULL,
    "isProjectHasLitigation" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_promoter_past_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_past_project_construction" (
    "id" SERIAL NOT NULL,
    "userProfilePastExperienceId" INTEGER,
    "userProfilePastExProjectConstructionDetailsId" INTEGER,
    "projectConstructionIdentifierTypeId" INTEGER,
    "projectConstructionIdentifierNumber" TEXT,
    "projectConstructionIdentifierTypeName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_past_project_construction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_form_clause_master" (
    "id" SERIAL NOT NULL,
    "projectFormClauseId" INTEGER,
    "projectFormClauseName" TEXT,
    "projectFormClauseDescription" TEXT,
    "projectFormSubClauseName" TEXT,
    "projectFormClauseOrder" INTEGER,
    "isEditable" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_form_clause_master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_activity_types_reference" (
    "id" SERIAL NOT NULL,
    "activityParticularId" INTEGER,
    "Activity Name" TEXT,
    "Category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_activity_types_reference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rera_api_endpoints_reference" (
    "id" SERIAL NOT NULL,
    "API Endpoint" TEXT,
    "Related Sheet(s)" TEXT,
    "Description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rera_api_endpoints_reference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rera_projects_reraNumber_key" ON "rera_projects"("reraNumber");

-- CreateIndex
CREATE UNIQUE INDEX "rera_projects_projectId_key" ON "rera_projects"("projectId");

-- CreateIndex
CREATE INDEX "rera_project_general_projectId_idx" ON "rera_project_general"("projectId");

-- CreateIndex
CREATE INDEX "rera_project_status_projectId_idx" ON "rera_project_status"("projectId");

-- CreateIndex
CREATE INDEX "rera_project_land_header_projectId_idx" ON "rera_project_land_header"("projectId");

-- CreateIndex
CREATE INDEX "rera_project_land_address_projectId_idx" ON "rera_project_land_address"("projectId");

-- CreateIndex
CREATE INDEX "rera_promoter_spoc_projectId_idx" ON "rera_promoter_spoc"("projectId");

-- CreateIndex
CREATE INDEX "rera_project_professionals_projectId_idx" ON "rera_project_professionals"("projectId");

-- CreateIndex
CREATE INDEX "rera_cc_documents_projectId_idx" ON "rera_cc_documents"("projectId");

-- CreateIndex
CREATE INDEX "rera_migrated_documents_projectId_idx" ON "rera_migrated_documents"("projectId");

-- CreateIndex
CREATE INDEX "rera_building_wing_summary_projectId_idx" ON "rera_building_wing_summary"("projectId");

-- CreateIndex
CREATE INDEX "rera_building_activities_projectId_idx" ON "rera_building_activities"("projectId");

-- CreateIndex
CREATE INDEX "rera_common_facilities_projectId_idx" ON "rera_common_facilities"("projectId");

-- CreateIndex
CREATE INDEX "rera_cost_estimation_projectId_idx" ON "rera_cost_estimation"("projectId");

-- CreateIndex
CREATE INDEX "rera_uploaded_documents_projectId_idx" ON "rera_uploaded_documents"("projectId");

-- CreateIndex
CREATE INDEX "rera_promoter_past_projects_projectId_idx" ON "rera_promoter_past_projects"("projectId");
