import { prisma } from "@platform/database";

async function main() {
  const scenario = await prisma.scenario.findFirst({
    where: { status: "DRAFT" }
  });

  if (!scenario) {
    console.log("No DRAFT scenario found.");
    return;
  }

  console.log("Found DRAFT scenario:", scenario.id, "project:", scenario.projectId);
  
  // Appeler l'API pour mettre à jour
  const res = await fetch(`http://localhost:4000/api/v1/scenarios/${scenario.id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ status: "APPROVED" })
  });

  const body = await res.text();
  console.log("API Response Status:", res.status);
  console.log("API Response Body:", body);
}

main().catch(console.error);
