import { upsertMemory, queryMemory } from "@platform/agent-memory";
import { prisma } from "@platform/database";

async function main() {
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error("Aucun projet trouvé en DB. Créez un projet depuis l'interface web d'abord.");
    return;
  }
  const projectId = project.id;
  console.log(`Utilisation du projet : ${project.name} (${projectId})`);
  
  console.log("🧠 Ajout d'une fonctionnalité au cerveau...");
  await upsertMemory({
    projectId,
    category: "FEATURE_MAP",
    dedupeText: "Bouton d'ajout au panier sur la fiche produit",
    content: { action: "AddToCart", selector: ".btn-add-to-cart" }
  });

  console.log("🔍 Recherche par similarité : 'Je veux acheter l'article'...");
  const resultats = await queryMemory(projectId, "FEATURE_MAP", "Je veux acheter l'article", 1);
  
  console.log("Résultat trouvé :");
  console.log(resultats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
