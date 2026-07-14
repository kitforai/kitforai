import { KitForAIError } from "./errors.js";
import type {
  ApiKeySummary,
  BatchItemResult,
  KnowledgeBase,
  KnowledgeBaseActivity,
  KnowledgeBaseContent,
  KnowledgeBaseDetail,
  KbRevision,
  KnowledgeBaseIndexStats,
  KnowledgeBaseKind,
  KnowledgeBaseSearchResult,
  KnowledgeBaseUsage,
  Conversion,
  ConversionHistoryPage,
  ConversionSummary,
  ConvertResponse,
  CreatedApiKey,
  FileInput,
  OutputFormat,
  SourceFile,
} from "./types.js";

export interface KitForAIOptions {
  /** Your API key (`kfa_…`). Create one in the dashboard or via `keys.create`. */
  apiKey: string;
  /** API base URL. Defaults to the production gateway. */
  baseUrl?: string;
  /** Inject a custom fetch (defaults to the global `fetch`). Useful for tests. */
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://kitforai.com";

type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  json?: unknown;
  form?: FormData;
}

function toBlob(input: FileInput): Blob {
  if (input.data instanceof Blob) return input.data;
  // Uint8Array / ArrayBuffer → Blob (Node 18+ and browsers have a global Blob).
  return new Blob([input.data as BlobPart]);
}

/**
 * Official client for the Kit for AI API. Convert documents/URLs to Markdown or
 * JSON and manage knowledge bases — all typed.
 *
 * ```ts
 * const kit = new KitForAI({ apiKey: process.env.KITFORAI_API_KEY! });
 * const res = await kit.convertUrl("https://example.com/report.pdf", { outputFormat: "json" });
 * ```
 */
export class KitForAI {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;

  constructor(options: KitForAIOptions) {
    if (!options?.apiKey) throw new Error("KitForAI: `apiKey` is required.");
    this.#apiKey = options.apiKey;
    this.#baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    const f = options.fetch ?? globalThis.fetch;
    if (!f) throw new Error("KitForAI: no global fetch — pass `fetch` in options (Node <18).");
    this.#fetch = f;
  }

