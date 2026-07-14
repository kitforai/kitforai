/**
 * Thrown for any non-2xx API response. The gateway returns the envelope
 * `{ error: "<CODE>", message: "<human sentence>" }`; `code` is the stable
 * machine-readable code (e.g. "RATE_LIMITED", "UNAUTHORIZED") to branch on,
 * `status` the HTTP status, and `.message` the human-readable message.
 */
export class KitForAIError extends Error {
  readonly code: string;
  readonly status: number;
  /** Seconds to wait before retrying, from the `Retry-After` header on 429s. */
  readonly retryAfter?: number;

  constructor(code: string, message: string, status: number, retryAfter?: number) {
    super(message);
    this.name = "KitForAIError";
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
