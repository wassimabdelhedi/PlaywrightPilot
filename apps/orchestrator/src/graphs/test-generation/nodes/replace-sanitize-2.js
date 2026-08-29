const fs = require('fs');
const path = 'c:/Finlogick/PlaywrightPilot/apps/orchestrator/src/graphs/test-generation/nodes/generate-plan.ts';
let code = fs.readFileSync(path, 'utf8');

// find sanitizePlan
const startIdx = code.indexOf('function sanitizePlan');
const endIdx = code.indexOf('export async function generatePlan');

if (startIdx !== -1 && endIdx !== -1) {
    const newSanitize = unction sanitizePlan(
  raw: z.infer<typeof relaxedPlanSchema>,
  allowedSelectors: string[],
  allowedUrls: string[],
): TestPlan {
  if (raw.infeasible) {
    return {
      testTitle: raw.testTitle,
      targetPageUrl: "",
      steps: [],
      successCriteria: {},
      infeasible: true,
      infeasibleReason: raw.infeasibleReason || "No reason provided",
      reasoning: raw.reasoning,
      confidence: raw.confidence,
    };
  }

  let targetPageUrl = raw.targetPageUrl || "";
  if (!targetPageUrl.startsWith("http")) {
    const match = allowedUrls.find(u =>
      u.endsWith(targetPageUrl) || u.includes(targetPageUrl)
    );
    targetPageUrl = match || allowedUrls[0] || targetPageUrl;
  }

  const cleanSteps: Array<{ action: "goto" | "click" | "fill" | "check" | "uncheck" | "selectOption" | "expectVisible" | "expectText" | "expectURL"; selector?: string; url?: string; value?: string }> = [];

  for (const step of raw.steps) {
    if (step.action === "goto" || step.action === "expectURL") {
      let resolvedUrl = step.url || "";
      if (!resolvedUrl.startsWith("http")) {
        const match = allowedUrls.find(u => u.endsWith(resolvedUrl) || u.includes(resolvedUrl));
        resolvedUrl = match || allowedUrls[0] || resolvedUrl;
      }
      cleanSteps.push({ ...step, url: resolvedUrl });
      continue;
    }

    if (step.selector) {
      const foundSelector = allowedSelectors.find(sel => step.selector!.includes(sel));
      if (foundSelector) {
        cleanSteps.push({ ...step, selector: foundSelector });
      }
    } else if (step.action === "expectText") {
      cleanSteps.push(step as any);
    }
  }

  const criteria = raw.successCriteria || {};
  let visibleElementSelector = criteria.visibleElementSelector;
  if (visibleElementSelector && !allowedSelectors.includes(visibleElementSelector)) {
    const match = allowedSelectors.find(s => visibleElementSelector!.includes(s));
    visibleElementSelector = match || undefined;
  }

  let hiddenElementSelector = criteria.hiddenElementSelector;
  if (hiddenElementSelector && !allowedSelectors.includes(hiddenElementSelector)) {
    const match = allowedSelectors.find(s => hiddenElementSelector!.includes(s));
    hiddenElementSelector = match || undefined;
  }

  return {
    testTitle: raw.testTitle,
    targetPageUrl,
    steps: cleanSteps,
    successCriteria: {
      ...criteria,
      visibleElementSelector,
      hiddenElementSelector,
    },
    reasoning: raw.reasoning,
    confidence: raw.confidence,
  };
}

;

    code = code.substring(0, startIdx) + newSanitize + code.substring(endIdx);
    fs.writeFileSync(path, code);
    console.log("Sanitize function fully rewritten!");
} else {
    console.log("Could not find bounds");
}
