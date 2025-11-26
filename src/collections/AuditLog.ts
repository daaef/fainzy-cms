import type { CollectionConfig } from 'payload'

export const AuditLog: CollectionConfig = {
  slug: 'audit-logs',
  access: {
    // Only authenticated users can read audit logs
    read: ({ req: { user } }) => {
      if (!user) return false
      // TODO: Add role-based access control (e.g., only admins)
      return true
    },
    // Prevent manual creation/updates/deletion of audit logs
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: {
    useAsTitle: 'collection',
    defaultColumns: ['collection', 'documentId', 'action', 'userName', 'timestamp'],
    description: 'Automatic audit trail of all document changes (read-only)',
  },
  fields: [
    {
      name: 'collection',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'The collection that was modified (e.g., "blog-posts")',
      },
    },
    {
      name: 'documentId',
      type: 'text',
      required: true,
      index: true,
      admin: {
        description: 'The ID of the document that was modified',
      },
    },
    {
      name: 'action',
      type: 'select',
      required: true,
      options: [
        { label: 'Create', value: 'create' },
        { label: 'Update', value: 'update' },
        { label: 'Delete', value: 'delete' },
      ],
      index: true,
      admin: {
        description: 'The type of operation performed',
      },
    },
    {
      name: 'userId',
      type: 'number',
      index: true,
      admin: {
        description: 'ID of the user who made the change',
      },
    },
    {
      name: 'userName',
      type: 'text',
      admin: {
        description: 'Cached email/name of user (for performance)',
      },
    },
    {
      name: 'timestamp',
      type: 'date',
      required: true,
      index: true,
      admin: {
        description: 'When the change occurred',
        date: {
          displayFormat: 'yyyy-MM-dd HH:mm:ss',
        },
      },
    },
    {
      name: 'changes',
      type: 'json',
      admin: {
        description: 'Field-level changes: { field, oldValue, newValue, path }[]',
      },
    },
    {
      name: 'changeReason',
      type: 'textarea',
      admin: {
        description: 'Optional: Why was this change made?',
      },
    },
    {
      name: 'ip',
      type: 'text',
      admin: {
        description: 'Client IP address',
      },
    },
    {
      name: 'userAgent',
      type: 'text',
      admin: {
        description: 'Browser/client information',
      },
    },
    {
      name: 'version',
      type: 'number',
      required: true,
      index: true,
      admin: {
        description: 'Auto-incrementing version number for this document',
      },
    },
    {
      name: 'isSnapshot',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        description: 'Critical snapshot to preserve (e.g., published version)',
      },
    },
  ],
  timestamps: true,
}
