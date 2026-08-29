const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.project.findUnique({where: {id: 'cmtbze8q8000b8k91kvewmpad'}})
  .then(p => console.log('Project:', p))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
