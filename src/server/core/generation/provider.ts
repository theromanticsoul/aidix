export type ImageEditRequest = {
  sourceUrl: string;
  referenceUrls: Array<{
    role: "STYLE" | "FURNITURE" | "MATERIAL";
    url: string;
  }>;
  prompt: string;
  callbackUrl: string;
  options?: Record<string, string | number | boolean>;
};

export type ImageProviderTask = {
  providerTaskId: string;
  state: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";
  resultUrls: string[];
  errorCode?: string;
};

export interface ImageProvider {
  submitEdit(request: ImageEditRequest): Promise<{
    providerTaskId: string;
    provider: "kie";
    model: string;
  }>;
  getTask(providerTaskId: string): Promise<ImageProviderTask>;
}
