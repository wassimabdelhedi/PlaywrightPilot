// apps/orchestrator/src/graphs/test-generation/action-resolver.ts
//
// Moteur de regles deterministes pour les actions sur les elements DOM.
// Le LLM identifie QUELS elements utiliser et DANS QUEL ORDRE.
// Ce module determine L ACTION selon le type d element — jamais le LLM.
//
// Eliminination des erreurs : BUTTON -> fill, INPUT -> click

export type DomAction = "fill" | "click" | "check" | "select" | "navigate";

export interface ElementDescriptor {
  tag?: string;
  type?: string;
  elementType?: string;
  attributes?: Record<string, string>;
}

/**
 * Regles deterministes de mapping element -> action.
 * Ordre important : regles les plus specifiques en premier.
 */
export function resolveAction(element: ElementDescriptor): DomAction {
  const tag = (element.tag ?? "").toLowerCase();
  const inputType = (element.attributes?.type ?? element.type ?? "").toLowerCase();
  const elementType = (element.elementType ?? "").toLowerCase();

  // --- SELECT ---
  if (tag === "select" || elementType === "select") return "select";

  // --- CHECKBOX / RADIO ---
  if (
    inputType === "checkbox" ||
    inputType === "radio" ||
    elementType === "checkbox" ||
    elementType === "radio"
  ) return "check";

  // --- INPUT type=submit ou type=button → CLICK (jamais fill) ---
  if (tag === "input" && (inputType === "submit" || inputType === "button")) return "click";

  // --- INPUTS FILLABLES ---
  if (
    tag === "input" ||
    tag === "textarea" ||
    elementType === "input" ||
    elementType === "textarea" ||
    elementType === "email" ||
    elementType === "password" ||
    elementType === "number" ||
    elementType === "tel" ||
    elementType === "url" ||
    elementType === "search" ||
    elementType === "date" ||
    elementType === "time"
  ) return "fill";

  // --- BOUTONS / LIENS / TOUT LE RESTE → CLICK ---
  return "click";
}

/** Valide qu une action est compatible avec un type d element */
export function validateActionForElement(action: DomAction, element: ElementDescriptor): {
  valid: boolean;
  corrected?: DomAction;
  reason?: string;
} {
  const expected = resolveAction(element);

  if (action === expected) return { valid: true };

  const tag = (element.tag ?? element.elementType ?? "element").toLowerCase();
  return {
    valid: false,
    corrected: expected,
    reason: `Action "${action}" incompatible avec <${tag}> — action corrigee: "${expected}"`,
  };
}
