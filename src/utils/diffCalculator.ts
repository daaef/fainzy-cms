/**
 * Diff Calculator - Deep comparison utility for audit trail
 * Identifies field-level changes between two objects
 */

export interface FieldChange {
  field: string
  oldValue: any
  newValue: any
  path: string // Nested path (e.g., "author.name", "tags[1]")
}

/**
 * Calculate differences between two objects
 * Returns array of field-level changes
 */
export function calculateDiff(
  oldDoc: Record<string, any> | null | undefined,
  newDoc: Record<string, any> | null | undefined,
  excludeFields: string[] = [],
  parentPath: string = '',
): FieldChange[] {
  const changes: FieldChange[] = []

  // Handle null/undefined cases
  if (!oldDoc && !newDoc) return changes
  if (!oldDoc) {
    // New document created - all fields are "new"
    return flattenObject(newDoc, parentPath, excludeFields).map((item) => ({
      field: item.field,
      oldValue: null,
      newValue: item.value,
      path: item.path,
    }))
  }
  if (!newDoc) {
    // Document deleted - all fields are "removed"
    return flattenObject(oldDoc, parentPath, excludeFields).map((item) => ({
      field: item.field,
      oldValue: item.value,
      newValue: null,
      path: item.path,
    }))
  }

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)])

  for (const key of allKeys) {
    // Skip excluded fields (e.g., password, internal fields)
    if (excludeFields.includes(key)) continue

    // Skip Payload internal fields that change frequently
    if (key === 'updatedAt' || key === 'createdAt' || key === 'id') continue

    const oldValue = oldDoc[key]
    const newValue = newDoc[key]
    const currentPath = parentPath ? `${parentPath}.${key}` : key

    // Check if values are different
    if (!deepEqual(oldValue, newValue)) {
      // Handle nested objects recursively
      if (isPlainObject(oldValue) && isPlainObject(newValue)) {
        const nestedChanges = calculateDiff(oldValue, newValue, excludeFields, currentPath)
        changes.push(...nestedChanges)
      }
      // Handle arrays
      else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        const arrayChanges = compareArrays(oldValue, newValue, currentPath, excludeFields)
        changes.push(...arrayChanges)
      }
      // Primitive value changed
      else {
        changes.push({
          field: key,
          oldValue: serializeValue(oldValue),
          newValue: serializeValue(newValue),
          path: currentPath,
        })
      }
    }
  }

  return changes
}

/**
 * Deep equality check for two values
 */
function deepEqual(val1: any, val2: any): boolean {
  // Strict equality check first (handles primitives, null, undefined)
  if (val1 === val2) return true

  // Check for null/undefined mismatch
  if (val1 == null || val2 == null) return false

  // Check for Date objects
  if (val1 instanceof Date && val2 instanceof Date) {
    return val1.getTime() === val2.getTime()
  }

  // Check for arrays
  if (Array.isArray(val1) && Array.isArray(val2)) {
    if (val1.length !== val2.length) return false
    return val1.every((item, index) => deepEqual(item, val2[index]))
  }

  // Check for plain objects
  if (isPlainObject(val1) && isPlainObject(val2)) {
    const keys1 = Object.keys(val1)
    const keys2 = Object.keys(val2)
    if (keys1.length !== keys2.length) return false
    return keys1.every((key) => deepEqual(val1[key], val2[key]))
  }

  // Different types or values
  return false
}

/**
 * Check if value is a plain object (not Array, Date, etc.)
 */
function isPlainObject(val: any): boolean {
  return val !== null && typeof val === 'object' && val.constructor === Object
}

/**
 * Compare two arrays and identify changes
 */
function compareArrays(
  oldArray: any[],
  newArray: any[],
  path: string,
  excludeFields: string[],
): FieldChange[] {
  const changes: FieldChange[] = []

  // If arrays have different lengths, track that
  if (oldArray.length !== newArray.length) {
    changes.push({
      field: `${path}.length`,
      oldValue: oldArray.length,
      newValue: newArray.length,
      path: `${path}.length`,
    })
  }

  // Compare each element
  const maxLength = Math.max(oldArray.length, newArray.length)
  for (let i = 0; i < maxLength; i++) {
    const oldItem = i < oldArray.length ? oldArray[i] : undefined
    const newItem = i < newArray.length ? newArray[i] : undefined
    const itemPath = `${path}[${i}]`

    if (!deepEqual(oldItem, newItem)) {
      // If items are objects, recursively diff them
      if (isPlainObject(oldItem) && isPlainObject(newItem)) {
        const nestedChanges = calculateDiff(oldItem, newItem, excludeFields, itemPath)
        changes.push(...nestedChanges)
      } else {
        changes.push({
          field: `${path}[${i}]`,
          oldValue: serializeValue(oldItem),
          newValue: serializeValue(newItem),
          path: itemPath,
        })
      }
    }
  }

  return changes
}

/**
 * Flatten nested object into array of field paths and values
 * Used for create/delete operations where we want all fields
 */
function flattenObject(
  obj: Record<string, any> | null | undefined,
  parentPath: string = '',
  excludeFields: string[] = [],
): Array<{ field: string; value: any; path: string }> {
  if (!obj) return []

  const result: Array<{ field: string; value: any; path: string }> = []

  for (const key of Object.keys(obj)) {
    // Skip excluded fields
    if (excludeFields.includes(key)) continue

    // Skip Payload internal fields
    if (key === 'updatedAt' || key === 'createdAt' || key === 'id') continue

    const value = obj[key]
    const currentPath = parentPath ? `${parentPath}.${key}` : key

    // Handle nested objects recursively
    if (isPlainObject(value)) {
      result.push(...flattenObject(value, currentPath, excludeFields))
    }
    // Handle arrays
    else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        const itemPath = `${currentPath}[${index}]`
        if (isPlainObject(item)) {
          result.push(...flattenObject(item, itemPath, excludeFields))
        } else {
          result.push({
            field: `${key}[${index}]`,
            value: serializeValue(item),
            path: itemPath,
          })
        }
      })
    }
    // Primitive value
    else {
      result.push({
        field: key,
        value: serializeValue(value),
        path: currentPath,
      })
    }
  }

  return result
}

/**
 * Serialize value for storage (handle special types)
 */
function serializeValue(value: any): any {
  if (value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'function') return '[Function]'
  if (typeof value === 'symbol') return '[Symbol]'

  // Handle large objects/arrays - truncate for storage
  if (isPlainObject(value)) {
    const keys = Object.keys(value)
    if (keys.length > 50) {
      return `[Object with ${keys.length} keys]`
    }
  }
  if (Array.isArray(value)) {
    if (value.length > 100) {
      return `[Array with ${value.length} items]`
    }
  }

  return value
}

/**
 * Get a human-readable summary of changes
 */
export function getChangeSummary(changes: FieldChange[]): string {
  if (changes.length === 0) return 'No changes'
  if (changes.length === 1) {
    const change = changes[0]
    return `Changed ${change.field}`
  }
  const fields = changes.map((c) => c.field).slice(0, 3)
  const remaining = changes.length - fields.length
  const fieldList = fields.join(', ')
  return remaining > 0 ? `Changed ${fieldList} and ${remaining} more` : `Changed ${fieldList}`
}
