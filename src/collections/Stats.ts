import type { CollectionConfig } from 'payload'

export const Stats: CollectionConfig = {
  slug: 'stats',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'value', 'type'],
  },
  fields: [
    { name: 'label', type: 'text', required: true },
    { name: 'value', type: 'text', required: true },
    { name: 'iconKey', type: 'text' },
    { name: 'type', type: 'select', options: ['animated', 'static'], required: true },
  ],
}
