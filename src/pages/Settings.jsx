import React, { useState, useMemo, useCallback } from 'react'
import { Settings as SettingsIcon, Key, User, Save, Check, Eye, EyeOff, ExternalLink, RefreshCw, ChevronRight } from 'lucide-react'
import NicheTile from '../components/NicheTile.jsx'
import { NICHES } from '../lib/mockData.js'
import { updateNiches, updateSettings } from '../lib/api.js'

function SectionCard({ icon: Icon, title, subtitle, children, accent = '#BFFF00' }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.07)'
      }}
    >
      <div
        className="flex items-center gap-3 px-5 py-4 border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}12`, border: `1px solid ${accent}25` }}
        >
          <Icon size={15} style={{ color: accent }} />
        </div>
        <div>
          <h2 className="text-sm font-mono font-semibold" style={{ color: '#f4f4f5' }}>{title}</h2>
          {subtitle && (
            <p className="text-xs mt-0.5" style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  )
}

function ApiKeyInput({ label, placeholder, envKey, stored, onChange, docUrl }) {
  const [show, setShow] = useState(false)

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-mono font-semibold tracking-wider" style={{ color: '#a1a1aa' }}>
          {label}
        </label>
        {docUrl && (
          <a
            href={docUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-xs font-mono transition-colors"
            style={{ color: '#71717a' }}
            onMouseEnter={e => e.currentTarget.style.color = '#BFFF00'}
            onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
          >
            GET KEY <ExternalLink size={9} />
          </a>
        )}
      </div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={stored}
          onChange={e => onChange(envKey, e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full px-3 py-2.5 pr-10 rounded-lg text-xs font-mono"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: stored ? '#f4f4f5' : '#3f3f46',
            outline: 'none',
            transition: 'border-color 0.15s'
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(191,255,0,0.4)' }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
        />
        <button
          onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: '#71717a' }}
          type="button"
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    </div>
  )
}

function SaveButton({ saving, saved, label = 'SAVE CHANGES', onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all"
      style={{
        background: saved ? 'rgba(191,255,0,0.15)' : saving ? 'rgba(255,255,255,0.04)' : 'rgba(191,255,0,0.1)',
        border: `1px solid ${saved ? 'rgba(191,255,0,0.5)' : saving ? 'rgba(255,255,255,0.1)' : 'rgba(191,255,0,0.3)'}`,
        color: saved ? '#BFFF00' : saving ? '#3f3f46' : '#BFFF00',
        cursor: saving ? 'not-allowed' : 'pointer'
      }}
    >
      {saved ? <Check size={14} /> : saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />}
      {saved ? 'SAVED!' : saving ? 'SAVING...' : label}
    </button>
  )
}

