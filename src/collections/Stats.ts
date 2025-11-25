import type { CollectionConfig } from 'payload'
import { auditFields } from '../fields/auditFields'
import { auditHook } from '../hooks/auditHooks'

export const Stats: CollectionConfig = {
  slug: 'stats',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value', 'type'],
  },
  hooks: {
    beforeChange: [auditHook],
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'value', type: 'text', required: true },
    { name: 'iconKey', type: 'text' },
    { name: 'type', type: 'select', options: ['animated', 'static'], required: true },
    ...auditFields(),
  ],
}
