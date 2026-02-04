export interface ReraSearchResponse {
  projectId: string;
  projectName: string;
  reraNo: string;
  [key: string]: any;
}

export interface FetchDetailsRequest {
  projectId: string;
  reraNo: string;
  captchaText: string;
}

export interface UnifiedProjectData {
  projectName?: string;
  reraNumber: string;
  projectId: string;
  rawResponses: any;
}