export default function Settings() {
  // ── Niches ────────────────────────────────────────────────────────────────────
  const storedNiches = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trendforge_niches') || '[]')
    } catch { return [] }
  }, [])

  const [selectedNiches, setSelectedNiches] = useState(storedNiches)
  const [nicheSaving, setNicheSaving] = useState(false)
  const [nicheSaved, setNicheSaved] = useState(false)
  const [nicheError, setNicheError] = useState('')

  const toggleNiche = (id) => {
    setSelectedNiches(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id])
    setNicheSaved(false)
    setNicheError('')
  }

  const saveNiches = async () => {
    if (selectedNiches.length === 0) {
      setNicheError('Select at least one niche.')
      return
    }
    setNicheSaving(true)
    setNicheError('')
    try {
      await updateNiches(selectedNiches)
      setNicheSaved(true)
      setTimeout(() => setNicheSaved(false), 2500)
    } catch (err) {
      setNicheError('Failed to save. Please try again.')
    } finally {
      setNicheSaving(false)
    }
  }

  // ── API Keys ──────────────────────────────────────────────────────────────────
  const storedKeys = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('trendforge_api_keys') || '{}')
    } catch { return {} }
  }, [])

  const [apiKeys, setApiKeys] = useState({
    GOOGLE_SERVICE_ACCOUNT_JSON: storedKeys.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_CLOUD_PROJECT: storedKeys.GOOGLE_CLOUD_PROJECT || '',
    APIFY_API_KEY: storedKeys.APIFY_API_KEY || '',
    REDDIT_CLIENT_ID: storedKeys.REDDIT_CLIENT_ID || '',
    REDDIT_CLIENT_SECRET: storedKeys.REDDIT_CLIENT_SECRET || ''
  })
  const [keysSaving, setKeysSaving] = useState(false)
  const [keysSaved, setKeysSaved] = useState(false)
  const [keysError, setKeysError] = useState('')

  const updateKey = useCallback((key, value) => {
    setApiKeys(prev => ({ ...prev, [key]: value }))
    setKeysSaved(false)
    setKeysError('')
  }, [])

  const saveKeys = async () => {
    setKeysSaving(true)
    setKeysError('')
    try {
      await updateSettings({ apiKeys })
      setKeysSaved(true)
      setTimeout(() => setKeysSaved(false), 2500)
    } catch (err) {
      setKeysError('Failed to save API keys.')
    } finally {
      setKeysSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <SettingsIcon size={20} style={{ color: '#BFFF00' }} />
          <h1 className="font-bebas text-4xl tracking-wider" style={{ color: '#f4f4f5', letterSpacing: '0.06em' }}>
            SETTINGS
          </h1>
        </div>
        <p className="text-sm" style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}>
          Configure your niches, API keys, and account preferences
        </p>
      </div>

      {/* Account section */}
      <SectionCard icon={User} title="Account" subtitle="Your TrendForge identity" accent="#00D1FF">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #BFFF00, #00D1FF)', color: '#08090D' }}
          >
            A
          </div>
          <div>
            <p className="text-sm font-mono font-medium" style={{ color: '#f4f4f5' }}>Alex</p>
            <p className="text-xs font-mono" style={{ color: '#71717a' }}>alex@trendforge.io</p>
            <p
              className="text-xs mt-0.5"
              style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}
            >
              Solo creator account · MVP
            </p>
          </div>
          <div className="ml-auto">
            <span
              className="px-2 py-1 rounded text-xs font-mono"
              style={{
                background: 'rgba(191,255,0,0.08)',
                border: '1px solid rgba(191,255,0,0.2)',
                color: '#BFFF00'
              }}
            >
              FREE TIER
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Niche preferences */}
      <SectionCard
        icon={ChevronRight}
        title="Content Niches"
        subtitle="Personalise which trends and scripts you see"
        accent="#BFFF00"
      >
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          {NICHES.map(niche => (
            <NicheTile
              key={niche.id}
              niche={niche}
              selected={selectedNiches.includes(niche.id)}
              onToggle={toggleNiche}
              size="small"
            />
          ))}
        </div>

        {/* Selected count */}
        <div className="flex items-center justify-between">
          <div>
            {selectedNiches.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedNiches.map(id => {
                  const n = NICHES.find(x => x.id === id)
                  return n ? (
                    <span
                      key={id}
                      className="text-xs font-mono px-2 py-0.5 rounded"
                      style={{
                        background: 'rgba(191,255,0,0.08)',
                        border: '1px solid rgba(191,255,0,0.2)',
                        color: '#BFFF00'
                      }}
                    >
                      {n.icon} {n.label.toUpperCase()}
                    </span>
                  ) : null
                })}
              </div>
            ) : (
              <p className="text-xs font-mono" style={{ color: '#3f3f46' }}>NO NICHES SELECTED</p>
            )}
            {nicheError && (
              <p className="text-xs font-mono mt-2" style={{ color: '#FF3D71' }}>{nicheError}</p>
            )}
          </div>

          <SaveButton
            saving={nicheSaving}
            saved={nicheSaved}
            onClick={saveNiches}
            label="SAVE NICHES"
          />
        </div>
      </SectionCard>

      {/* API Keys */}
      <SectionCard
        icon={Key}
        title="API Keys"
        subtitle="Keys live in backend .env — configure server-side, not here"
        accent="#FF3D71"
      >
        <div className="mb-5">
          <p
            className="text-xs font-mono mb-4 px-3 py-2 rounded"
            style={{
              background: 'rgba(191,255,0,0.04)',
              border: '1px solid rgba(191,255,0,0.15)',
              color: '#a1a1aa'
            }}
          >
            All API keys are configured in <span style={{ color: '#BFFF00' }}>backend/.env</span> on the server. Reddit scraping works without any key. Instagram requires Apify. AI requires Google Vertex AI service account.
          </p>

          <div
            className="pb-4 mb-4 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
              AI GENERATION (VERTEX AI)
            </p>
            <ApiKeyInput
              label="GOOGLE CLOUD PROJECT ID"
              placeholder="your-project-id"
              envKey="GOOGLE_CLOUD_PROJECT"
              stored={apiKeys.GOOGLE_CLOUD_PROJECT}
              onChange={updateKey}
              docUrl="https://console.cloud.google.com"
            />
            <ApiKeyInput
              label="SERVICE ACCOUNT JSON"
              placeholder='{"type":"service_account",...}'
              envKey="GOOGLE_SERVICE_ACCOUNT_JSON"
              stored={apiKeys.GOOGLE_SERVICE_ACCOUNT_JSON}
              onChange={updateKey}
              docUrl="https://console.cloud.google.com/iam-admin/serviceaccounts"
            />
          </div>

          <div
            className="pb-4 mb-4 border-b"
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
              INSTAGRAM SCRAPING
            </p>
            <ApiKeyInput
              label="APIFY API KEY"
              placeholder="apify_api_..."
              envKey="APIFY_API_KEY"
              stored={apiKeys.APIFY_API_KEY}
              onChange={updateKey}
              docUrl="https://console.apify.com/account/integrations"
            />
          </div>

          <div>
            <p className="text-xs font-mono font-semibold tracking-widest mb-3" style={{ color: '#71717a' }}>
              REDDIT API (OPTIONAL — public API works without keys)
            </p>
            <ApiKeyInput
              label="REDDIT CLIENT ID"
              placeholder="your-client-id"
              envKey="REDDIT_CLIENT_ID"
              stored={apiKeys.REDDIT_CLIENT_ID}
              onChange={updateKey}
              docUrl="https://www.reddit.com/prefs/apps"
            />
            <ApiKeyInput
              label="REDDIT CLIENT SECRET"
              placeholder="your-client-secret"
              envKey="REDDIT_CLIENT_SECRET"
              stored={apiKeys.REDDIT_CLIENT_SECRET}
              onChange={updateKey}
            />
          </div>
        </div>

        {keysError && (
          <p className="text-xs font-mono mb-3" style={{ color: '#FF3D71' }}>{keysError}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#BFFF00' }} />
            <span className="text-xs font-mono" style={{ color: '#71717a' }}>LIVE MODE</span>
          </div>
          <SaveButton saving={keysSaving} saved={keysSaved} onClick={saveKeys} label="SAVE KEYS" />
        </div>
      </SectionCard>

      {/* App info */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-lg"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <div>
          <p className="text-xs font-mono" style={{ color: '#71717a' }}>TRENDFORGE</p>
          <p className="text-xs font-mono" style={{ color: '#3f3f46' }}>v1.0.0 · MVP Build</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono" style={{ color: '#71717a' }}>POWERED BY</p>
          <p className="text-xs font-mono" style={{ color: '#3f3f46' }}>Gemini 2.5 Flash · Vertex AI · LangGraph · Apify</p>
        </div>
      </div>
    </div>
  )
}
