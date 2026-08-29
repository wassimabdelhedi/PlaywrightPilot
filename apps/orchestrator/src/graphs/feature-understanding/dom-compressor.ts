// apps/orchestrator/src/graphs/feature-understanding/dom-compressor.ts
//
// Compresse une representation DOM complete en JSON minimal.
// Reduction typique : 80-95% des tokens envoyes au LLM.
//
// Priorite de source de verite : DOM -> metadata -> screenshot (jamais source primaire)

export interface CompressedPage {
  page: string;
  title?: string;
  inputs: string[];
  buttons: string[];
  links: string[];
  selects: string[];
  textareas: string[];
  landmarks: string[];
  forms: number;
}

/**
 * Compresse un elementSummary (texte HTML ou descriptif) en JSON compact.
 * Utilise des regex simples pour extraire les elements interactifs
 * sans avoir a parser le DOM complet.
 */
export function compressDomSummary(url: string, title: string | undefined, rawSummary: string): CompressedPage {
  const inputs: string[] = [];
  const buttons: string[] = [];
  const links: string[] = [];
  const selects: string[] = [];
  const textareas: string[] = [];
  const landmarks: string[] = [];

  // Extraire les inputs (name, id, placeholder, type)
  const inputMatches = rawSummary.matchAll(/input[^>]*(?:name=["']([^"']+)["']|id=["']([^"']+)["']|placeholder=["']([^"']+)["']|type=["']([^"']+)["'])/gi);
  for (const m of inputMatches) {
    const label = m[1] ?? m[2] ?? m[3] ?? m[4] ?? "input";
    if (!inputs.includes(label)) inputs.push(label);
  }

  // Extraire les boutons (text content ou value)
  const buttonMatches = rawSummary.matchAll(/(?:button|input\s+type=["'](?:submit|button)["'])[^>]*(?:>([^<]+)<\/button>|value=["']([^"']+)["'])/gi);
  for (const m of buttonMatches) {
    const label = (m[1] ?? m[2] ?? "button").trim();
    if (label && !buttons.includes(label)) buttons.push(label.substring(0, 50));
  }

  // Extraire les liens significatifs (pas de navigation generique)
  const linkMatches = rawSummary.matchAll(/href=["']([^"'#][^"']*?)["'][^>]*>([^<]{3,40})<\/a>/gi);
  for (const m of linkMatches) {
    const href = m[1];
    const text = m[2].trim();
    if (text && !links.includes(text) && links.length < 10) links.push(text);
  }

  // Selects
  const selectMatches = rawSummary.matchAll(/select[^>]*(?:name=["']([^"']+)["']|id=["']([^"']+)["'])/gi);
  for (const m of selectMatches) {
    const label = m[1] ?? m[2] ?? "select";
    if (!selects.includes(label)) selects.push(label);
  }

  // Textareas
  const textareaMatches = rawSummary.matchAll(/textarea[^>]*(?:name=["']([^"']+)["']|id=["']([^"']+)["']|placeholder=["']([^"']+)["'])/gi);
  for (const m of textareaMatches) {
    const label = m[1] ?? m[2] ?? m[3] ?? "textarea";
    if (!textareas.includes(label)) textareas.push(label);
  }

  // Landmarks (nav, main, form)
  if (/<nav/i.test(rawSummary)) landmarks.push("nav");
  if (/<main/i.test(rawSummary)) landmarks.push("main");
  if (/<header/i.test(rawSummary)) landmarks.push("header");
  if (/<footer/i.test(rawSummary)) landmarks.push("footer");

  const formCount = (rawSummary.match(/<form/gi) ?? []).length;

  return {
    page: url,
    title,
    inputs: inputs.slice(0, 20),
    buttons: buttons.slice(0, 10),
    links: links.slice(0, 10),
    selects: selects.slice(0, 10),
    textareas: textareas.slice(0, 5),
    landmarks,
    forms: formCount,
  };
}

/** Serialise un CompressedPage en texte compact pour injection dans le prompt */
export function formatCompressedPage(page: CompressedPage): string {
  const parts: string[] = [`URL: ${page.page}`];
  if (page.title) parts.push(`Title: ${page.title}`);
  if (page.inputs.length > 0) parts.push(`Inputs: [${page.inputs.join(", ")}]`);
  if (page.buttons.length > 0) parts.push(`Buttons: [${page.buttons.join(", ")}]`);
  if (page.links.length > 0) parts.push(`Links: [${page.links.join(", ")}]`);
  if (page.selects.length > 0) parts.push(`Selects: [${page.selects.join(", ")}]`);
  if (page.textareas.length > 0) parts.push(`Textareas: [${page.textareas.join(", ")}]`);
  if (page.forms > 0) parts.push(`Forms: ${page.forms}`);
  return parts.join(" | ");
}
