/** Default max total request JSON / markdown payload (UTF-8 bytes). */
export const DEFAULT_MAX_REQUEST_BYTES = 512 * 1024;

/** Default max YAML frontmatter region (bytes). */
export const DEFAULT_MAX_FRONTMATTER_BYTES = 32 * 1024;

/** Default max markdown body after frontmatter (bytes). */
export const DEFAULT_MAX_BODY_BYTES = 480 * 1024;

/** Default Markdown → Portable Text conversion budget (ms). */
export const DEFAULT_CONVERSION_MS = 2500;

/** Default HMAC clock skew window (seconds). */
export const DEFAULT_SKEW_SECONDS = 300;

/** Idempotency record TTL (ms). */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
