import type { CollectionConfig } from 'payload'
import { auditFields } from '../fields/auditFields'
import { auditHook } from '../hooks/auditHooks'

export const FAQs: CollectionConfig = {
  slug: 'faqs',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'question',
    defaultColumns: ['question', 'locale', 'order'],
  },
  hooks: {
    beforeChange: [auditHook],
  },
  fields: [
    { name: 'question', type: 'text', required: true },
    { name: 'answer', type: 'textarea', required: true },
    { name: 'locale', type: 'select', options: ['en', 'ja'], defaultValue: 'en' },
    { name: 'category', type: 'text' },
    { name: 'order', type: 'number' },
    ...auditFields(),
  ],
}
