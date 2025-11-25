import type { CollectionConfig } from 'payload'
import { slugField } from '../fields/slug'
import { auditFields } from '../fields/auditFields'
import { auditHook } from '../hooks/auditHooks'

export const CustomSolutions: CollectionConfig = {
  slug: 'custom-solutions',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'slug'],
  },
  hooks: {
    beforeChange: [auditHook],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField('title'),
    { name: 'description', type: 'textarea' },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'subtitle', type: 'text' },
        { name: 'iconKey', type: 'text' },
      ],
    },
    { name: 'category', type: 'text' },
    { name: 'price', type: 'text' },
    { name: 'available', type: 'checkbox', defaultValue: true },
    ...auditFields(),
  ],
}
