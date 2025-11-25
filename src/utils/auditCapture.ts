/**
 * Audit Capture Utilities
 * Creates Payload hooks for automatic audit trail capture
 */

import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
} from 'payload'
import { calculateDiff, type FieldChange } from './diffCalculator'
import { cleanupDocumentAuditLogs } from './auditCleanup'

export interface AuditConfig {
  excludeFields: string[]
  excludeCollections: string[]
  trackActions: ('create' | 'update' | 'delete')[]
  windowDays?: number
  minVersions?: number
  maxDays?: number
}

/**
 * Key to store original document in request context
 */
const AUDIT_SNAPSHOT_KEY = '__auditSnapshot__' as const

/**
 * Create beforeChange hook to capture "before" snapshot
 */
export function createBeforeChangeHook(
  collectionSlug: string,
  excludeFields: string[],
  config: AuditConfig,
): CollectionBeforeChangeHook {
  return async ({ req, operation, data }) => {
    // Skip if this is the audit-logs collection itself
    if (collectionSlug === 'audit-logs') return data

    // Skip if not tracking this action
    const action = operation === 'create' ? 'create' : 'update'
    if (!config.trackActions.includes(action)) return data

    // For updates, fetch the original document to compare later
    if (operation === 'update' && req.context) {
      try {
        const originalId = 'id' in data ? data.id : req.context.id
        if (originalId) {
          const original = await req.payload.findByID({
            collection: collectionSlug as any,
            id: originalId,
            req,
          })

          // Store original in request context for afterChange hook
          if (!req.context[AUDIT_SNAPSHOT_KEY]) {
            req.context[AUDIT_SNAPSHOT_KEY] = {}
          }
          ;(req.context[AUDIT_SNAPSHOT_KEY] as any)[collectionSlug] = original
        }
      } catch (error) {
        // If we can't fetch original, log warning but continue
        req.payload.logger.warn(
          `Failed to fetch original document for audit: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return data
  }
}

/**
 * Create afterChange hook to calculate diff and save audit entry
 */
export function createAfterChangeHook(
  collectionSlug: string,
  excludeFields: string[],
  config: AuditConfig,
): CollectionAfterChangeHook {
  return async ({ req, doc, operation, previousDoc }) => {
    // Skip if this is the audit-logs collection itself
    if (collectionSlug === 'audit-logs') return doc

    // Skip if not tracking this action
    const action = operation === 'create' ? 'create' : 'update'
    if (!config.trackActions.includes(action)) return doc

    try {
      // Get the "before" snapshot
      let originalDoc = previousDoc
      const auditContext = req.context?.[AUDIT_SNAPSHOT_KEY] as any
      if (!originalDoc && auditContext?.[collectionSlug]) {
        originalDoc = auditContext[collectionSlug]
      }

      // Calculate changes
      const changes: FieldChange[] = calculateDiff(
        originalDoc || null,
        doc,
        excludeFields,
      )

      // Skip if no meaningful changes detected
      if (changes.length === 0 && operation === 'update') {
        return doc
      }

      // Get user information
      const userId = req.user?.id as number | undefined
      const userName = req.user?.email || 'System'

      // Get client information
      const ip = getClientIp(req)
      const userAgent = (req.headers as any)?.['user-agent'] || 'Unknown'

      // Get the latest version number for this document
      const latestAudit = await req.payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: collectionSlug } },
            { documentId: { equals: String(doc.id) } },
          ],
        },
        sort: '-version',
        limit: 1,
      })

      const version = latestAudit.docs.length > 0 ? latestAudit.docs[0].version + 1 : 1

      // Determine if this is a critical snapshot
      const isSnapshot = isСriticalSnapshot(doc, originalDoc, changes)

      // Create audit entry
      await req.payload.create({
        collection: 'audit-logs',
        data: {
          collection: collectionSlug,
          documentId: String(doc.id),
          action,
          userId,
          userName,
          timestamp: new Date().toISOString(),
          changes,
          ip,
          userAgent,
          version,
          isSnapshot,
        },
        req,
      })

      // Cleanup old audit logs (on-write strategy)
      // Run in background to not block the response
      setImmediate(async () => {
        try {
          await cleanupDocumentAuditLogs(req.payload, collectionSlug, String(doc.id), config)
        } catch (cleanupError) {
          req.payload.logger.warn(
            `Failed to cleanup audit logs: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown error'}`,
          )
        }
      })
    } catch (error) {
      // Log error but don't fail the original operation
      req.payload.logger.error(
        `Failed to create audit entry: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }

    return doc
  }
}

/**
 * Create beforeDelete hook to capture deletion audit
 */
export function createBeforeDeleteHook(
  collectionSlug: string,
  config: AuditConfig,
): CollectionBeforeDeleteHook {
  return async ({ req, id }) => {
    // Skip if this is the audit-logs collection itself
    if (collectionSlug === 'audit-logs') return

    // Skip if not tracking deletions
    if (!config.trackActions.includes('delete')) return

    try {
      // Fetch the document before deletion to capture final state
      const doc = await req.payload.findByID({
        collection: collectionSlug as any,
        id,
        req,
      })

      // Calculate "changes" (all fields going from current value to null)
      const changes: FieldChange[] = calculateDiff(doc, null, config.excludeFields)

      // Get user information
      const userId = req.user?.id as number | undefined
      const userName = req.user?.email || 'System'

      // Get client information
      const ip = getClientIp(req)
      const userAgent = (req.headers as any)?.['user-agent'] || 'Unknown'

      // Get the latest version number for this document
      const latestAudit = await req.payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: collectionSlug } },
            { documentId: { equals: String(id) } },
          ],
        },
        sort: '-version',
        limit: 1,
      })

      const version = latestAudit.docs.length > 0 ? latestAudit.docs[0].version + 1 : 1

      // Create audit entry for deletion
      await req.payload.create({
        collection: 'audit-logs',
        data: {
          collection: collectionSlug,
          documentId: String(id),
          action: 'delete',
          userId,
          userName,
          timestamp: new Date().toISOString(),
          changes,
          ip,
          userAgent,
          version,
          isSnapshot: true, // Deletions are always critical snapshots
        },
        req,
      })
    } catch (error) {
      // Log error but don't fail the deletion
      req.payload.logger.error(
        `Failed to create audit entry for deletion: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
}

/**
 * Extract client IP from request
 */
function getClientIp(req: any): string {
  // Check common headers for proxy/load balancer scenarios
  const forwarded = (req.headers as any)?.['x-forwarded-for']
  if (forwarded) {
    const ips = forwarded.split(',')
    return ips[0].trim()
  }

  const realIp = (req.headers as any)?.['x-real-ip']
  if (realIp) return realIp

  // Fallback to connection remote address
  return req.connection?.remoteAddress || req.socket?.remoteAddress || 'Unknown'
}

/**
 * Determine if this change represents a critical snapshot to preserve
 */
function isСriticalSnapshot(
  newDoc: Record<string, any>,
  oldDoc: Record<string, any> | null | undefined,
  changes: FieldChange[],
): boolean {
  // Check if status changed to "published" or similar critical states
  const statusChange = changes.find((c) => c.field === 'status')
  if (statusChange && statusChange.newValue === 'published') {
    return true
  }

  // First version (creation) could be considered a snapshot
  if (!oldDoc) {
    return true
  }

  // Add more criteria as needed based on your domain logic
  // For example:
  // - Major version increments (if you have version fields)
  // - Critical field changes (price, availability, etc.)

  return false
}
