import React, { useState } from 'react'
import { Icon, Button, Chip } from '../../components/ui.jsx'
import { updateProfile } from '../../lib/api.js'

/**
 * Editable audience age chip.
 * Shows AI-inferred age. Pen icon → prompt → user types correction → saves.
 */
export default function AudienceAgeEditor({ initialAge, aiInferred = false, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const displayAge = initialAge || 'Not set'

  const handleSave = async () => {
    if (!value.trim()) { setEditing(false); return }
    setSaving(true)
    try {
      await updateProfile({ audienceAge: value.trim() })
      onUpdate?.(value.trim())
      setEditing(false)
    } catch {}
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2 fade-in">
        <input
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          className="field text-[13px] py-1 w-40"
          placeholder='e.g. "25-35" or "20-30 professionals"'
        />
        <Button variant="primary" size="sm" disabled={saving}
          icon={saving ? <Icon.Refresh size={12} className="spin"/> : <Icon.Check size={12}/>}
          onClick={handleSave}>
          {saving ? '' : 'Save'}
        </Button>
        <button onClick={() => setEditing(false)} className="text-ink3 hover:text-ink">
          <Icon.X size={14}/>
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[13px] text-ink">{displayAge}</span>
      {aiInferred && <Chip tone="soft">AI inferred</Chip>}
      <button
        onClick={() => { setValue(displayAge === 'Not set' ? '' : displayAge); setEditing(true) }}
        className="w-6 h-6 rounded-md flex items-center justify-center border border-line bg-white hover:bg-paper2 text-ink3 hover:text-ink transition-colors"
        title="Edit audience age"
      >
        <Icon.Edit size={11}/>
      </button>
    </div>
  )
}
