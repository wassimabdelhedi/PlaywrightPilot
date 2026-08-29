// apps/executor/src/discovery/link-extractor.test.ts

import { describe, it, expect, vi } from "vitest";
import { extractSameOriginLinks } from "./link-extractor";
import type { Page } from "playwright";

function mockPage(hrefs: string[]): Page {
  return {
    $$eval: vi.fn().mockResolvedValue(hrefs),
  } as unknown as Page;
}

describe("extractSameOriginLinks", () => {
  it("ne garde que les liens de même origine", async () => {
    const page = mockPage(["/about", "https://external.com/page", "https://example.com/contact"]);
    const links = await extractSameOriginLinks(page, "https://example.com", []);

    expect(links).toContain("https://example.com/about");
    expect(links).toContain("https://example.com/contact");
    expect(links).not.toContain("https://external.com/page");
  });

  it("filtre les chemins de la liste noire", async () => {
    const page = mockPage(["/checkout", "/products"]);
    const links = await extractSameOriginLinks(page, "https://example.com", ["/checkout"]);

    expect(links).not.toContain("https://example.com/checkout");
    expect(links).toContain("https://example.com/products");
  });

  it("ignore les schémas non http (mailto, tel, javascript)", async () => {
    const page = mockPage(["mailto:test@example.com", "tel:+123456789", "javascript:void(0)", "/valid"]);
    const links = await extractSameOriginLinks(page, "https://example.com", []);

    expect(links).toEqual(["https://example.com/valid"]);
  });

  it("dédoublonne les URLs équivalentes (fragment, slash final)", async () => {
    const page = mockPage(["/products#section", "/products/", "/products"]);
    const links = await extractSameOriginLinks(page, "https://example.com", []);

    expect(links).toHaveLength(1);
    expect(links[0]).toBe("https://example.com/products");
  });
});
