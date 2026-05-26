import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { NICHES } from '../lib/mockData.js'
import { CONTENT_FORMATS, LANGUAGE_STYLES } from '../constants/platforms.js'
import { updateNiches, updateSettings, refreshTrends, getProfile, updateProfile } from '../lib/api.js'

const SECTIONS = [
  { id: 'account',       label: 'Account' },
  { id: 'content',       label: 'Niches' },
  { id: 'creation',      label: 'Creation' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'plan',          label: 'Plan' },
  { id: 'integrations',  label: 'Integrations' },
]

function ApiKeyInput({ label, placeholder, fieldKey, value, onChange, docUrl }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.07em', color: 'var(--mute)', textTransform: 'uppercase' }}>{label}</label>
        {docUrl && (
          <a href={docUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 11.5, color: 'var(--mute)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            Get key →
          </a>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(fieldKey, e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="input"
          style={{ paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
        />
        <button
          onClick={() => setShow(v => !v)}
          type="button"
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', fontSize: 13 }}>
          {show ? '○' : '●'}
        </button>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40, height: 22, borderRadius: 999, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--ink)' : 'var(--paper-3)',
        position: 'relative', transition: 'background var(--tx-fast)', flexShrink: 0,
      }}>
      <span style={{
        position: 'absolute', top: 3, left: checked ? 21 : 3, width: 16, height: 16,
        borderRadius: '50%', background: 'var(--paper)', transition: 'left var(--tx-fast)',
      }}/>
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('account')
  const sectionRefs = useRef({})

  const storedNiches = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('trendforge_niches') || '[]') } catch { return [] }
  }, [])
  const [selectedNiches, setSelectedNiches] = useState(storedNiches)
  const [nicheSaving, setNicheSaving] = useState(false)
  const [nicheSaved, setNicheSaved] = useState(false)
  const [nicheError, setNicheError] = useState('')

  const [langStyle, setLangStyle] = useState(['english'])
  const [contentFormat, setContentFormat] = useState('on-camera')
  const [prefSaving, setPrefSaving] = useState(false)
  const [prefSaved, setPrefSaved] = useState(false)
  const [prefError, setPrefError] = useState('')

  const storedNotifs = useMemo(() => { try { return JSON.parse(localStorage.getItem('cp_notifs') || '{}') } catch { return {} } }, [])
  const [notifDailyDigest, setNotifDailyDigest] = useState(storedNotifs.dailyDigest ?? true)
  const [notifNewTrend, setNotifNewTrend]       = useState(storedNotifs.newTrend ?? false)
  const [notifCoaching, setNotifCoaching]       = useState(storedNotifs.coaching ?? true)

  const storedKeys = useMemo(() => { try { return JSON.parse(localStorage.getItem('trendforge_api_keys') || '{}') } catch { return {} } }, [])
  const [apiKeys, setApiKeys] = useState({
    GOOGLE_SERVICE_ACCOUNT_JSON: storedKeys.GOOGLE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_CLOUD_PROJECT: storedKeys.GOOGLE_CLOUD_PROJECT || '',
    APIFY_API_KEY: storedKeys.APIFY_API_KEY || '',
    REDDIT_CLIENT_ID: storedKeys.REDDIT_CLIENT_ID || '',
    REDDIT_CLIENT_SECRET: storedKeys.REDDIT_CLIENT_SECRET || '',
  })
  const [keysSaving, setKeysSaving] = useState(false)
  const [keysSaved, setKeysSaved]   = useState(false)

  const storedProfile = useMemo(() => { try { return JSON.parse(localStorage.getItem('trendforge_profile') || '{}') } catch { return {} } }, [])
  const name = storedProfile.name || 'Creator'
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  useEffect(() => {
    getProfile().then(d => {
      if (d?.profile?.languageStyle) {
        const labels = d.profile.languageStyle.split(',').map(s => s.trim().toLowerCase())
        const ids = LANGUAGE_STYLES.filter(l => labels.includes(l.label.toLowerCase())).map(l => l.id)
        if (ids.length) setLangStyle(ids)
      }
      if (d?.profile?.contentFormat) {
        const raw = d.profile.contentFormat
        const byId    = CONTENT_FORMATS.find(f => f.id === raw)
        const byLabel = CONTENT_FORMATS.find(f => f.label.toLowerCase() === raw.toLowerCase())
        setContentFormat(byId?.id || byLabel?.id || raw)
      }
    }).catch(() => {})
  }, [])

  const savePreferences = async () => {
    setPrefSaving(true)
    setPrefError('')
    try {
      const langLabel = langStyle
        .map(id => LANGUAGE_STYLES.find(l => l.id === id)?.label)
        .filter(Boolean)
        .join(', ') || 'English'
      await updateProfile({ languageStyle: langLabel, contentFormat })
      setPrefSaved(true)
      setTimeout(() => setPrefSaved(false), 2500)
    } catch (e) {
      setPrefError('Failed to save. Please try again.')
    } finally {
      setPrefSaving(false)
    }
  }

  const saveNotifications = useCallback((updates) => {
    const current = { dailyDigest: notifDailyDigest, newTrend: notifNewTrend, coaching: notifCoaching, ...updates }
    localStorage.setItem('cp_notifs', JSON.stringify(current))
  }, [notifDailyDigest, notifNewTrend, notifCoaching])

  const toggleNiche = id => { setSelectedNiches(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]); setNicheSaved(false) }

  const saveNiches = async () => {
    if (!selectedNiches.length) { setNicheError('Select at least one niche.'); return }
    setNicheSaving(true); setNicheError('')
    try {
      await updateNiches(selectedNiches)
      refreshTrends(selectedNiches, []).catch(() => {})
      setNicheSaved(true); setTimeout(() => setNicheSaved(false), 2500)
    } catch { setNicheError('Failed to save.') }
    finally { setNicheSaving(false) }
  }

  const updateKey = useCallback((key, value) => { setApiKeys(prev => ({ ...prev, [key]: value })); setKeysSaved(false) }, [])

  const saveKeys = async () => {
    setKeysSaving(true)
    try { await updateSettings({ apiKeys }); setKeysSaved(true); setTimeout(() => setKeysSaved(false), 2500) }
    catch {}
    finally { setKeysSaving(false) }
  }

  const scrollTo = (id) => {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="app-main">
      <div className="app-top">
        <div>
          <span className="kicker">Preferences</span>
          <h1 style={{ fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 6 }}>Settings</h1>
          <p className="body" style={{ marginTop: 4 }}>Niches, account, integrations. The dials behind the curtain.</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Sub-nav */}
        <nav className="set-side">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={`set-link ${activeSection === s.id ? 'on' : ''}`}
              onClick={() => scrollTo(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>

        {/* Pane */}
        <div className="set-pane">

          {/* Account */}
          <div className="set-block" ref={el => sectionRefs.current['account'] = el} id="account">
            <span className="kicker">Account</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>Your identity</h2>
            <p className="body">How you appear in Creatorpulse and how the AI addresses you.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--ink)', color: 'var(--paper)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--ink)' }}>{name}</p>
                <p className="small" style={{ marginTop: 2 }}>Creator · Free tier</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="chip active">Voice trained</span>
                <span className="chip">Free tier</span>
              </div>
            </div>
          </div>

          {/* Niches */}
          <div className="set-block" ref={el => sectionRefs.current['content'] = el} id="content">
            <span className="kicker">Content</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>Niche preferences</h2>
            <p className="body">The communities we watch for you every morning. Pick the ones that match your content.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
              {NICHES.map(niche => {
                const on = selectedNiches.includes(niche.id)
                return (
                  <button
                    key={niche.id}
                    onClick={() => toggleNiche(niche.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '8px 14px', borderRadius: 999, border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                      background: on ? 'var(--ink)' : 'var(--paper-2)',
                      color: on ? 'var(--paper)' : 'var(--ink-2)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      transition: 'all var(--tx-fast)',
                      boxShadow: on ? '0 0 0 1px var(--ink)' : 'none',
                    }}>
                    <span>{niche.icon}</span>
                    <span>{niche.label}</span>
                    {on && <span style={{ fontSize: 11 }}>✓</span>}
                  </button>
                )
              })}
            </div>
            {nicheError && <p style={{ fontSize: 12, color: 'rgb(192,74,46)', marginTop: 10 }}>{nicheError}</p>}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              <span className="small">{selectedNiches.length} niche{selectedNiches.length !== 1 ? 's' : ''} selected</span>
              <button
                className="btn btn-primary btn-sm"
                disabled={nicheSaving}
                onClick={saveNiches}>
                {nicheSaved ? '✓ Saved' : nicheSaving ? 'Saving…' : 'Save niches'}
              </button>
            </div>
          </div>

          {/* Creation / Content prefs */}
          <div className="set-block" ref={el => sectionRefs.current['creation'] = el} id="creation">
            <span className="kicker">Creation</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>Content preferences</h2>
            <p className="body">Tell the AI how you create. It shapes every script and coaching session.</p>

            <div style={{ marginTop: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>Language style</p>
              <div className="set-row" style={{ marginTop: 0 }}>
                {LANGUAGE_STYLES.filter(l => l.id !== 'other').map(l => {
                  const on = langStyle.includes(l.id)
                  return (
                    <button
                      key={l.id}
                      onClick={() => setLangStyle(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])}
                      style={{
                        textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                        border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                        background: on ? 'var(--ink)' : 'var(--paper-2)',
                        color: on ? 'var(--paper)' : 'var(--ink)',
                        transition: 'all var(--tx-fast)', cursor: 'pointer',
                        boxShadow: on ? '0 0 0 1px var(--ink)' : 'none',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{l.label}</span>
                        {on && <span style={{ fontSize: 11 }}>✓</span>}
                      </div>
                      <p style={{ fontSize: 11, fontFamily: 'var(--mono)', color: on ? 'rgba(255,255,255,0.6)' : 'var(--mute)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.example}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ marginTop: 22 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--mono)' }}>Content format</p>
              <div className="set-row" style={{ marginTop: 0 }}>
                {CONTENT_FORMATS.map(f => {
                  const on = contentFormat === f.id
                  return (
                    <button
                      key={f.id}
                      onClick={() => setContentFormat(f.id)}
                      style={{
                        textAlign: 'left', padding: '14px 16px', borderRadius: 12,
                        border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
                        background: on ? 'var(--ink)' : 'var(--paper-2)',
                        color: on ? 'var(--paper)' : 'var(--ink)',
                        transition: 'all var(--tx-fast)', cursor: 'pointer',
                        boxShadow: on ? '0 0 0 1px var(--ink)' : 'none',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{f.label}</span>
                        {on && <span style={{ fontSize: 11 }}>✓</span>}
                      </div>
                      <p style={{ fontSize: 11.5, color: on ? 'rgba(255,255,255,0.65)' : 'var(--mute)' }}>{f.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--line)' }}>
              {prefError && <p style={{ fontSize: 12, color: '#DC2626' }}>{prefError}</p>}
              <button className="btn btn-primary btn-sm" disabled={prefSaving} onClick={savePreferences}>
                {prefSaved ? '✓ Saved' : prefSaving ? 'Saving…' : 'Save preferences'}
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="set-block" ref={el => sectionRefs.current['notifications'] = el} id="notifications">
            <span className="kicker">Notifications</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>Notification preferences</h2>
            <p className="body">Control when and how Creatorpulse nudges you.</p>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Daily trend digest', sub: 'Morning summary of top signals in your niches', val: notifDailyDigest, set: v => { setNotifDailyDigest(v); saveNotifications({ dailyDigest: v }) } },
                { label: 'New viral trend alert', sub: 'Ping when a topic crosses viral threshold in your niche', val: notifNewTrend, set: v => { setNotifNewTrend(v); saveNotifications({ newTrend: v }) } },
                { label: 'Coaching reminders', sub: 'Remind me to practice delivery in Recording Studio', val: notifCoaching, set: v => { setNotifCoaching(v); saveNotifications({ coaching: v }) } },
              ].map((n, i) => (
                <div key={n.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '16px 0', borderTop: i === 0 ? '1px solid var(--line)' : '1px solid var(--line-2)', marginTop: i === 0 ? 20 : 0 }}>
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--ink)' }}>{n.label}</p>
                    <p className="small" style={{ marginTop: 2 }}>{n.sub}</p>
                  </div>
                  <Toggle checked={n.val} onChange={n.set}/>
                </div>
              ))}
            </div>
            <p className="small" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--line-2)' }}>
              Notification delivery via email is coming soon. These preferences are saved locally for now.
            </p>
          </div>

          {/* Plan */}
          <div className="set-block" ref={el => sectionRefs.current['plan'] = el} id="plan">
            <span className="kicker">Plan</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>Your subscription</h2>

            <div style={{ marginTop: 20, padding: '20px 24px', border: '1px solid var(--line)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span className="chip">Free tier</span>
                </div>
                <p className="small">5 scripts/month · 3 niches · English only · Reddit + YouTube</p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/plans')}
                style={{ flexShrink: 0 }}>
                View plans
              </button>
            </div>
          </div>

          {/* Integrations / API Keys */}
          <div className="set-block" ref={el => sectionRefs.current['integrations'] = el} id="integrations">
            <span className="kicker">Integrations</span>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', marginTop: 4, marginBottom: 4 }}>API Keys</h2>
            <p className="body">Keys live in <span style={{ fontFamily: 'var(--mono)', fontSize: 12, background: 'var(--paper-2)', padding: '1px 6px', borderRadius: 4, border: '1px solid var(--line)' }}>backend/.env</span> on the server. Reddit scraping works without any key. Instagram requires Apify. AI requires Google Vertex AI.</p>

            <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>ⓘ</span>
              <p className="small">Configure keys in <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--paper-3)', padding: '1px 5px', borderRadius: 3 }}>backend/.env</span>. These settings sync to localStorage for reference only.</p>
            </div>

            <div style={{ marginTop: 24, paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.07em', color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 14 }}>AI Generation (Vertex AI)</p>
              <ApiKeyInput label="Google Cloud Project ID" placeholder="your-project-id"
                fieldKey="GOOGLE_CLOUD_PROJECT" value={apiKeys.GOOGLE_CLOUD_PROJECT} onChange={updateKey}
                docUrl="https://console.cloud.google.com"/>
              <ApiKeyInput label="Service Account JSON" placeholder='{"type":"service_account",...}'
                fieldKey="GOOGLE_SERVICE_ACCOUNT_JSON" value={apiKeys.GOOGLE_SERVICE_ACCOUNT_JSON} onChange={updateKey}
                docUrl="https://console.cloud.google.com/iam-admin/serviceaccounts"/>
            </div>

            <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.07em', color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 14 }}>Instagram Scraping</p>
              <ApiKeyInput label="Apify API Key" placeholder="apify_api_..."
                fieldKey="APIFY_API_KEY" value={apiKeys.APIFY_API_KEY} onChange={updateKey}
                docUrl="https://console.apify.com/account/integrations"/>
            </div>

            <div style={{ paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
              <p style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.07em', color: 'var(--mute)', textTransform: 'uppercase', marginBottom: 14 }}>Reddit API (optional)</p>
              <ApiKeyInput label="Reddit Client ID" placeholder="your-client-id"
                fieldKey="REDDIT_CLIENT_ID" value={apiKeys.REDDIT_CLIENT_ID} onChange={updateKey}
                docUrl="https://www.reddit.com/prefs/apps"/>
              <ApiKeyInput label="Reddit Client Secret" placeholder="your-client-secret"
                fieldKey="REDDIT_CLIENT_SECRET" value={apiKeys.REDDIT_CLIENT_SECRET} onChange={updateKey}/>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="status" style={{ fontSize: 0 }}/>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink-2)', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>LIVE MODE</span>
              </div>
              <button className="btn btn-primary btn-sm" disabled={keysSaving} onClick={saveKeys}>
                {keysSaved ? '✓ Saved' : keysSaving ? 'Saving…' : 'Save keys'}
              </button>
            </div>
          </div>

          {/* App info */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', border: '1px solid var(--line-2)', borderRadius: 12, background: 'var(--paper-2)' }}>
            <span style={{ fontSize: 11.5, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>Creatorpulse · v1.0.0 · MVP Build</span>
            <span style={{ fontSize: 11.5, color: 'var(--mute)', fontFamily: 'var(--mono)' }}>Gemini 2.5 Flash · Vertex AI · LangGraph</span>
          </div>

        </div>
      </div>
    </div>
  )
}
