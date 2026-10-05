import { describe, expect, it } from "vite-plus/test";

import { isLegalDocumentUrl } from "./legal-document-url";

describe("isLegalDocumentUrl", () => {
  it.each([
    "https://github.com/screen-gd/PocketCLI/legal",
    "https://github.com/screen-gd/PocketCLI/legal/",
    "https://github.com/screen-gd/PocketCLI/privacy-policy?source=app",
    "https://github.com/screen-gd/PocketCLI/terms-of-service#updates",
    "https://github.com/screen-gd/PocketCLI/security-policy",
  ])("allows a configured legal document: %s", (url) => {
    expect(isLegalDocumentUrl(url)).toBe(true);
  });

  it.each([
    "https://github.com/screen-gd/PocketCLI/download",
    "https://example.com/legal",
    "javascript:alert(1)",
    "not-a-url",
  ])("rejects a URL outside the legal-document allowlist: %s", (url) => {
    expect(isLegalDocumentUrl(url)).toBe(false);
  });
});
