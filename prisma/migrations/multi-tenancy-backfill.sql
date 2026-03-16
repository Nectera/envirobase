-- ============================================================================
-- Multi-Tenancy Backfill Migration
-- Assigns all existing data to the default "Xtract" organization.
-- Run AFTER `prisma migrate dev` has created the new columns.
-- ============================================================================

-- 1. Create the default Xtract organization
INSERT INTO organizations (
  id, slug, name, status,
  "appName", "companyName", "companyShort",
  "brandColor", "supportEmail", "companyLocation",
  domain, plan, "maxUsers", "maxWorkers", features,
  "createdAt", "updatedAt"
) VALUES (
  'org-xtract-default',
  'xtract',
  'Xtract Environmental Services',
  'active',
  'Xtract',
  'Xtract Environmental Services',
  'Xtract Environmental',
  '#7BC143',
  'info@xtractes.com',
  'Fort Collins, CO',
  'xtract.team',
  'enterprise',
  100,
  200,
  '{"crm":true,"metrics":true,"chat":true,"pipeline":true,"projects":true,"scheduling":true,"timeClock":true,"compliance":true,"bonusPool":true,"contentInventory":true,"reviewRequests":true,"knowledgeBase":true,"aiAssistant":true}',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Assign all existing records to the Xtract org
UPDATE users SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE workers SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE projects SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE companies SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE contacts SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE leads SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE estimates SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE consultation_estimates SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE invoices SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE tasks SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE task_automation_rules SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE task_templates SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE metrics SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE alerts SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE notifications SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE chat_channels SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE calendar_events SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE company_info SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE company_licenses SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE integration_auth SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE knowledge_base SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE assistant_conversations SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE assistant_memory SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE bonus_periods SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE incidents SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;
UPDATE activities SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;

-- 3. Handle settings table migration (key was previously @id, now id+key+orgId)
-- Settings that don't have an organizationId yet get assigned to Xtract
UPDATE settings SET "organizationId" = 'org-xtract-default' WHERE "organizationId" IS NULL;

-- 4. Create EnviroBase demo organization
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

-- Done! All existing data now belongs to the Xtract org.
-- The EnviroBase demo org is ready for demo data association.
