import type { CollectionConfig } from 'payload'

export const Jobs: CollectionConfig = {
  slug: 'jobs',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'location', 'type', 'status'],
  },
  fields: [
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'title', type: 'text', required: true },
    { name: 'location', type: 'text' },
    { name: 'type', type: 'select', options: ['Full time', 'Part time', 'Contract', 'Intern'] },
    { name: 'salaryRange', type: 'text' },
    { name: 'description', type: 'richText' },
    {
      name: 'responsibilities',
      type: 'array',
      fields: [{ name: 'item', type: 'textarea' }],
    },
    {
      name: 'requirements',
      type: 'array',
      fields: [{ name: 'item', type: 'textarea' }],
    },
    {
      name: 'qualifications',
      type: 'array',
      fields: [{ name: 'item', type: 'textarea' }],
    },
    {
      name: 'benefits',
      type: 'array',
      fields: [{ name: 'item', type: 'textarea' }],
    },
    { name: 'techStack', type: 'array', fields: [{ name: 'tech', type: 'text' }] },
    { name: 'image', type: 'relationship', relationTo: 'media' },
    { name: 'applyBefore', type: 'date' },
    { name: 'status', type: 'select', options: ['open', 'closed'], defaultValue: 'open' },
    { name: 'date', type: 'date' },
  ],
}
