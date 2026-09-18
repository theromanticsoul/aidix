export type AssetKind =
  | "SOURCE_ORIGINAL"
  | "SOURCE_NORMALIZED"
  | "REFERENCE"
  | "GENERATED"
  | "THUMBNAIL"
  | "MASK"
  | "UPSCALED";

export type CreateAssetInput = {
  userId: string;
  projectId: string;
  kind: AssetKind;
  storageKey: string;
  mime: string;
  width: number;
  height: number;
  bytes: number;
  checksum: string;
};

export type AssetRecord = Omit<CreateAssetInput, "projectId"> & {
  id: string;
  projectId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

export interface AssetRepository {
  create(input: CreateAssetInput): Promise<AssetRecord>;
  listByProject(userId: string, projectId: string): Promise<AssetRecord[]>;
}
