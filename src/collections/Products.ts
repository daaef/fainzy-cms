import type { CollectionConfig } from 'payload'
import { slugField } from '../fields/slug'

export const Products: CollectionConfig = {
  slug: 'products',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField('name'),
    { name: 'subtitle', type: 'text' },
    { name: 'heroImage', type: 'relationship', relationTo: 'media' },
    {
      name: 'gallery',
      type: 'array',
      fields: [{ name: 'image', type: 'relationship', relationTo: 'media' }],
    },
    {
      name: 'features',
      type: 'array',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'subtitle', type: 'text' },
        { name: 'iconKey', type: 'text' },
      ],
    },
    { name: 'overview', type: 'richText' },
    { name: 'specs', type: 'json' },
    { name: 'price', type: 'text' },
  ],
}
