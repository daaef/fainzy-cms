import type { CollectionConfig } from 'payload'
import { slugField } from '../fields/slug'
import { auditFields } from '../fields/auditFields'
import { auditHook } from '../hooks/auditHooks'

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'author', 'category', 'date'],
  },
  hooks: {
    beforeChange: [
      auditHook,
      async ({ data, req }) => {
        // Set author to current user if not specified
        if (!data?.author && req.user) {
          data.author = req.user.id
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    slugField('title'),
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: {
        description: 'Defaults to current user. Select another user to write on their behalf.',
      },
    },
    {
      name: 'category',
      type: 'text',
    },
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'body',
      type: 'richText',
    },
    {
      name: 'date',
      type: 'date',
    },
    {
      name: 'coverImage',
      type: 'relationship',
      relationTo: 'media',
    },
    {
      name: 'tags',
      type: 'array',
      fields: [
        { name: 'tag', type: 'text' },
      ],
    },
    ...auditFields(),
  ],
}
