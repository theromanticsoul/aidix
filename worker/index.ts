import {
  reconcileNextGenerationVariant,
  submitNextGenerationVariant,
} from "@/server/core/generation";
import { KieImageProvider } from "@/server/infrastructure/ai/kie/client";
import { PrismaGenerationWorkerRepository } from "@/server/infrastructure/db/generation-worker-repository";
import { S3ObjectStorage } from "@/server/infrastructure/storage/s3";

const repository = new PrismaGenerationWorkerRepository();
const provider = new KieImageProvider();
const storage = new S3ObjectStorage();

async function run() {
  console.info("AIDIX generation worker is ready");
  while (true) {
    const submitted = await submitNextGenerationVariant(
      repository,
      provider,
      storage,
    );
    const reconciled = await reconcileNextGenerationVariant(
      repository,
      provider,
      storage,
    );
    if (!submitted && !reconciled)
      await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

run().catch((error) => {
  console.error("Generation worker stopped", error);
  process.exitCode = 1;
});
