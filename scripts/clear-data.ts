import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all company, contact, lead, and project data...\n");

  // 1. Delete activities (references leads, projects, contacts, companies)
  const activities = await prisma.activity.deleteMany({});
  console.log(`  Deleted ${activities.count} activities`);

  // 2. Delete tasks (may reference leads/projects)
  const tasks = await prisma.task.deleteMany({});
  console.log(`  Deleted ${tasks.count} tasks`);

  // 3. Delete consultation estimates (references leads, contacts, companies)
  const estimates = await prisma.consultationEstimate.deleteMany({});
  console.log(`  Deleted ${estimates.count} consultation estimates`);

  // 4. Delete invoices (references projects)
  const invoices = await prisma.invoice.deleteMany({});
  console.log(`  Deleted ${invoices.count} invoices`);

  // 5. Delete lead documents (cascade from leads, but clear first)
  const leadDocs = await prisma.leadDocument.deleteMany({});
  console.log(`  Deleted ${leadDocs.count} lead documents`);

  // 6. Delete task automation rules
  const rules = await prisma.taskAutomationRule.deleteMany({});
  console.log(`  Deleted ${rules.count} task automation rules`);

  // 7. Delete projects (cascades: projectTasks, projectWorkers, alerts, complianceChecks,
  //    documents, dailyFieldReports, timeEntries, psiJhaSpas, preAbatementInspections,
  //    certificatesOfCompletion, respiratorFitTests, postProjectInspections,
  //    scheduleEntries, incidents)
  const projects = await prisma.project.deleteMany({});
  console.log(`  Deleted ${projects.count} projects`);

  // 8. Delete leads
  const leads = await prisma.lead.deleteMany({});
  console.log(`  Deleted ${leads.count} leads`);

  // 9. Delete contacts
  const contacts = await prisma.contact.deleteMany({});
  console.log(`  Deleted ${contacts.count} contacts`);

  // 10. Delete companies
  const companies = await prisma.company.deleteMany({});
  console.log(`  Deleted ${companies.count} companies`);

  console.log("\nDone! All company, contact, lead, and project data has been cleared.");
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
