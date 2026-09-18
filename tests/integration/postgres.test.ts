import { describe, expect, test } from "bun:test";

const enabled =
  Bun.env.INTEGRATION_TESTS === "true" && Boolean(Bun.env.DATABASE_URL);

describe.if(enabled)("external PostgreSQL", () => {
  test("accepts a connection and executes a health query", async () => {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);
    const adapter = new PrismaPg({
      connectionString: Bun.env.DATABASE_URL as string,
    });
    const client = new PrismaClient({ adapter });
    const result = await client.$queryRaw<
      Array<{ ok: number }>
    >`SELECT 1 AS ok`;
    await client.$disconnect();
    expect(result[0]?.ok).toBe(1);
  });
});
