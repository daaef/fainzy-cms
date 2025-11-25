import type { Config, Plugin } from 'payload'
import { auditFields } from '../fields/auditFields'
import { auditHook } from '../hooks/auditHooks'

/**
 * Audit Plugin - Automatically adds audit tracking to all collections
 * Adds created_by, updated_by fields and hooks to track user changes
 *
 * Collections to exclude: Users, Media (or any specified in options)
 */
export const auditPlugin =
  (options?: { exclude?: string[] }): Plugin =>
  (incomingConfig: Config): Config => {
    const excludedCollections = options?.exclude || ['users', 'media']

    // Map through all collections and add audit fields + hooks
    const collectionsWithAudit = incomingConfig.collections?.map((collection) => {
      // Skip excluded collections
      if (excludedCollections.includes(collection.slug)) {
        return collection
      }

      return {
        ...collection,
        fields: [...(collection.fields || []), ...auditFields()],
        hooks: {
          ...collection.hooks,
          beforeChange: [
            ...(collection.hooks?.beforeChange || []),
            auditHook,
          ],
        },
      }
    })

    return {
      ...incomingConfig,
      collections: collectionsWithAudit,
    }
  }
