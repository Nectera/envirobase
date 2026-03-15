-- ============================================================================
-- Multi-Tenancy Backfill — EnviroBase SaaS Only
-- Run on the EnviroBase database AFTER `prisma db push`.
-- Xtract's database is completely separate and untouched.
-- ============================================================================

-- Create the EnviroBase demo organization
INSERT INTO organizations (
  id, slug, name, status,
  "appName", "companyName", "companyShort",
  "brandColor", "supportEmail", "companyLocation",
  domain, plan, "maxUsers", "maxWorkers", features,
  "createdAt", "updatedAt"
) VALUES (
  'org-envirobase-demo',
  'envirobase-demo',
  'EnviroBase Demo',
  'active',
  'EnviroBase',
  'EnviroBase Environmental Services',
  'EnviroBase',
  '#2D5A42',
  'hello@envirobase.app',
  'Denver, CO',
  'envirobase.app',
  'pro',
  25,
  50,
  '{"crm":true,"metrics":true,"chat":true,"pipeline":true,"projects":true,"scheduling":true,"timeClock":true,"compliance":true,"bonusPool":false,"contentInventory":true,"reviewRequests":true,"knowledgeBase":true,"aiAssistant":true}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Assign the demo user(s) and demo seed data to the EnviroBase org
UPDATE users SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE workers SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE companies SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE leads SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE consultation_estimates SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE projects SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE estimates SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE invoices SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE contacts SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE tasks SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE task_automation_rules SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE task_templates SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE metrics SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE alerts SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE notifications SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE chat_channels SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE calendar_events SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE company_info SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE company_licenses SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE integration_auth SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE knowledge_base SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE assistant_conversations SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE assistant_memory SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE bonus_periods SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE incidents SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE activities SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
UPDATE settings SET "organizationId" = 'org-envirobase-demo' WHERE "organizationId" IS NULL;
