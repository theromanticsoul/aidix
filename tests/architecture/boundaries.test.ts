import { expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(
  dirname(dirname(fileURLToPath(import.meta.url))),
);

test("FSD layers are present", async () => {
  for (const path of [
    ["1_app", "index.ts"],
    ["2_pages", "index.ts"],
    ["3_widgets", "index.ts"],
    ["4_features", "index.ts"],
    ["5_entities", "index.ts"],
    ["6_shared", "ui", "index.ts"],
  ]) {
    expect(await Bun.file(join(repositoryRoot, "src", ...path)).exists()).toBe(
      true,
    );
  }
});
