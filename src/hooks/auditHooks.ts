import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Hook to automatically set created_by and updated_by fields
 * - Sets created_by to current user on creation
 * - Sets updated_by to current user on every update
 */
export const auditHook: CollectionBeforeChangeHook = async ({ data, req, operation }) => {
  if (req.user) {
    // Set created_by only on creation
    if (operation === 'create') {
      data.created_by = req.user.id
    }

    // Set updated_by on both create and update
    data.updated_by = req.user.id
  }

  return data
}
