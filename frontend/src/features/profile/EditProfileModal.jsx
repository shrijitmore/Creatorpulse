import React, { useState, useEffect } from 'react'
import { Modal, Button } from '../../components/ui.jsx'
import { CONTENT_FORMATS, LANGUAGE_STYLES, CREATOR_GOALS } from '../../constants/platforms.js'
import { updateProfile } from '../../lib/api.js'

const EDIT_PLATFORMS = [
  { id: 'Instagram',      label: 'Instagram' },
  { id: 'TikTok',         label: 'TikTok' },
  { id: 'YouTube Shorts', label: 'YouTube Shorts' },
  { id: 'X / Twitter',    label: 'X / Twitter' },
  { id: 'LinkedIn',       label: 'LinkedIn' },
]

function SelectChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '5px 12px',
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 500,
        cursor: 'pointer',
        border: active ? '1.5px solid var(--ink)' : '1.5px solid var(--line)',
        background: active ? 'var(--ink)' : 'transparent',
        color: active ? 'var(--paper)' : 'var(--ink2)',
        transition: 'all 0.15s',
      }}>
      {children}
    </button>
  )
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <p className="kicker">{label}</p>
      {children}
    </div>
  )
}

export default function EditProfileModal({ open, onClose, profile, onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!open || !profile) return
    const langs = (profile.languageStyle || 'English').split(',').map(s => s.trim()).filter(Boolean)
    setForm({
      creatorName:    profile.creatorName    || '',
      platforms:      profile.platforms      || [],
      languageStyles: langs,
      contentFormat:  profile.contentFormat  || 'on-camera',
      audiencePersona: profile.audiencePersona || '',
      primaryGoal:    profile.primaryGoal    || '',
    })
    setErr(null)
  }, [open, profile])

  const toggle = (key, val) => setForm(f => {
    const arr = f[key] || []
    return { ...f, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] }
  })

  const handleSave = async () => {
    setSaving(true)
    setErr(null)
    try {
      await updateProfile({
        creatorName:    (form.creatorName || '').trim(),
        platforms:      form.platforms || [],
        languageStyle:  (form.languageStyles || []).join(', '),
        contentFormat:  form.contentFormat,
        audiencePersona: (form.audiencePersona || '').trim(),
        primaryGoal:    form.primaryGoal || '',
      })
      onSaved()
      onClose()
    } catch (e) {
      setErr('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit profile" width="lg">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

        <FormField label="Name">
          <input
            className="field"
            value={form.creatorName || ''}
            onChange={e => setForm(f => ({ ...f, creatorName: e.target.value }))}
            placeholder="Your creator name"
          />
        </FormField>

        <FormField label="Platforms">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {EDIT_PLATFORMS.map(p => (
              <SelectChip
                key={p.id}
                active={(form.platforms || []).includes(p.id)}
                onClick={() => toggle('platforms', p.id)}>
                {p.label}
              </SelectChip>
            ))}
          </div>
        </FormField>

        <FormField label="Language style">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {LANGUAGE_STYLES.filter(l => l.id !== 'other').map(l => (
              <SelectChip
                key={l.id}
                active={(form.languageStyles || []).includes(l.label)}
                onClick={() => toggle('languageStyles', l.label)}>
                {l.label}
              </SelectChip>
            ))}
          </div>
        </FormField>

        <FormField label="Content format">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CONTENT_FORMATS.map(f => (
              <SelectChip
                key={f.id}
                active={form.contentFormat === f.id}
                onClick={() => setForm(prev => ({ ...prev, contentFormat: f.id }))}>
                {f.label}
              </SelectChip>
            ))}
          </div>
        </FormField>

        <FormField label="Primary goal">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {CREATOR_GOALS.map(g => (
              <SelectChip
                key={g.id}
                active={form.primaryGoal === g.label}
                onClick={() => setForm(f => ({ ...f, primaryGoal: g.label }))}>
                {g.label}
              </SelectChip>
            ))}
          </div>
        </FormField>

        <FormField label="Audience">
          <textarea
            className="field"
            rows={3}
            value={form.audiencePersona || ''}
            onChange={e => setForm(f => ({ ...f, audiencePersona: e.target.value }))}
            placeholder="Describe your target audience…"
          />
        </FormField>

        {err && (
          <p style={{ fontSize: 12.5, color: '#DC2626' }}>{err}</p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>

      </div>
    </Modal>
  )
}
