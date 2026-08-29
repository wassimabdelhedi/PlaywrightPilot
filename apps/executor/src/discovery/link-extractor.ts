// apps/executor/src/discovery/link-extractor.ts
//
// N'extrait QUE des liens de même origine que baseUrl — suivre des
// liens externes transformerait le crawler d'un site en crawler du
// web entier, en plus de réintroduire un risque SSRF sur des domaines
// non prévus par l'utilisateur.

import type { Page } from "playwright";

function normalizeUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    url.hash = ""; // le fragment ne change pas le contenu servi par le serveur
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1); // dédoublonne /page et /page/
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isDenylisted(pathname: string, denylistPaths: string[]): boolean {
  return denylistPaths.some((denied) => pathname.startsWith(denied));
}

export async function extractSameOriginLinks(
  page: Page,
  origin: string,
  denylistPaths: string[]
): Promise<string[]> {
  const hrefs = await page.$$eval("a[href]", (anchors) => anchors.map((a) => a.getAttribute("href") ?? ""));

  const links = new Set<string>();

  for (const href of hrefs) {
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue;
    }

    let absolute: string;
    try {
      absolute = new URL(href, origin).toString();
    } catch {
      continue;
    }

    const normalized = normalizeUrl(absolute);
    if (!normalized) continue;

    const url = new URL(normalized);
    if (url.origin !== origin) continue; // hors périmètre : autre domaine
    if (isDenylisted(url.pathname, denylistPaths)) continue;

    links.add(normalized);
  }

  return Array.from(links);
}
