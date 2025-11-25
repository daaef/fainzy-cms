import type { Field } from 'payload'
import { slugify } from '../utils/slugify'

/**
 * Creates a slug field that auto-generates from a specified field (usually 'title' or 'name')
 * @param fieldToSlugify - The field name to generate the slug from (default: 'title')
 * @param overrides - Optional field overrides
 * @returns A configured slug field
 */
export const slugField = (
  fieldToSlugify = 'title',
  overrides?: Partial<Field>
): Field => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: `Auto-generated from ${fieldToSlugify} when you save.`,
  },
  hooks: {
    beforeValidate: [
      async ({ value, data }) => {
        if (data?.[fieldToSlugify]) {
          return slugify(data[fieldToSlugify])
        }
        return value
      },
    ],
  },
  ...overrides,
})
