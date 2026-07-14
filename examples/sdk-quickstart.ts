/**
 * Kit for AI SDK quickstart.
 *
 *   npm install @kitforai/sdk
 *   export KITFORAI_API_KEY=kfa_...
 *   npx tsx examples/sdk-quickstart.ts
 */
import { readFile } from "node:fs/promises";
import { KitForAI, KitForAIError } from "@kitforai/sdk";

const kit = new KitForAI({ apiKey: process.env.KITFORAI_API_KEY! });

async function main() {
  // 1. Convert a URL to clean Markdown (the article, not the nav/ads).
  const page = await kit.convertUrl("https://example.com/blog/post", { outputFormat: "markdown" });
  console.log("markdown:", page.markdown?.slice(0, 200));

  // 2. Convert a URL straight into structured JSON.
  const report = await kit.convertUrl("https://example.com/report.pdf", { outputFormat: "json" });
  console.log("json:", report.json);

  // 3. Convert a local file (Node).
  const invoice = await kit.convert(
    { data: await readFile("invoice.pdf"), fileName: "invoice.pdf" },
    { outputFormat: "markdown" },
  );
  console.log("invoice md:", invoice.markdown?.slice(0, 200));
}

main().catch((err) => {
  if (err instanceof KitForAIError) {
    console.error(`Kit for AI error [${err.code}] ${err.status}: ${err.message}`);
    process.exit(1);
  }
  throw err;
});
