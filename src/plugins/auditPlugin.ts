/**
 * Audit Plugin for Payload CMS
 * Automatically wraps all collections with audit tracking hooks
 */

import type { Config, Plugin } from 'payload'
import {
  createBeforeChangeHook,
  createAfterChangeHook,
  createBeforeDeleteHook,
  type AuditConfig,
} from '../utils/auditCapture'

export interface AuditPluginOptions {
  /**
   * Collections to exclude from audit tracking
   * Default: ['audit-logs', 'payload-preferences', 'payload-migrations', 'payload-locked-documents', 'payload-kv']
   */
  excludeCollections?: string[]

  /**
   * Fields to exclude globally (e.g., passwords, tokens)
   * Default: ['password', 'salt', 'hash']
   */
  excludeFields?: string[]

  /**
   * Collections with custom field exclusions
   * Example: { 'users': ['passwordHash', 'resetToken'] }
   */
  collectionFieldExclusions?: Record<string, string[]>

  /**
   * Track only specific actions
   * Default: ['create', 'update', 'delete']
   */
  trackActions?: ('create' | 'update' | 'delete')[]

  /**
   * Retention: sliding window in days from latest change
   * Default: 90 days
   */
  windowDays?: number

  /**
   * Retention: minimum versions to keep (even if older than windowDays)
   * Default: 10
   */
  minVersions?: number

  /**
   * Retention: absolute maximum age in days (hard delete threshold)
   * Default: 365 days
   */
  maxDays?: number

  /**
   * Enable/disable the entire audit system
   * Default: true
   */
  enabled?: boolean
}

/**
 * Audit Plugin
 * Automatically injects audit hooks into all collections
 */
export const auditPlugin = (pluginOptions: AuditPluginOptions = {}): Plugin => {
  return (incomingConfig: Config): Config => {
    // Default configuration
    const options: Required<AuditPluginOptions> = {
      excludeCollections: [
        'audit-logs',
        'payload-preferences',
        'payload-migrations',
        'payload-locked-documents',
        'payload-kv',
        ...(pluginOptions.excludeCollections || []),
      ],
      excludeFields: ['password', 'salt', 'hash', ...(pluginOptions.excludeFields || [])],
      collectionFieldExclusions: pluginOptions.collectionFieldExclusions || {},
      trackActions: pluginOptions.trackActions || ['create', 'update', 'delete'],
      windowDays: pluginOptions.windowDays ?? 90,
      minVersions: pluginOptions.minVersions ?? 10,
      maxDays: pluginOptions.maxDays ?? 365,
      enabled: pluginOptions.enabled ?? true,
    }

    // If disabled, return config unchanged
    if (!options.enabled) {
      return incomingConfig
    }

    // Build audit config for hooks
    const auditConfig: AuditConfig = {
      excludeFields: options.excludeFields,
      excludeCollections: options.excludeCollections,
      trackActions: options.trackActions,
      windowDays: options.windowDays,
      minVersions: options.minVersions,
      maxDays: options.maxDays,
    }

    // Wrap all collections with audit hooks
    const wrappedCollections = (incomingConfig.collections || []).map((collection) => {
      // Skip excluded collections
      if (options.excludeCollections.includes(collection.slug)) {
        return collection
      }

      // Get collection-specific field exclusions
      const collectionExcludedFields = [
        ...options.excludeFields,
        ...(options.collectionFieldExclusions[collection.slug] || []),
      ]

      // Create hooks for this collection
      const beforeChangeHook = createBeforeChangeHook(
        collection.slug,
        collectionExcludedFields,
        auditConfig,
      )

      const afterChangeHook = createAfterChangeHook(
        collection.slug,
        collectionExcludedFields,
        auditConfig,
      )

      const beforeDeleteHook = options.trackActions.includes('delete')
        ? createBeforeDeleteHook(collection.slug, auditConfig)
        : undefined

      // Inject hooks into collection
      return {
        ...collection,
        hooks: {
          ...collection.hooks,
          beforeChange: [...(collection.hooks?.beforeChange || []), beforeChangeHook],
          afterChange: [...(collection.hooks?.afterChange || []), afterChangeHook],
          beforeDelete: beforeDeleteHook
            ? [...(collection.hooks?.beforeDelete || []), beforeDeleteHook]
            : collection.hooks?.beforeDelete,
        },
      }
    })

    return {
      ...incomingConfig,
      collections: wrappedCollections,
    }
  }
}

/**
 * Helper function to get audit plugin configuration
 * Useful for debugging or admin UI
 */
export function getAuditPluginInfo(options: AuditPluginOptions = {}): {
  enabled: boolean
  excludedCollections: string[]
  excludedFields: string[]
  trackedActions: string[]
  retentionPolicy: {
    windowDays: number
    minVersions: number
    maxDays: number
  }
} {
  const defaults: Required<AuditPluginOptions> = {
    excludeCollections: [
      'audit-logs',
      'payload-preferences',
      'payload-migrations',
      'payload-locked-documents',
      'payload-kv',
      ...(options.excludeCollections || []),
    ],
    excludeFields: ['password', 'salt', 'hash', ...(options.excludeFields || [])],
    collectionFieldExclusions: options.collectionFieldExclusions || {},
    trackActions: options.trackActions || ['create', 'update', 'delete'],
    windowDays: options.windowDays ?? 90,
    minVersions: options.minVersions ?? 10,
    maxDays: options.maxDays ?? 365,
    enabled: options.enabled ?? true,
  }

  return {
    enabled: defaults.enabled,
    excludedCollections: defaults.excludeCollections,
    excludedFields: defaults.excludeFields,
    trackedActions: defaults.trackActions,
    retentionPolicy: {
      windowDays: defaults.windowDays,
      minVersions: defaults.minVersions,
      maxDays: defaults.maxDays,
    },
  }
}
