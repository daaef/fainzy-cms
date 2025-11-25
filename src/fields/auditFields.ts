import type { Field } from 'payload'

/**
 * Creates audit tracking fields for created_by and updated_by
 * @returns Array of audit fields (created_by, updated_by)
 */
export const auditFields = (): Field[] => [
  {
    name: 'created_by',
    type: 'relationship',
    relationTo: 'users',
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: 'User who created this record',
    },
  },
  {
    name: 'updated_by',
    type: 'relationship',
    relationTo: 'users',
    admin: {
      position: 'sidebar',
      readOnly: true,
      description: 'User who last updated this record',
    },
  },
]
