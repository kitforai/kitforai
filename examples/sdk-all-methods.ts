/**
 * Kit for AI SDK — the complete tour.
 *
 * Exercises EVERY method in @kitforai/sdk end-to-end: conversions, batch,
 * files, the full knowledge-base lifecycle (CRUD + search/read/stats/usage +
 * versioned write/append/edit/revisions/revert), and API keys.
 *
 * Safe to run: it creates a temporary knowledge base and a throwaway API key,
 * then deletes/revokes both in a `finally` — even if a step fails.
 *
 *   npm install @kitforai/sdk tsx
 *   export KITFORAI_API_KEY=kfa_...
 *   npx tsx examples/sdk-all-methods.ts
 */
import { KitForAI, KitForAIError } from "@kitforai/sdk";

const kit = new KitForAI({ apiKey: process.env.KITFORAI_API_KEY! });

// Numbered section header, so the output reads as a checklist of methods.
let n = 0;
const step = (title: string) => console.log(`\n${String(++n).padStart(2, "0")}. ${title}`);

async function main() {
  // ── API keys ──────────────────────────────────────────────────────────────
  step("keys.list — your existing API keys");
  const keys = await kit.keys.list();
  console.log(`   ${keys.length} key(s): ${keys.map((k) => k.prefix).join(", ") || "(none)"}`);

  step("keys.create — mint a throwaway key (revoked in cleanup)");
  const tempKey = await kit.keys.create("sdk-tour (temporary)");
  console.log(`   created ${tempKey.prefix}… — plaintext is returned once, never again`);

  // Everything after the key exists runs inside try/finally so the temp key and
  // temp knowledge base are always cleaned up.
  let kbId: string | null = null;
  try {
    // ── Conversions ───────────────────────────────────────────────────────────
    step("convert — upload an in-memory file → Markdown");
    const notes = {
      data: Buffer.from("# Meeting notes\n\n- Ship the SDK\n- Write the docs\n"),
      fileName: "notes.md",
    };
    const converted = await kit.convert(notes, { outputFormat: "markdown" });
    console.log(`   #${converted.id} · ${converted.status} · ${converted.markdown?.length ?? 0} chars`);

    step("convertUrl — fetch a web page → Markdown (SSRF-guarded)");
    const page = await kit.convertUrl("https://example.com", { outputFormat: "markdown" });
    console.log(`   ${page.status} · ${page.markdown?.slice(0, 60).replace(/\s+/g, " ")}…`);

    step("convertUrl — the same page → structured JSON");
    const asJson = await kit.convertUrl("https://example.com", { outputFormat: "json" });
    console.log(`   ${asJson.status} · json keys: ${asJson.json ? Object.keys(asJson.json as object).join(", ") : "—"}`);

    step("batch — convert several URLs in one call");
    const batch = await kit.batch(
      { urls: ["https://example.com", "https://example.org"] },
      { outputFormat: "markdown" },
    );
    for (const r of batch) console.log(`   ${r.status.padEnd(9)} ${r.source}`);

    step("conversions.list — recent conversions");
    console.log(`   ${(await kit.conversions.list()).length} conversion(s)`);

    step("conversions.get — the full record of one conversion");
    const full = await kit.conversions.get(converted.id);
    console.log(`   ${full.fileName} · ${full.words ?? 0} words · ${full.format} → ${full.outputFormat}`);

    step("conversions.history — paged, searchable, sortable");
    const history = await kit.conversions.history({ page: 1, pageSize: 5, sort: "createdAt", dir: "desc" });
    console.log(`   page ${history.page}/${history.pageCount} · ${history.total} total`);

    // ── Files ───────────────────────────────────────────────────────────────
    step("files.list — your uploaded source files");
    const files = await kit.files.list();
    console.log(`   ${files.length} file(s)`);
    if (files[0]) {
      step("files.reconvert — re-run a stored file to a different format");
      const re = await kit.files.reconvert(files[0].id, "json");
      console.log(`   #${re.id} · ${re.status}`);
    }

    // ── Knowledge bases: full lifecycle ───────────────────────────────────────
    step("knowledgeBases.create — a temporary KB for this tour");
    const kb = await kit.knowledgeBases.create({
      name: `SDK tour ${Date.now()}`,
      description: "Created by sdk-all-methods.ts",
    });
    kbId = kb.id;
    console.log(`   ${kb.id} · ${kb.name}`);

    step("knowledgeBases.list — all your knowledge bases");
    console.log(`   ${(await kit.knowledgeBases.list({ kind: "knowledge_base" })).length} knowledge base(s)`);

    step("knowledgeBases.update — rename + re-describe");
    await kit.knowledgeBases.update(kb.id, { name: `${kb.name} (updated)`, description: "Now with a better description." });
    console.log("   updated");

    step("knowledgeBases.addDocument — attach the converted note");
    await kit.knowledgeBases.addDocument(kb.id, converted.id);
    console.log("   attached");

    step("knowledgeBases.get — detail, including attached documents");
    const detail = await kit.knowledgeBases.get(kb.id);
    console.log(`   ${detail.documents.length} doc(s), ${detail.feedback.length} written doc(s)`);

    step("knowledgeBases.stats — index health");
    const stats = await kit.knowledgeBases.stats(kb.id);
    console.log(`   ${stats.chunksReady}/${stats.chunksTotal} chunks ready · ${stats.tokens} tokens`);

    step("knowledgeBases.retryFailed — requeue any failed chunks");
    console.log(`   requeued ${(await kit.knowledgeBases.retryFailed(kb.id)).requeued}`);

    step("knowledgeBases.search — hybrid semantic search");
    const hits = await kit.knowledgeBases.search(kb.id, "what should we ship?", { k: 3 });
    if (hits.length === 0) console.log("   (no hits yet — indexing runs in the background)");
    for (const h of hits) console.log(`   ${h.score.toFixed(3)} · ${h.document}: ${h.content.slice(0, 50)}…`);

    step("knowledgeBases.read — the whole KB as one Markdown document");
    const content = await kit.knowledgeBases.read(kb.id);
    console.log(`   ${content.documentCount} doc(s) · ${content.content.length} chars`);

    // Written-back "feedback" documents — versioned create → append → edit → revert.
    step("knowledgeBases.writeContent — write a versioned doc (v1)");
    const doc = await kit.knowledgeBases.writeContent(kb.id, { title: "Style guide", content: "Always cite sources.\n" });
    console.log(`   ${doc.docId} · v${doc.version} · ${doc.title}`);

    step("knowledgeBases.appendContent — add to it (v2)");
    console.log(`   v${(await kit.knowledgeBases.appendContent(kb.id, "Prefer active voice.\n", { docId: doc.docId })).version}`);

    step("knowledgeBases.editContent — correct in place (v3)");
    const edited = await kit.knowledgeBases.editContent(kb.id, { docId: doc.docId, find: "active voice", replace: "plain language" });
    console.log(`   v${edited.version} · replaced ${edited.replaced}`);

    step("knowledgeBases.revisions — full version history (newest first)");
    for (const r of await kit.knowledgeBases.revisions(kb.id, doc.docId)) {
      console.log(`   v${r.version} by ${r.author}${r.note ? ` — ${r.note}` : ""}`);
    }

    step("knowledgeBases.revert — roll back to v1 (non-destructive)");
    console.log(`   now at v${(await kit.knowledgeBases.revert(kb.id, doc.docId, 1)).version}`);

    step("knowledgeBases.usage — reads/searches over time");
    const usage = await kit.knowledgeBases.usage(kb.id, { days: 30 });
    console.log(`   ${usage.total} consumption event(s) · avg ${usage.avgLatencyMs}ms`);

    step("knowledgeBases.activity — recent consumers");
    console.log(`   ${(await kit.knowledgeBases.activity(kb.id)).count} event(s)`);

    step("knowledgeBases.removeDocument — detach the note");
    await kit.knowledgeBases.removeDocument(kb.id, converted.id);
    console.log("   detached");
  } finally {
    // ── Cleanup — always runs ────────────────────────────────────────────────
    if (kbId) {
      step("knowledgeBases.delete — remove the temporary KB");
      await kit.knowledgeBases.delete(kbId).catch((e) => console.error(`   delete failed: ${e.message}`));
      console.log("   deleted");
    }
    step("keys.revoke — revoke the throwaway key");
    await kit.keys.revoke(tempKey.id).catch((e) => console.error(`   revoke failed: ${e.message}`));
    console.log("   revoked");
  }

  console.log("\n✓ Tour complete — that's every method in @kitforai/sdk.");
}

main().catch((err) => {
  if (err instanceof KitForAIError) {
    console.error(`\n✗ Kit for AI error [${err.code}] ${err.status}: ${err.message}`);
    if (err.retryAfter) console.error(`  retry after ${err.retryAfter}s`);
    process.exit(1);
  }
  throw err;
});
