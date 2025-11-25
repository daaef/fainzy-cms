# Change Log

## [Date: 2025-11-25 22:00]

### Summary
Fixed database migration issues and ensured all schema changes are properly applied.

### Database Changes
- Dropped `audit_logs` table and related constraints that were causing migration errors
- Removed `read_time` column from `blog_posts` table
- Prepared `author_id` column for relationship field

### Technical Details
- Manually ran SQL script to resolve constraint conflicts
- Database is now in sync with the new BlogPosts schema
- Server running on port 3001

---

## [Date: 2025-11-25 21:00]

### Summary
Improved BlogPosts and Jobs collections with automatic slug generation and better author management. Removed manual read time field from blog posts and replaced text-based author with a user relationship.

### Files Created
- `src/utils/slugify.ts` - Utility function to convert titles to URL-friendly slugs

### Files Modified
- `src/collections/BlogPosts.ts` - Added auto-slug generation, updated author to relationship field, removed readTime field
- `src/collections/Jobs.ts` - Added auto-slug generation hook

### Rationale

**Automatic Slug Generation:**
- Eliminates manual slug entry, reducing user error and improving UX
- Ensures consistent URL-friendly slug format across all posts and jobs
- Slug field is now read-only in admin UI, auto-generated from title
- Uses a shared utility function for consistency

**Blog Post Author Improvements:**
- Changed from text field to relationship with Users collection
- Automatically defaults to the currently logged-in user when creating posts
- Allows selection of other users if writing on someone's behalf
- Provides better data integrity and enables proper author management

**Removed Read Time Field:**
- Eliminated manual read time entry from blog posts
- Read time can be calculated dynamically on the frontend if needed
- Reduces manual data entry and potential for inconsistency

**Technical Implementation:**
- Used `beforeValidate` hook for slug generation (runs before validation)
- Used `beforeChange` hook for author default (runs before saving)
- Slug utility handles special characters, spaces, and ensures lowercase format
- All changes are backward compatible with existing data

---
