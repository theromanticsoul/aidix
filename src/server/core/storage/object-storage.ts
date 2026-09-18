export type PutObjectInput = {
  key: string;
  body: Uint8Array;
  contentType: string;
};

export type StoredObject = {
  key: string;
  bytes: number;
  contentType: string;
};

export interface ObjectStorage {
  put(input: PutObjectInput): Promise<StoredObject>;
  getSignedReadUrl(key: string, ttlSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}
