-- Fix database constraint issues
-- Drop the problematic constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'payload_locked_documents_rels_audit_logs_fk'
    ) THEN
        ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_logs_fk";
    END IF;
END $$;

-- Drop audit_logs table if it exists (it will be recreated if needed)
DROP TABLE IF EXISTS "audit_logs" CASCADE;

-- Remove read_time column from blog_posts if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'blog_posts' AND column_name = 'read_time'
    ) THEN
        ALTER TABLE "blog_posts" DROP COLUMN "read_time";
    END IF;
END $$;

-- Rename author to author_id if author exists and author_id doesn't
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'blog_posts' AND column_name = 'author'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'blog_posts' AND column_name = 'author_id'
    ) THEN
        ALTER TABLE "blog_posts" RENAME COLUMN "author" TO "author_id";
    END IF;
END $$;

-- Update author_id column type to integer if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'blog_posts' AND column_name = 'author_id'
    ) THEN
        -- First, try to convert existing text values to NULL or handle them
        UPDATE "blog_posts" SET "author_id" = NULL WHERE "author_id" IS NOT NULL;

        -- Change column type to integer
        ALTER TABLE "blog_posts" ALTER COLUMN "author_id" TYPE INTEGER USING NULL;
    END IF;
END $$;
