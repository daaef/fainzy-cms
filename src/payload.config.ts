// storage-adapter-import-placeholder
import { vercelPostgresAdapter } from '@payloadcms/db-vercel-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { BlogPosts } from './collections/BlogPosts'
import { Jobs } from './collections/Jobs'
import { Products } from './collections/Products'
import { CustomSolutions } from './collections/CustomSolutions'
import { FAQs } from './collections/FAQs'
import { Stats } from './collections/Stats'
import { AuditLog } from './collections/AuditLog'
import { auditPlugin } from './plugins/auditPlugin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, BlogPosts, Jobs, Products, CustomSolutions, FAQs, Stats, AuditLog],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: vercelPostgresAdapter({
    pool: {
      connectionString: process.env.POSTGRES_URL || '',
    },
  }),
  sharp,
  plugins: [
    // storage-adapter-placeholder
    auditPlugin({
      // Audit plugin configuration
      windowDays: 90, // Keep 90 days from latest change
      minVersions: 10, // Always keep last 10 versions
      maxDays: 365, // Hard delete after 1 year
      trackActions: ['create', 'update', 'delete'],
    }),
  ],
})
