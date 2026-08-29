// apps/executor/src/browser/url-guard.test.ts
//
// La garde SSRF est LE composant de sécurité de cette phase — elle
// mérite une couverture de test disproportionnée par rapport à sa
// taille, précisément parce qu'un oubli ici est une vulnérabilité
// silencieuse, jamais un bug visible en développement normal.

import { describe, it, expect } from "vitest";
import { assertSafeUrl, UnsafeUrlError } from "./url-guard";

describe("assertSafeUrl", () => {
  it("accepte une URL publique valide", async () => {
    await expect(assertSafeUrl("https://example.com")).resolves.toBeUndefined();
  });

  it("rejette un schéma non http(s)", async () => {
    await expect(assertSafeUrl("file:///etc/passwd")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("javascript:alert(1)")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejette une IP littérale en plage privée", async () => {
    await expect(assertSafeUrl("http://127.0.0.1")).rejects.toThrow(UnsafeUrlError);
    await expect(assertSafeUrl("http://192.168.1.1")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejette l'endpoint de métadonnées cloud", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejette des identifiants embarqués dans l'URL", async () => {
    await expect(assertSafeUrl("http://user:pass@example.com")).rejects.toThrow(UnsafeUrlError);
  });

  it("rejette une URL malformée", async () => {
    await expect(assertSafeUrl("pas-une-url")).rejects.toThrow(UnsafeUrlError);
  });
});
