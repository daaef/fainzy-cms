import type { CollectionConfig } from 'payload'

export const CustomSolutions: CollectionConfig = {
  slug: 'custom-solutions',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'slug'],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
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
  ],
}
