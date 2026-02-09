-- Rename Dms columns to DMS for consistency with API field naming
ALTER TABLE "rera_project_general"
  RENAME COLUMN "registrationCertificateDmsRefNo" TO "registrationCertificateDMSRefNo";

ALTER TABLE "rera_project_general"
  RENAME COLUMN "consentProofDmsRefNo" TO "consentProofDMSRefNo";

ALTER TABLE "rera_project_general"
  RENAME COLUMN "extensionCertificateDmsRefNo" TO "extensionCertificateDMSRefNo";

ALTER TABLE "rera_project_general"
  RENAME COLUMN "receiptDmsRefNo" TO "receiptDMSRefNo";

ALTER TABLE "rera_promoter_spoc"
  RENAME COLUMN "photographDmsRefNo" TO "photographDMSRefNo";

ALTER TABLE "rera_promoter_spoc"
  RENAME COLUMN "photographDmsFileName" TO "photographDMSFileName";

ALTER TABLE "rera_promoter_spoc"
  RENAME COLUMN "proofDocDmsRefNo" TO "proofDocDMSRefNo";

ALTER TABLE "rera_cc_documents"
  RENAME COLUMN "ccDocumentDmsRefNo" TO "ccDocumentDMSRefNo";

ALTER TABLE "rera_cc_documents"
  RENAME COLUMN "additionalCcDocumentDmsRefNo" TO "additionalCcDocumentDMSRefNo";

ALTER TABLE "rera_uploaded_documents"
  RENAME COLUMN "documentDmsRefNo" TO "documentDMSRefNo";
