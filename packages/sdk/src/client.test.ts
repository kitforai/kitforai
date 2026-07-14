import { test } from "node:test";
import assert from "node:assert/strict";
import { KitForAI } from "./client.js";
import { KitForAIError } from "./errors.js";

type Captured = { url: string; init: RequestInit };

/** Build a client whose fetch records the request and returns a canned Response. */
function stub(response: Response): { kit: KitForAI; calls: Captured[] } {
  const calls: Captured[] = [];
  const kit = new KitForAI({
    apiKey: "kfa_test",
    baseUrl: "https://api.example.com/",
    fetch: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return response;
    }) as typeof fetch,
  });
  return { kit, calls };
}

const ok = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("requires an apiKey", () => {
  assert.throws(() => new KitForAI({ apiKey: "" }), /apiKey/);
});

test("convertUrl: POST + auth header + JSON body, trailing slash trimmed", async () => {
  const { kit, calls } = stub(ok({ id: "c1", status: "completed", cached: false, markdown: "# hi", json: null }));
  const res = await kit.convertUrl("https://x.com/a.pdf", { outputFormat: "json" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/convert/url");
  assert.equal(calls[0]!.init.method, "POST");
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers["x-api-key"], "kfa_test");
  assert.equal(headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { url: "https://x.com/a.pdf", outputFormat: "json" });
  assert.equal(res.markdown, "# hi");
});

test("convert: builds multipart form with file + options", async () => {
  const { kit, calls } = stub(ok({ id: "c2", status: "completed", cached: false, markdown: "x", json: null }));
  await kit.convert({ data: new Uint8Array([1, 2, 3]), fileName: "doc.pdf" }, { outputFormat: "markdown", deepExtract: true });

  const form = calls[0]!.init.body as FormData;
  assert.ok(form instanceof FormData);
  const file = form.get("file");
  assert.ok(file instanceof Blob);
  assert.equal(form.get("outputFormat"), "markdown");
  assert.equal(form.get("deepExtract"), "true");
  // The client must NOT set content-type on multipart (fetch adds the boundary).
  const headers = calls[0]!.init.headers as Record<string, string>;
  assert.equal(headers["content-type"], undefined);
});

test("history: serializes query params", async () => {
  const { kit, calls } = stub(ok({ items: [], total: 0, page: 1, pageSize: 20, pageCount: 0, sort: "createdAt", dir: "desc", q: "" }));
  await kit.conversions.history({ page: 2, q: "invoice", dir: "asc" });
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/conversions/history?page=2&q=invoice&dir=asc");
});

test("path ids are URL-encoded", async () => {
  const { kit, calls } = stub(ok({ id: "x" }));
  await kit.conversions.get("a b/c");
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/conversions/a%20b%2Fc");
});

test("non-2xx throws KitForAIError with code, status, retryAfter", async () => {
  const res = new Response(JSON.stringify({ error: "RATE_LIMITED", message: "Slow down" }), {
    status: 429,
    headers: { "content-type": "application/json", "retry-after": "30" },
  });
  const { kit } = stub(res);
  await assert.rejects(
    () => kit.convertUrl("https://example.com/a.pdf"),
    (e: unknown) => {
      assert.ok(e instanceof KitForAIError);
      assert.equal(e.code, "RATE_LIMITED");
      assert.equal(e.status, 429);
      assert.equal(e.message, "Slow down");
      assert.equal(e.retryAfter, 30);
      return true;
    },
  );
});

test("non-JSON error body falls back to status-derived code", async () => {
  const { kit } = stub(new Response("gateway boom", { status: 502 }));
  await assert.rejects(
    () => kit.conversions.list(),
    (e: unknown) => e instanceof KitForAIError && e.code === "HTTP_502" && e.status === 502,
  );
});

test("knowledgeBases.writeContent: POST to /content with body", async () => {
  const { kit, calls } = stub(ok({ docId: "d1", version: 2, title: "Notes" }));
  const res = await kit.knowledgeBases.writeContent("kb1", { content: "hi", title: "Notes" });
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/knowledge-bases/kb1/content");
  assert.equal(calls[0]!.init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { content: "hi", title: "Notes" });
  assert.equal(res.version, 2);
});

test("knowledgeBases.editContent: POST find/replace to /content/edit", async () => {
  const { kit, calls } = stub(ok({ docId: "d1", version: 3, title: "Notes", replaced: 1 }));
  const res = await kit.knowledgeBases.editContent("kb1", { docId: "d1", find: "old", replace: "new" });
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/knowledge-bases/kb1/content/edit");
  assert.equal(calls[0]!.init.method, "POST");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { docId: "d1", find: "old", replace: "new" });
  assert.equal(res.replaced, 1);
});

test("knowledgeBases.revisions: GET the document revisions sub-route", async () => {
  const { kit, calls } = stub(ok([]));
  await kit.knowledgeBases.revisions("kb1", "d1");
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/knowledge-bases/kb1/documents/d1/revisions");
  assert.equal(calls[0]!.init.method, "GET");
});

test("knowledgeBases.revert: POST version to the revert sub-route", async () => {
  const { kit, calls } = stub(ok({ docId: "d1", version: 4 }));
  await kit.knowledgeBases.revert("kb1", "d1", 3);
  assert.equal(calls[0]!.url, "https://api.example.com/api/v1/knowledge-bases/kb1/documents/d1/revert");
  assert.deepEqual(JSON.parse(calls[0]!.init.body as string), { version: 3 });
});
