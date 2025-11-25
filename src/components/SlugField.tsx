'use client'

import { useField } from '@payloadcms/ui'
import { TextInput } from '@payloadcms/ui'
import type { TextFieldClientProps } from 'payload'

export const SlugFieldComponent: React.FC<TextFieldClientProps> = (props) => {
  const { path } = props
  const { value } = useField<string>({ path })

  return (
    <div>
      <TextInput
        path={path}
        value={value || ''}
        readOnly
        placeholder="Generated from title on save"
      />
      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
        Auto-generated from title when you save.
      </p>
    </div>
  )
}
