/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A lowercase, hyphenated slug
 * @example
 * slugify("Senior Frontend Developer") // "senior-frontend-developer"
 * slugify("React & TypeScript Expert!") // "react-typescript-expert"
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars except hyphens
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, '') // Trim - from end of text
}
