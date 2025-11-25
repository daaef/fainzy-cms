import { describe, expect, it } from 'vitest'
import { calculateDiff, getChangeSummary, type FieldChange } from '../../src/utils/diffCalculator'

describe('diffCalculator', () => {
  describe('calculateDiff', () => {
    it('should return empty array when both objects are null', () => {
      const result = calculateDiff(null, null)
      expect(result).toEqual([])
    })

    it('should detect primitive value changes', () => {
      const oldDoc = { title: 'Old Title', status: 'draft' }
      const newDoc = { title: 'New Title', status: 'draft' }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'title',
        oldValue: 'Old Title',
        newValue: 'New Title',
        path: 'title',
      })
    })

    it('should detect multiple field changes', () => {
      const oldDoc = { title: 'Title', count: 5, active: true }
      const newDoc = { title: 'New Title', count: 10, active: true }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(2)
      expect(result.map((c) => c.field)).toContain('title')
      expect(result.map((c) => c.field)).toContain('count')
    })

    it('should detect nested object changes', () => {
      const oldDoc = { author: { name: 'John', age: 30 } }
      const newDoc = { author: { name: 'Jane', age: 30 } }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'name',
        oldValue: 'John',
        newValue: 'Jane',
        path: 'author.name',
      })
    })

    it('should detect deeply nested changes', () => {
      const oldDoc = { meta: { seo: { title: 'Old SEO' } } }
      const newDoc = { meta: { seo: { title: 'New SEO' } } }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0].path).toBe('meta.seo.title')
    })

    it('should detect array element changes', () => {
      const oldDoc = { tags: ['react', 'vue', 'angular'] }
      const newDoc = { tags: ['react', 'svelte', 'angular'] }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'tags[1]',
        oldValue: 'vue',
        newValue: 'svelte',
        path: 'tags[1]',
      })
    })

    it('should detect array length changes', () => {
      const oldDoc = { items: [1, 2, 3] }
      const newDoc = { items: [1, 2] }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result.some((c) => c.field === 'items.length')).toBe(true)
      expect(result.find((c) => c.field === 'items.length')).toMatchObject({
        oldValue: 3,
        newValue: 2,
      })
    })

    it('should detect new fields added', () => {
      const oldDoc = { title: 'Title' }
      const newDoc = { title: 'Title', description: 'New field' }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'description',
        oldValue: null,
        newValue: 'New field',
      })
    })

    it('should detect fields removed', () => {
      const oldDoc = { title: 'Title', oldField: 'Remove me' }
      const newDoc = { title: 'Title' }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'oldField',
        oldValue: 'Remove me',
        newValue: null,
      })
    })

    it('should detect null to undefined change', () => {
      const oldDoc = { field: null }
      const newDoc = { field: undefined }

      const result = calculateDiff(oldDoc, newDoc)

      // null and undefined are technically different (null is explicit, undefined is absence)
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'field',
        oldValue: null,
        newValue: null, // undefined gets serialized to null
      })
    })

    it('should detect Date changes', () => {
      const date1 = new Date('2025-01-01')
      const date2 = new Date('2025-01-02')

      const oldDoc = { publishDate: date1 }
      const newDoc = { publishDate: date2 }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'publishDate',
        oldValue: date1.toISOString(),
        newValue: date2.toISOString(),
      })
    })

    it('should exclude specified fields', () => {
      const oldDoc = { title: 'Title', password: 'secret123', apiKey: 'key123' }
      const newDoc = { title: 'New Title', password: 'newSecret', apiKey: 'newKey' }

      const result = calculateDiff(oldDoc, newDoc, ['password', 'apiKey'])

      expect(result).toHaveLength(1)
      expect(result[0].field).toBe('title')
      expect(result.map((c) => c.field)).not.toContain('password')
      expect(result.map((c) => c.field)).not.toContain('apiKey')
    })

    it('should ignore Payload internal fields', () => {
      const oldDoc = { title: 'Title', id: 1, createdAt: '2025-01-01', updatedAt: '2025-01-01' }
      const newDoc = { title: 'Title', id: 1, createdAt: '2025-01-01', updatedAt: '2025-01-02' }

      const result = calculateDiff(oldDoc, newDoc)

      // updatedAt should be ignored, title unchanged = 0 changes
      expect(result).toHaveLength(0)
    })

    it('should handle array of objects', () => {
      const oldDoc = { features: [{ name: 'Feature 1', enabled: true }] }
      const newDoc = { features: [{ name: 'Feature 1', enabled: false }] }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        field: 'enabled',
        path: 'features[0].enabled',
        oldValue: true,
        newValue: false,
      })
    })

    it('should handle new document (oldDoc = null)', () => {
      const newDoc = { title: 'New Document', status: 'draft' }

      const result = calculateDiff(null, newDoc)

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((c) => c.oldValue === null)).toBe(true)
      expect(result.map((c) => c.field)).toContain('title')
      expect(result.map((c) => c.field)).toContain('status')
    })

    it('should handle deleted document (newDoc = null)', () => {
      const oldDoc = { title: 'Deleted Document', status: 'published' }

      const result = calculateDiff(oldDoc, null)

      expect(result.length).toBeGreaterThan(0)
      expect(result.every((c) => c.newValue === null)).toBe(true)
      expect(result.map((c) => c.field)).toContain('title')
      expect(result.map((c) => c.field)).toContain('status')
    })

    it('should handle complex nested structures', () => {
      const oldDoc = {
        post: {
          title: 'Title',
          meta: {
            tags: ['tag1', 'tag2'],
            author: { name: 'John', contact: { email: 'john@example.com' } },
          },
        },
      }

      const newDoc = {
        post: {
          title: 'New Title',
          meta: {
            tags: ['tag1', 'tag3'],
            author: { name: 'John', contact: { email: 'newemail@example.com' } },
          },
        },
      }

      const result = calculateDiff(oldDoc, newDoc)

      expect(result.length).toBeGreaterThan(0)
      expect(result.some((c) => c.path === 'post.title')).toBe(true)
      expect(result.some((c) => c.path === 'post.meta.tags[1]')).toBe(true)
      expect(result.some((c) => c.path === 'post.meta.author.contact.email')).toBe(true)
    })
  })

  describe('getChangeSummary', () => {
    it('should return "No changes" for empty array', () => {
      const result = getChangeSummary([])
      expect(result).toBe('No changes')
    })

    it('should return field name for single change', () => {
      const changes: FieldChange[] = [
        { field: 'title', oldValue: 'old', newValue: 'new', path: 'title' },
      ]
      const result = getChangeSummary(changes)
      expect(result).toBe('Changed title')
    })

    it('should list all fields for 2-3 changes', () => {
      const changes: FieldChange[] = [
        { field: 'title', oldValue: 'old', newValue: 'new', path: 'title' },
        { field: 'status', oldValue: 'draft', newValue: 'published', path: 'status' },
      ]
      const result = getChangeSummary(changes)
      expect(result).toBe('Changed title, status')
    })

    it('should show "and X more" for many changes', () => {
      const changes: FieldChange[] = [
        { field: 'field1', oldValue: 'old', newValue: 'new', path: 'field1' },
        { field: 'field2', oldValue: 'old', newValue: 'new', path: 'field2' },
        { field: 'field3', oldValue: 'old', newValue: 'new', path: 'field3' },
        { field: 'field4', oldValue: 'old', newValue: 'new', path: 'field4' },
        { field: 'field5', oldValue: 'old', newValue: 'new', path: 'field5' },
      ]
      const result = getChangeSummary(changes)
      expect(result).toBe('Changed field1, field2, field3 and 2 more')
    })
  })
})
