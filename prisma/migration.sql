-- Customer Portal Notification Preferences
-- Add 4 new boolean columns to notification_preferences table
-- All default to true (enabled by default)

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "portalStatusChange" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "portalDocumentUpload" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "portalEstimateUpdate" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE notification_preferences
  ADD COLUMN IF NOT EXISTS "portalMessage" BOOLEAN NOT NULL DEFAULT true;
