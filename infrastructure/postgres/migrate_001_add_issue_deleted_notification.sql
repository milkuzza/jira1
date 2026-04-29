-- ============================================================
-- Migration 001: Add ISSUE_DELETED to notification_type enum
-- Run this against existing databases that were created before
-- this notification type was introduced.
--
-- Safe to run multiple times (uses DO $$ block with IF NOT EXISTS check).
-- ============================================================

DO $$
BEGIN
    -- Add the new enum value only if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'notification_type'
          AND e.enumlabel = 'ISSUE_DELETED'
    ) THEN
        ALTER TYPE notification_type ADD VALUE 'ISSUE_DELETED';
        RAISE NOTICE 'Added ISSUE_DELETED to notification_type enum.';
    ELSE
        RAISE NOTICE 'ISSUE_DELETED already exists in notification_type enum — skipped.';
    END IF;
END
$$;
