-- Fix NULL author_id values in blog_posts
-- First, get the first user ID to use as a default
DO $$
DECLARE
    default_user_id INTEGER;
BEGIN
    -- Get the first user's ID
    SELECT id INTO default_user_id FROM users LIMIT 1;

    -- Update all NULL author_id values to the default user
    IF default_user_id IS NOT NULL THEN
        UPDATE blog_posts
        SET author_id = default_user_id
        WHERE author_id IS NULL;
    END IF;
END $$;
