import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect, afterEach } from 'vitest'

let payload: Payload

describe('Audit Plugin Integration', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  }, 15000)

  // afterEach cleanup disabled for test stability - cleanup happens at test end
  // Tests use unique slugs with timestamps to avoid conflicts

  describe('Automatic Audit Trail', () => {
    it('should automatically create audit entry when document is created', async () => {
      // Create a blog post - audit should be automatic
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: `test-plugin-create-${Date.now()}`,
          title: 'Test Plugin Create',
          category: 'testing',
        },
      })

      // Wait a moment for hook to complete
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check audit log was automatically created
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
            { action: { equals: 'create' } },
          ],
        },
      })

      expect(auditLogs.docs).toHaveLength(1)
      expect(auditLogs.docs[0]).toMatchObject({
        collection: 'blog-posts',
        documentId: String(blogPost.id),
        action: 'create',
        version: 1,
      })
    })

    it(
      'should automatically create audit entry when document is updated',
      async () => {
      // Create a blog post
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: `test-plugin-update-${Date.now()}`,
          title: 'Original Title',
          category: 'testing',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Update the blog post
      await payload.update({
        collection: 'blog-posts',
        id: blogPost.id,
        data: {
          title: 'Updated Title',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check both create and update audit entries exist
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
          ],
        },
        sort: 'version',
      })

      expect(auditLogs.docs.length).toBeGreaterThanOrEqual(2)
      expect(auditLogs.docs[0].action).toBe('create')
      expect(auditLogs.docs[1].action).toBe('update')
      expect(auditLogs.docs[1].version).toBe(2)

      // Verify changes were captured
      const updateAudit = auditLogs.docs[1]
      expect(Array.isArray(updateAudit.changes)).toBe(true)
      if (Array.isArray(updateAudit.changes)) {
        const titleChange = updateAudit.changes.find((c: any) => c.field === 'title')
        expect(titleChange).toBeDefined()
        if (titleChange) {
          expect(titleChange.oldValue).toBe('Original Title')
          expect(titleChange.newValue).toBe('Updated Title')
        }
      }
      },
      15000,
    )

    it(
      'should automatically create audit entry when document is deleted',
      async () => {
      // Create a blog post
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: `test-plugin-delete-${Date.now()}`,
          title: 'To Be Deleted',
          category: 'testing',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Delete the blog post
      await payload.delete({
        collection: 'blog-posts',
        id: blogPost.id,
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check delete audit entry exists
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
            { action: { equals: 'delete' } },
          ],
        },
      })

      expect(auditLogs.docs.length).toBeGreaterThanOrEqual(1)
      const deleteAudit = auditLogs.docs.find((log) => log.action === 'delete')
      expect(deleteAudit).toBeDefined()
      expect(deleteAudit?.isSnapshot).toBe(true)
      },
      15000,
    )
  })

  describe('Multiple Collections', () => {
    it(
      'should track changes across different collections',
      async () => {
      // Create documents in different collections
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: `test-multi-blog-${Date.now()}`,
          title: 'Multi Collection Test',
          category: 'testing',
        },
      })

      const stat = await payload.create({
        collection: 'stats',
        data: {
          label: 'Test Stat',
          value: '100',
          iconKey: 'chart',
          type: 'static',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check audit logs for both collections
      const blogAudit = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
          ],
        },
      })

      const statAudit = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'stats' } },
            { documentId: { equals: String(stat.id) } },
          ],
        },
      })

      expect(blogAudit.docs).toHaveLength(1)
      expect(statAudit.docs).toHaveLength(1)
      expect(blogAudit.docs[0].collection).toBe('blog-posts')
      expect(statAudit.docs[0].collection).toBe('stats')
      },
      15000,
    )
  })

  describe('Version Tracking', () => {
    it(
      'should increment version numbers correctly',
      async () => {
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: `test-version-${Date.now()}`,
          title: 'Version Test',
          category: 'testing',
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Make multiple updates
      for (let i = 1; i <= 3; i++) {
        await payload.update({
          collection: 'blog-posts',
          id: blogPost.id,
          data: {
            title: `Version Test - Update ${i}`,
          },
        })
        await new Promise((resolve) => setTimeout(resolve, 1500))
      }

      // Check version numbers
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
          ],
        },
        sort: 'version',
      })

      expect(auditLogs.docs.length).toBeGreaterThanOrEqual(4) // 1 create + 3 updates
      expect(auditLogs.docs[0].version).toBe(1)
      expect(auditLogs.docs[1].version).toBe(2)
      expect(auditLogs.docs[2].version).toBe(3)
      expect(auditLogs.docs[3].version).toBe(4)
      },
      20000,
    )
  })

  describe('Excluded Collections', () => {
    it(
      'should not create audit entries for audit-logs collection',
      async () => {
      // Try to create an audit log directly (should not create another audit entry)
      const directAudit = await payload.create({
        collection: 'audit-logs',
        data: {
          collection: 'test',
          documentId: '123',
          action: 'create',
          timestamp: new Date().toISOString(),
          version: 1,
          isSnapshot: false,
        },
      })

      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Check that no audit entry was created for this audit-logs document
      const auditOfAudit = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'audit-logs' } },
            { documentId: { equals: String(directAudit.id) } },
          ],
        },
      })

      expect(auditOfAudit.docs).toHaveLength(0)

      // Clean up
      await payload.delete({
        collection: 'audit-logs',
        id: directAudit.id,
      })
      },
      10000,
    )
  })
})
