import React, { useState, useMemo, useCallback } from 'react'
import { Icon, Button, Chip, Field, PageHeader, Toggle, Banner } from '../components/ui.jsx'
import { NICHES } from '../lib/mockData.js'
import { updateNiches, updateSettings, refreshTrends } from '../lib/api.js'

function SectionCard({ title, sub, kicker, children, accent }) {
  return (
    <section className="card overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-line">
        {kicker && <p className="kicker mb-1">{kicker}</p>}
        <h2 className="text-[16px] font-semibold tracking-[-0.005em] text-ink">{title}</h2>
        {sub && <p className="mt-1 text-[12.5px] text-ink3 leading-relaxed">{sub}</p>}
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

function ApiKeyInput({ label, placeholder, fieldKey, value, onChange, docUrl }) {
  const [show, setShow] = useState(false)
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-[12px] text-ink2 font-medium">{label}</label>
        {docUrl && (
          <a href={docUrl} target="_blank" rel="noreferrer"
            className="text-[11.5px] text-ink3 hover:text-ink flex items-center gap-1 transition-colors">
            Get key <Icon.Arrow size={10}/>
          </a>
        )}
      </div>
      <div className="relative">
        <input type={show ? 'text' : 'password'} value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder} autoComplete="off"
          className="field pr-10"/>
        <button onClick={() => setShow(v => !v)} type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink3 hover:text-ink transition-colors">
          {show ? <Icon.Eye size={14}/> : <Icon.EyeOff size={14}/>}
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  // Niches
  const storedNiches = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('trendforge_niches') || '[]') } catch { return [] }
  }, [])
  const [selectedNiches, setSelectedNiches] = useState(storedNiches)
  const [nicheSaving, setNicheSaving] = useState(false)
  const [nicheSaved, setNicheSaved] = useState(false)
  const [nicheError, setNicheError] = useState('')

  const toggleNiche = id => { setSelectedNiches(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]); setNicheSaved(false) }
  const saveNiches = async () => {
    if (!selectedNiches.length) { setNicheError('Select at least one niche.'); return }
    setNicheSaving(true); setNicheError('')
    try {
      await updateNiches(selectedNiches)
      // Invalidate trend cache so dashboard refreshes with new niches
      refreshTrends(selectedNiches, []).catch(() => {})
      setNicheSaved(true)
      setTimeout(() => setNicheSaved(false), 2500)
    }
    catch { setNicheError('Failed to save.') }
    finally { setNicheSaving(false) }
  }

  // API Keys
  const storedKeys = useMemo(() => { try { return JSON.parse(localStorage.getItem('trendforge_api_keys') || '{}') } catch { return {} } }, [])
  const [apiKeys, setApiKeys] = useState({
    GOOGLE_SERVICE_ACCOUNT_JSON: storedKeys.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_CLOUD_PROJECT: storedKeys.GOOGLE_CLOUD_PROJECT || '',
    APIFY_API_KEY: storedKeys.APIFY_API_KEY || '',
    REDDIT_CLIENT_ID: storedKeys.REDDIT_CLIENT_ID || '',
    REDDIT_CLIENT_SECRET: storedKeys.REDDIT_CLIENT_SECRET || '',
  })
  const [keysSaving, setKeysSaving] = useState(false)
  const [keysSaved, setKeysSaved] = useState(false)
  const updateKey = useCallback((key, value) => { setApiKeys(prev => ({ ...prev, [key]: value })); setKeysSaved(false) }, [])
  const saveKeys = async () => {
    setKeysSaving(true)
    try { await updateSettings({ apiKeys }); setKeysSaved(true); setTimeout(() => setKeysSaved(false), 2500) }
    catch {}
    finally { setKeysSaving(false) }
  }

  const storedProfile = useMemo(() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } }, [])
  const name = storedProfile.name || 'Alex Romero'
  const initials = name.split(' ').map(w => w[0]).slice(0,2).join('')

  return (
    <div className="px-6 lg:px-8 py-7 max-w-[860px] mx-auto">
      <PageHeader kicker="Preferences" title="Settings"
        sub="Niches, account, keys — and the dials behind the curtain."/>

      <div className="mt-6 space-y-5">

        {/* Account */}
        <SectionCard kicker="Account" title="Your identity" sub="How you appear in Creatorpulse and how the AI addresses you.">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full text-white flex items-center justify-center text-[16px] font-semibold flex-shrink-0"
              style={{ background:'var(--terra)' }}>{initials}</div>
            <div>
              <p className="text-[15px] font-medium text-ink">{name}</p>
              <p className="text-[12px] text-ink3">alex@trendforge.io</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Chip tone="success" icon={<span className="w-1.5 h-1.5 rounded-full bg-successc live-dot inline-block"/>}>Voice trained</Chip>
              <Chip tone="line">Free tier</Chip>
            </div>
          </div>
        </SectionCard>

        {/* Niches */}
        <SectionCard kicker="Content" title="Niche preferences"
          sub="The communities we watch for you every morning. Pick the ones that match your content.">
          <div className="flex flex-wrap gap-2 mb-5">
            {NICHES.map(niche => {
              const on = selectedNiches.includes(niche.id)
              return (
                <button key={niche.id} onClick={() => toggleNiche(niche.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all font-medium text-[13px]"
                  style={{ background: on ? '#fff' : 'var(--paper2)', borderColor: on ? 'var(--terra)' : 'var(--line)', color: on ? 'var(--ink)' : 'var(--ink2)', boxShadow: on ? '0 0 0 1px var(--terra)' : 'none' }}>
                  <span>{niche.icon}</span>
                  <span>{niche.label}</span>
                  {on && <Icon.Check size={11} stroke={2.5} style={{ color:'var(--terra)' }}/>}
                </button>
              )
            })}
          </div>
          {nicheError && <p className="text-[12px] text-errorc mb-3">{nicheError}</p>}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink3">{selectedNiches.length} niche{selectedNiches.length !== 1 ? 's' : ''} selected</span>
            <Button variant="primary" size="sm"
              disabled={nicheSaving}
              icon={nicheSaved ? <Icon.Check size={13} stroke={2.5}/> : nicheSaving ? <Icon.Refresh size={13} className="spin"/> : <Icon.Save size={13}/>}
              onClick={saveNiches}>
              {nicheSaved ? 'Saved!' : nicheSaving ? 'Saving…' : 'Save niches'}
            </Button>
          </div>
        </SectionCard>

        {/* API Keys */}
        <SectionCard kicker="Integrations" title="API Keys"
          sub="Keys live in backend/.env on the server. Reddit scraping works without any key. Instagram requires Apify. AI requires Google Vertex AI.">
          <div className="banner banner-info mb-5">
            <Icon.Info size={14}/>
            <div className="text-[12.5px]">
              Configure keys in <code className="font-mono bg-paper2 px-1 rounded text-[11px]">backend/.env</code>.
              These settings sync to localStorage for reference only.
            </div>
          </div>

          <div className="pb-4 mb-4 border-b border-line">
            <p className="kicker mb-3">AI Generation (Vertex AI)</p>
            <ApiKeyInput label="GOOGLE CLOUD PROJECT ID" placeholder="your-project-id"
              fieldKey="GOOGLE_CLOUD_PROJECT" value={apiKeys.GOOGLE_CLOUD_PROJECT} onChange={updateKey}
              docUrl="https://console.cloud.google.com"/>
            <ApiKeyInput label="SERVICE ACCOUNT JSON" placeholder='{"type":"service_account",...}'
              fieldKey="GOOGLE_SERVICE_ACCOUNT_JSON" value={apiKeys.GOOGLE_SERVICE_ACCOUNT_JSON} onChange={updateKey}
              docUrl="https://console.cloud.google.com/iam-admin/serviceaccounts"/>
          </div>

          <div className="pb-4 mb-4 border-b border-line">
            <p className="kicker mb-3">Instagram Scraping</p>
            <ApiKeyInput label="APIFY API KEY" placeholder="apify_api_..."
              fieldKey="APIFY_API_KEY" value={apiKeys.APIFY_API_KEY} onChange={updateKey}
              docUrl="https://console.apify.com/account/integrations"/>
          </div>

          <div className="pb-4 mb-4 border-b border-line">
            <p className="kicker mb-3">Reddit API (optional — public API works without keys)</p>
            <ApiKeyInput label="REDDIT CLIENT ID" placeholder="your-client-id"
              fieldKey="REDDIT_CLIENT_ID" value={apiKeys.REDDIT_CLIENT_ID} onChange={updateKey}
              docUrl="https://www.reddit.com/prefs/apps"/>
            <ApiKeyInput label="REDDIT CLIENT SECRET" placeholder="your-client-secret"
              fieldKey="REDDIT_CLIENT_SECRET" value={apiKeys.REDDIT_CLIENT_SECRET} onChange={updateKey}/>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-successc live-dot"/>
              <span className="text-[12px] text-ink3 font-medium">Live mode</span>
            </div>
            <Button variant="primary" size="sm"
              disabled={keysSaving}
              icon={keysSaved ? <Icon.Check size={13} stroke={2.5}/> : keysSaving ? <Icon.Refresh size={13} className="spin"/> : <Icon.Save size={13}/>}
              onClick={saveKeys}>
              {keysSaved ? 'Saved!' : keysSaving ? 'Saving…' : 'Save keys'}
            </Button>
          </div>
        </SectionCard>

        {/* App info */}
        <div className="flex items-center justify-between px-5 py-4 rounded-xl border border-line bg-paper2 text-[11.5px] text-ink3">
          <span>Creatorpulse · v1.0.0 · MVP Build</span>
          <span>Gemini 2.5 Flash · Vertex AI · LangGraph · Apify</span>
        </div>
      </div>
    </div>
  )
}
