import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all company, contact, lead, and project data...\n");

  const activities = await prisma.activity.deleteMany({});
  console.log(`  Deleted ${activities.count} activities`);

  const tasks = await prisma.task.deleteMany({});
  console.log(`  Deleted ${tasks.count} tasks`);

  const estimates = await prisma.consultationEstimate.deleteMany({});
  console.log(`  Deleted ${estimates.count} consultation estimates`);

  const invoices = await prisma.invoice.deleteMany({});
  console.log(`  Deleted ${invoices.count} invoices`);

  const leadDocs = await prisma.leadDocument.deleteMany({});
  console.log(`  Deleted ${leadDocs.count} lead documents`);

  const rules = await prisma.taskAutomationRule.deleteMany({});
  console.log(`  Deleted ${rules.count} task automation rules`);

  const projects = await prisma.project.deleteMany({});
  console.log(`  Deleted ${projects.count} projects`);

  const leads = await prisma.lead.deleteMany({});
  console.log(`  Deleted ${leads.count} leads`);

  const contacts = await prisma.contact.deleteMany({});
  console.log(`  Deleted ${contacts.count} contacts`);

  const companies = await prisma.company.deleteMany({});
  console.log(`  Deleted ${companies.count} companies`);

  console.log("\nDone! All data cleared.");
}

main()
  .catch((e) => { console.error("Error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
