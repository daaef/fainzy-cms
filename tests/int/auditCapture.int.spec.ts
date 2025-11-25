import { getPayload, Payload } from 'payload'
import config from '@/payload.config'
import { describe, it, beforeAll, expect, beforeEach } from 'vitest'
import {
  createBeforeChangeHook,
  createAfterChangeHook,
  createBeforeDeleteHook,
  type AuditConfig,
} from '../../src/utils/auditCapture'

let payload: Payload

const testConfig: AuditConfig = {
  excludeFields: ['password'],
  excludeCollections: ['audit-logs'],
  trackActions: ['create', 'update', 'delete'],
  windowDays: 90,
  minVersions: 10,
}

describe('Audit Capture', () => {
  beforeAll(async () => {
    const payloadConfig = await config
    payload = await getPayload({ config: payloadConfig })
  }, 15000)

  beforeEach(async () => {
    // Clean up audit logs before each test
    const auditLogs = await payload.find({
      collection: 'audit-logs',
      limit: 1000,
    })
    for (const log of auditLogs.docs) {
      await payload.delete({
        collection: 'audit-logs',
        id: log.id,
      })
    }
  })

  describe('createBeforeChangeHook', () => {
    it('should return data unchanged', async () => {
      const hook = createBeforeChangeHook('blog-posts', ['password'], testConfig)

      const mockReq = {
        payload,
        context: {},
        user: { id: 1, email: 'test@example.com' },
      } as any

      const data = { title: 'Test Post' }
      const result = await hook({
        req: mockReq,
        operation: 'create',
        data,
      } as any)

      expect(result).toEqual(data)
    })

    it('should skip audit-logs collection', async () => {
      const hook = createBeforeChangeHook('audit-logs', [], testConfig)

      const mockReq = {
        payload,
        context: {},
      } as any

      const data = { collection: 'test' }
      const result = await hook({
        req: mockReq,
        operation: 'create',
        data,
      } as any)

      expect(result).toEqual(data)
    })
  })

  describe('createAfterChangeHook', () => {
    it('should create audit entry for new document', async () => {
      // Create a test blog post with unique slug
      const uniqueSlug = `test-audit-post-${Date.now()}`
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: uniqueSlug,
          title: 'Test Audit Post',
          category: 'testing',
        },
      })

      const hook = createAfterChangeHook('blog-posts', [], testConfig)

      const mockReq = {
        payload,
        context: {},
        user: { id: 1, email: 'test@example.com' },
        headers: {
          'user-agent': 'test-agent',
        },
        connection: {
          remoteAddress: '127.0.0.1',
        },
      } as any

      await hook({
        req: mockReq,
        doc: blogPost,
        operation: 'create',
        previousDoc: undefined,
      } as any)

      // Check audit log was created
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
          ],
        },
      })

      expect(auditLogs.docs).toHaveLength(1)
      expect(auditLogs.docs[0]).toMatchObject({
        collection: 'blog-posts',
        documentId: String(blogPost.id),
        action: 'create',
        version: 1,
        userName: 'test@example.com',
      })
    })

    it(
      'should create audit entry for updated document',
      async () => {
        // Create a test blog post with unique slug
        const uniqueSlug = `test-update-post-${Date.now()}`
        const blogPost = await payload.create({
          collection: 'blog-posts',
          data: {
            slug: uniqueSlug,
            title: 'Original Title',
            category: 'testing',
          },
        })

      // First audit entry from create
      const hookCreate = createAfterChangeHook('blog-posts', [], testConfig)
      const mockReq = {
        payload,
        context: {},
        user: { id: 1, email: 'test@example.com' },
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '127.0.0.1' },
      } as any

      await hookCreate({
        req: mockReq,
        doc: blogPost,
        operation: 'create',
        previousDoc: undefined,
      } as any)

      // Update the post
      const updatedPost = await payload.update({
        collection: 'blog-posts',
        id: blogPost.id,
        data: {
          title: 'Updated Title',
        },
      })

      // Second audit entry from update
      await hookCreate({
        req: mockReq,
        doc: updatedPost,
        operation: 'update',
        previousDoc: blogPost,
      } as any)

      // Check audit logs
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

        expect(auditLogs.docs).toHaveLength(2)
        expect(auditLogs.docs[0].version).toBe(1)
        expect(auditLogs.docs[0].action).toBe('create')
        expect(auditLogs.docs[1].version).toBe(2)
        expect(auditLogs.docs[1].action).toBe('update')

        // Check changes were captured
        const updateAudit = auditLogs.docs[1]
        expect(Array.isArray(updateAudit.changes)).toBe(true)
        if (Array.isArray(updateAudit.changes)) {
          expect(updateAudit.changes.length).toBeGreaterThan(0)
          const titleChange = updateAudit.changes.find((c: any) => c.field === 'title')
          expect(titleChange).toBeDefined()
        }
      },
      10000,
    )

    it('should skip audit entry when no changes detected', async () => {
      const uniqueSlug = `no-change-post-${Date.now()}`
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: uniqueSlug,
          title: 'Same Title',
          category: 'testing',
        },
      })

      const hook = createAfterChangeHook('blog-posts', [], testConfig)
      const mockReq = {
        payload,
        context: {},
        user: { id: 1, email: 'test@example.com' },
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '127.0.0.1' },
      } as any

      // First call (create) - should create audit
      await hook({
        req: mockReq,
        doc: blogPost,
        operation: 'create',
        previousDoc: undefined,
      } as any)

      // Second call (update with no changes) - should skip
      await hook({
        req: mockReq,
        doc: blogPost,
        operation: 'update',
        previousDoc: blogPost,
      } as any)

      // Should only have 1 audit entry (the create)
      const auditLogs = await payload.find({
        collection: 'audit-logs',
        where: {
          and: [
            { collection: { equals: 'blog-posts' } },
            { documentId: { equals: String(blogPost.id) } },
          ],
        },
      })

      expect(auditLogs.docs).toHaveLength(1)
    })
  })

  describe('createBeforeDeleteHook', () => {
    it('should create audit entry for deleted document', async () => {
      // Create a test blog post with unique slug
      const uniqueSlug = `test-delete-post-${Date.now()}`
      const blogPost = await payload.create({
        collection: 'blog-posts',
        data: {
          slug: uniqueSlug,
          title: 'To Be Deleted',
          category: 'testing',
        },
      })

      const hook = createBeforeDeleteHook('blog-posts', testConfig)
      const mockReq = {
        payload,
        context: {},
        user: { id: 1, email: 'test@example.com' },
        headers: { 'user-agent': 'test-agent' },
        connection: { remoteAddress: '127.0.0.1' },
      } as any

      await hook({
        req: mockReq,
        id: blogPost.id,
      } as any)

      // Check audit log was created
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

      expect(auditLogs.docs).toHaveLength(1)
      expect(auditLogs.docs[0]).toMatchObject({
        collection: 'blog-posts',
        documentId: String(blogPost.id),
        action: 'delete',
        isSnapshot: true, // Deletions are always snapshots
      })
    })
  })
})
