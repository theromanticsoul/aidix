import type { Asset, Prisma } from "@prisma/client";
import type {
  AssetRecord,
  AssetRepository,
  CreateAssetInput,
} from "@/server/core/assets";
import { db } from "./client";

function toAssetRecord(asset: Asset): AssetRecord {
  return asset;
}

export class PrismaAssetRepository implements AssetRepository {
  async create(input: CreateAssetInput): Promise<AssetRecord> {
    const data: Prisma.AssetUncheckedCreateInput = input;
    return toAssetRecord(await db.asset.create({ data }));
  }

  async listByProject(
    userId: string,
    projectId: string,
  ): Promise<AssetRecord[]> {
    const records = await db.asset.findMany({
      where: { userId, projectId, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return records.map(toAssetRecord);
  }
}
