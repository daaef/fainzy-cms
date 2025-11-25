/**
 * Audit Cleanup Utilities
 * Implements sliding window retention and cleanup strategies
 */

import type { Payload } from 'payload'
import type { AuditConfig } from './auditCapture'

export interface CleanupResult {
  deletedCount: number
  keptCount: number
  skippedSnapshots: number
  documentsProcessed: number
}

/**
 * Clean up old audit logs for a specific document using sliding window retention
 * This implements the hybrid strategy: windowDays + minVersions + preserveSnapshots
 */
export async function cleanupDocumentAuditLogs(
  payload: Payload,
  collection: string,
  documentId: string,
  config: AuditConfig,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedCount: 0,
    keptCount: 0,
    skippedSnapshots: 0,
    documentsProcessed: 1,
  }

  try {
    // Get all audit entries for this document, sorted by version (newest first)
    const auditEntries = await payload.find({
      collection: 'audit-logs',
      where: {
        and: [
          { collection: { equals: collection } },
          { documentId: { equals: documentId } },
        ],
      },
      sort: '-version',
      limit: 1000, // Process in batches
    })

    if (auditEntries.docs.length === 0) {
      return result
    }

    // Calculate cutoff date (windowDays from latest change)
    const latestEntry = auditEntries.docs[0]
    const latestDate = new Date(latestEntry.timestamp)
    const windowCutoff = new Date(latestDate)
    windowCutoff.setDate(windowCutoff.getDate() - (config.windowDays || 90))

    // Calculate absolute max age cutoff
    const now = new Date()
    const maxAgeCutoff = new Date(now)
    maxAgeCutoff.setDate(maxAgeCutoff.getDate() - (config.maxDays || 365))

    // Determine which entries to delete
    const toDelete: number[] = []

    for (let i = 0; i < auditEntries.docs.length; i++) {
      const entry = auditEntries.docs[i]
      const entryDate = new Date(entry.timestamp)

      // Always keep critical snapshots
      if (entry.isSnapshot) {
        result.skippedSnapshots++
        result.keptCount++
        continue
      }

      // Always keep minimum number of versions (most recent)
      if (i < (config.minVersions || 10)) {
        result.keptCount++
        continue
      }

      // Delete if older than absolute max age
      if (entryDate < maxAgeCutoff) {
        toDelete.push(entry.id)
        continue
      }

      // Delete if outside sliding window AND not in minVersions
      if (entryDate < windowCutoff) {
        toDelete.push(entry.id)
        continue
      }

      // Keep everything else
      result.keptCount++
    }

    // Delete old entries
    for (const id of toDelete) {
      await payload.delete({
        collection: 'audit-logs',
        id,
      })
      result.deletedCount++
    }
  } catch (error) {
    payload.logger.error(
      `Failed to cleanup audit logs for ${collection}/${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return result
}

/**
 * Clean up old audit logs across all documents
 * This is useful for background cleanup jobs
 */
export async function cleanupAllAuditLogs(
  payload: Payload,
  config: AuditConfig,
): Promise<CleanupResult> {
  const totalResult: CleanupResult = {
    deletedCount: 0,
    keptCount: 0,
    skippedSnapshots: 0,
    documentsProcessed: 0,
  }

  try {
    // Get unique collection/documentId combinations
    const uniqueDocs = await payload.find({
      collection: 'audit-logs',
      limit: 10000,
    })

    // Group by collection/documentId
    const docGroups = new Map<string, Set<string>>()

    for (const entry of uniqueDocs.docs) {
      if (!docGroups.has(entry.collection)) {
        docGroups.set(entry.collection, new Set())
      }
      docGroups.get(entry.collection)?.add(entry.documentId)
    }

    // Clean up each document's audit logs
    for (const [collection, documentIds] of docGroups.entries()) {
      for (const documentId of documentIds) {
        const result = await cleanupDocumentAuditLogs(payload, collection, documentId, config)
        totalResult.deletedCount += result.deletedCount
        totalResult.keptCount += result.keptCount
        totalResult.skippedSnapshots += result.skippedSnapshots
        totalResult.documentsProcessed++
      }
    }
  } catch (error) {
    payload.logger.error(
      `Failed to cleanup all audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return totalResult
}

/**
 * Get cleanup statistics without actually deleting anything
 * Useful for previewing cleanup impact
 */
export async function getCleanupPreview(
  payload: Payload,
  collection: string,
  documentId: string,
  config: AuditConfig,
): Promise<CleanupResult> {
  const result: CleanupResult = {
    deletedCount: 0,
    keptCount: 0,
    skippedSnapshots: 0,
    documentsProcessed: 1,
  }

  try {
    const auditEntries = await payload.find({
      collection: 'audit-logs',
      where: {
        and: [
          { collection: { equals: collection } },
          { documentId: { equals: documentId } },
        ],
      },
      sort: '-version',
      limit: 1000,
    })

    if (auditEntries.docs.length === 0) {
      return result
    }

    const latestEntry = auditEntries.docs[0]
    const latestDate = new Date(latestEntry.timestamp)
    const windowCutoff = new Date(latestDate)
    windowCutoff.setDate(windowCutoff.getDate() - (config.windowDays || 90))

    const now = new Date()
    const maxAgeCutoff = new Date(now)
    maxAgeCutoff.setDate(maxAgeCutoff.getDate() - (config.maxDays || 365))

    for (let i = 0; i < auditEntries.docs.length; i++) {
      const entry = auditEntries.docs[i]
      const entryDate = new Date(entry.timestamp)

      if (entry.isSnapshot) {
        result.skippedSnapshots++
        result.keptCount++
        continue
      }

      if (i < (config.minVersions || 10)) {
        result.keptCount++
        continue
      }

      if (entryDate < maxAgeCutoff || entryDate < windowCutoff) {
        result.deletedCount++
        continue
      }

      result.keptCount++
    }
  } catch (error) {
    payload.logger.error(
      `Failed to preview cleanup for ${collection}/${documentId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    )
  }

  return result
}
