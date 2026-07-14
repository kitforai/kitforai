# @kitforai/sdk

Official TypeScript/JavaScript SDK for the [Kit for AI](https://kitforai.com) API.
Convert documents & URLs to clean **Markdown or JSON** and manage
**knowledge bases** — for RAG, LLMs and agents.

Fully typed, zero dependencies, uses native `fetch` (Node 18+, Bun, Deno,
browsers, edge runtimes). Ships both ESM and CommonJS
(`const { KitForAI } = require("@kitforai/sdk")`).

## Install

```bash
npm install @kitforai/sdk
```

## Quick start

```ts
import { KitForAI } from "@kitforai/sdk";

const kit = new KitForAI({ apiKey: process.env.KITFORAI_API_KEY! });

// Convert a URL to structured JSON
const res = await kit.convertUrl("https://example.com/report.pdf", { outputFormat: "json" });
console.log(res.json);

// Convert a local file (Node)
import { readFile } from "node:fs/promises";
const md = await kit.convert(
  { data: await readFile("invoice.pdf"), fileName: "invoice.pdf" },
  { outputFormat: "markdown" },
);
console.log(md.markdown);
```

## API

Create the client with your key (get one in the dashboard or via `kit.keys.create`):

```ts
const kit = new KitForAI({
  apiKey: "kfa_…",
  baseUrl: "https://kitforai.com", // optional override
});
```

**Convert**
- `kit.convert(file, { outputFormat, jsonSchema, deepExtract })`
- `kit.convertUrl(url, { outputFormat, jsonSchema, deepExtract })`
- `kit.batch({ files, urls }, options)` — up to 25 items; inspect each item's `status`

**Conversions & files**
- `kit.conversions.list()` · `kit.conversions.get(id)` · `kit.conversions.history({ page, q, sort, dir })`
- `kit.files.list()` · `kit.files.reconvert(id, outputFormat)`

**Knowledge bases**
- `kit.knowledgeBases.list({ kind })` · `create({ name, kind, description })` · `get(id)` · `update(id, {...})` · `delete(id)`
- `kit.knowledgeBases.read(id)` — the whole knowledge base as one Markdown document
- `kit.knowledgeBases.search(id, query, { k })` — semantic (hybrid) search
- `kit.knowledgeBases.addDocument(id, conversionId)` · `removeDocument(id, conversionId)`
- `kit.knowledgeBases.stats(id)` · `usage(id, { days })` · `activity(id)` · `retryFailed(id)`
- `kit.knowledgeBases.writeContent(id, { content, title, note, docId })` — write back a versioned feedback document (create, or replace one via `docId`)
- `kit.knowledgeBases.appendContent(id, content, { title, docId })` — append content → a new revision
- `kit.knowledgeBases.editContent(id, { docId, find, replace, replaceAll, note })` — correct a document in place (find/replace → a new revision)
- `kit.knowledgeBases.revisions(id, docId)` — full versioned edit history · `revert(id, docId, version)` — non-destructive revert

**API keys**
- `kit.keys.list()` · `kit.keys.create(name)` · `kit.keys.revoke(id)`

## Errors

Any non-2xx response throws `KitForAIError`:

```ts
import { KitForAIError } from "@kitforai/sdk";

try {
  await kit.convertUrl("https://example.com/report.pdf");
} catch (e) {
  if (e instanceof KitForAIError) {
    console.error(e.code, e.status, e.message); // e.g. "RATE_LIMITED" 429 "Slow down"
    if (e.code === "RATE_LIMITED") await sleep((e.retryAfter ?? 1) * 1000);
  }
}
```

Rate limits are per-key by plan (Free 10/min · Pro 60/min · Enterprise 300/min).

## License

MIT
