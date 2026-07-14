// Public wire types for the Kit for AI API. These mirror the gateway's response
// shapes (packages/contracts) but are declared standalone so the published SDK
// carries no internal @repo/* dependency.

export type OutputFormat = "markdown" | "mdc" | "text" | "json";
export type KnowledgeBaseKind = "knowledge_base";
export type ConversionStatus = "pending" | "processing" | "completed" | "failed";

/** Result of a single convert / convert-url call. */
export interface ConvertResponse {
  id: string;
  status: "completed" | "failed";
  cached: boolean;
  markdown: string | null;
  json: unknown | null;
}

/** One item in a batch response (a ConvertResponse plus its source label). */
export interface BatchItemResult extends ConvertResponse {
  /** The file name or URL this result came from. */
  source: string;
}

/** A knowledge base, as returned by list & create. */
export interface KnowledgeBase {
  id: string;
  kind: KnowledgeBaseKind;
  name: string;
  description: string | null;
  /** Number of documents in the knowledge base. */
  documents: number;
  createdAt: string;
  updatedAt: string;
}

/** A knowledge base read back as one concatenated Markdown document. */
export interface KnowledgeBaseContent {
  name: string;
  description: string | null;
  documentCount: number;
  content: string;
}

/** A single ranked chunk from a semantic knowledge base search. */
export interface KnowledgeBaseSearchResult {
  /** Source document name. */
  document: string;
  content: string;
  score: number;
}

export interface KnowledgeBaseIndexStats {
  documentsIndexed: number;
  chunksTotal: number;
  chunksReady: number;
  chunksFailed: number;
  tokens: number;
}

export interface KnowledgeBaseUsage {
  series: Array<{ day: string; reads: number; searches: number }>;
  byInterface: { api: number; mcp: number };
  avgLatencyMs: number;
  total: number;
}

export interface KnowledgeBaseActivity {
  count: number;
  recent: Array<{ ip: string | null; country: string | null; createdAt: string }>;
}

/** A conversion as it appears in list / history rows. */
export interface ConversionSummary {
  id: string;
  fileName: string;
  format: string;
  outputFormat: string;
  status: ConversionStatus;
  words: number | null;
  pages: number | null;
  source: string;
  createdAt: string;
}

/** The full conversion record from `conversions.get`. */
export interface Conversion {
  id: string;
  fileName: string;
  fileSize: number;
  format: string;
  outputFormat: string;
  status: ConversionStatus;
  markdown: string | null;
  json: unknown | null;
  words: number | null;
  pages: number | null;
  deepExtract: boolean;
  cached: boolean;
  source: string;
  error: string | null;
  warnings: string[];
  createdAt: string;
  completedAt: string | null;
}

export interface ConversionHistoryPage {
  items: ConversionSummary[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  sort: string;
  dir: "asc" | "desc";
  q: string;
}

export interface SourceFile {
  id: string;
  fileName: string;
  size: number;
  createdAt: string;
}

export interface ApiKeySummary {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

/** Returned once by `keys.create` — the plaintext is never retrievable again. */
export interface CreatedApiKey {
  plaintext: string;
  id: string;
  prefix: string;
}

/** A document inside a knowledge base detail (conversion fields + when it was added). */
export interface KnowledgeBaseDocument {
  id: string;
  fileName: string;
  format: string;
  outputFormat: string;
  status: ConversionStatus;
  words: number | null;
  createdAt: string;
  addedAt: string;
}

/** A written-back feedback document (model/user/api authored, versioned). */
export interface KbFeedbackDocument {
  id: string;
  title: string;
  source: "model" | "user" | "api";
  currentRevision: number;
  createdAt: string;
  updatedAt: string;
}

/** One version of a feedback document, from `knowledgeBases.revisions`. */
export interface KbRevision {
  id: string;
  version: number;
  author: string;
  note: string | null;
  content: string;
  createdAt: string;
}

/** A knowledge base with its documents, from `knowledgeBases.get`. */
export interface KnowledgeBaseDetail {
  id: string;
  kind: KnowledgeBaseKind;
  name: string;
  description: string | null;
  createdAt: string;
  documents: KnowledgeBaseDocument[];
  /** Written-back feedback documents surfaced in the Feedback tab. */
  feedback: KbFeedbackDocument[];
}

/** A file to convert: raw bytes (or a Blob) plus a file name. */
export interface FileInput {
  data: Blob | ArrayBuffer | Uint8Array;
  fileName: string;
}