  async #request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    let url = `${this.#baseUrl}${path}`;
    if (opts.query) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) qs.set(k, String(v));
      }
      const s = qs.toString();
      if (s) url += `?${s}`;
    }

    const headers: Record<string, string> = { "x-api-key": this.#apiKey };
    let body: BodyInit | undefined;
    if (opts.form) {
      body = opts.form; // fetch sets the multipart boundary itself
    } else if (opts.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.json);
    }

    const res = await this.#fetch(url, { method, headers, body });

    if (!res.ok) {
      let code = `HTTP_${res.status}`;
      let message = res.statusText || `Request failed with status ${res.status}`;
      try {
        const env = (await res.json()) as { error?: string; message?: string };
        if (env?.error) code = env.error;
        if (env?.message) message = env.message;
      } catch {
        // Non-JSON error body — keep the status-derived defaults.
      }
      const retryAfterRaw = res.headers.get("retry-after");
      const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : undefined;
      throw new KitForAIError(code, message, res.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
    }

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // --- headline conversions ---

  /** Convert an uploaded document to Markdown (or JSON with `outputFormat: "json"`). */
  convert(
    file: FileInput,
    options: { outputFormat?: OutputFormat; jsonSchema?: string; deepExtract?: boolean } = {},
  ): Promise<ConvertResponse> {
    const form = new FormData();
    form.append("file", toBlob(file), file.fileName);
    if (options.outputFormat) form.append("outputFormat", options.outputFormat);
    if (options.jsonSchema) form.append("jsonSchema", options.jsonSchema);
    if (options.deepExtract) form.append("deepExtract", "true");
    return this.#request<ConvertResponse>("POST", "/api/v1/convert", { form });
  }

  /** Fetch a web page or document by URL (SSRF-guarded) and convert it. */
  convertUrl(
    url: string,
    options: { outputFormat?: OutputFormat; jsonSchema?: object; deepExtract?: boolean } = {},
  ): Promise<ConvertResponse> {
    return this.#request<ConvertResponse>("POST", "/api/v1/convert/url", {
      json: { url, ...options },
    });
  }

  /** Convert up to 25 files and/or URLs in one call. Inspect each item's `status`. */
  batch(
    input: { files?: FileInput[]; urls?: string[] },
    options: { outputFormat?: Extract<OutputFormat, "markdown" | "json">; jsonSchema?: string; deepExtract?: boolean } = {},
  ): Promise<BatchItemResult[]> {
    const form = new FormData();
    for (const f of input.files ?? []) form.append("file", toBlob(f), f.fileName);
    for (const u of input.urls ?? []) form.append("url", u);
    if (options.outputFormat) form.append("outputFormat", options.outputFormat);
    if (options.jsonSchema) form.append("jsonSchema", options.jsonSchema);
    if (options.deepExtract) form.append("deepExtract", "true");
    return this.#request<BatchItemResult[]>("POST", "/api/v1/batch", { form });
  }

  // --- conversions & files ---

  conversions = {
    list: (): Promise<ConversionSummary[]> => this.#request("GET", "/api/v1/conversions"),
    get: (id: string): Promise<Conversion> => this.#request("GET", `/api/v1/conversions/${encodeURIComponent(id)}`),
    history: (params: { page?: number; pageSize?: number; q?: string; sort?: string; dir?: "asc" | "desc" } = {}): Promise<ConversionHistoryPage> =>
      this.#request("GET", "/api/v1/conversions/history", { query: params }),
  };

  files = {
    list: (): Promise<SourceFile[]> => this.#request("GET", "/api/v1/files"),
    /** Re-run a previously uploaded file to a (possibly different) format. */
    reconvert: (id: string, outputFormat: Extract<OutputFormat, "markdown" | "json"> = "markdown"): Promise<ConvertResponse> =>
      this.#request("POST", `/api/v1/files/${encodeURIComponent(id)}/reconvert`, { json: { outputFormat } }),
  };

  // --- knowledge bases ---

  knowledgeBases = {
    list: (params: { kind?: KnowledgeBaseKind } = {}): Promise<KnowledgeBase[]> =>
      this.#request("GET", "/api/v1/knowledge-bases", { query: params }),
    create: (input: { name: string; kind?: KnowledgeBaseKind; description?: string }): Promise<KnowledgeBase> =>
      this.#request("POST", "/api/v1/knowledge-bases", { json: input }),
    get: (id: string): Promise<KnowledgeBaseDetail> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}`),
    update: (id: string, input: { name: string; description?: string | null }): Promise<{ ok: true }> =>
      this.#request("PATCH", `/api/v1/knowledge-bases/${encodeURIComponent(id)}`, { json: input }),
    delete: (id: string): Promise<{ ok: true }> =>
      this.#request("DELETE", `/api/v1/knowledge-bases/${encodeURIComponent(id)}`),
    /** Read the whole knowledge base back as one concatenated Markdown document. */
    read: (id: string): Promise<KnowledgeBaseContent> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/content`),
    /** Semantic (hybrid) search within one knowledge base. */
    search: (id: string, query: string, options: { k?: number } = {}): Promise<KnowledgeBaseSearchResult[]> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/search`, { json: { query, ...options } }),
    addDocument: (id: string, conversionId: string): Promise<{ ok: true }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/documents`, { json: { conversionId } }),
    removeDocument: (id: string, conversionId: string): Promise<{ ok: true }> =>
      this.#request("DELETE", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/documents/${encodeURIComponent(conversionId)}`),
    stats: (id: string): Promise<KnowledgeBaseIndexStats> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/stats`),
    usage: (id: string, options: { days?: number } = {}): Promise<KnowledgeBaseUsage> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/usage`, { query: options }),
    activity: (id: string): Promise<KnowledgeBaseActivity> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/activity`),
    retryFailed: (id: string): Promise<{ requeued: number }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/retry-failed`),
    /** Write a versioned feedback document (create, or replace one via `docId`). */
    writeContent: (
      id: string,
      input: { content: string; title?: string; note?: string; docId?: string },
    ): Promise<{ docId: string; version: number; title: string }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/content`, { json: input }),
    /** Append content to a feedback document (or create one) → a new revision. */
    appendContent: (id: string, content: string, options: { title?: string; docId?: string } = {}): Promise<{ docId: string; version: number; title: string }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/content/append`, { json: { content, ...options } }),
    /** Correct a document in place: replace `find` with `replace` → a new revision
     * (the old one is kept, revertible). `find` must currently appear in the doc.
     * Use `replaceAll` to swap every occurrence (default: the first only). */
    editContent: (
      id: string,
      input: { docId: string; find: string; replace: string; replaceAll?: boolean; note?: string },
    ): Promise<{ docId: string; version: number; title: string; replaced: number }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/content/edit`, { json: input }),
    /** Full versioned edit history of a feedback document (newest first). */
    revisions: (id: string, docId: string): Promise<KbRevision[]> =>
      this.#request("GET", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/revisions`),
    /** Revert a document to an earlier version (non-destructive — appends a new revision). */
    revert: (id: string, docId: string, version: number): Promise<{ docId: string; version: number }> =>
      this.#request("POST", `/api/v1/knowledge-bases/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}/revert`, { json: { version } }),
  };

  // --- API keys ---

  keys = {
    list: (): Promise<ApiKeySummary[]> => this.#request("GET", "/api/v1/keys"),
    /** Create a key. The returned `plaintext` is shown once and never stored — save it. */
    create: (name: string): Promise<CreatedApiKey> => this.#request("POST", "/api/v1/keys", { json: { name } }),
    revoke: (id: string): Promise<unknown> => this.#request("DELETE", `/api/v1/keys/${encodeURIComponent(id)}`),
  };
}
