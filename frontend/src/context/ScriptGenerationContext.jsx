import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react'
import { generateScript, regenerateSection } from '../lib/api.js'

const ScriptGenerationContext = createContext(null)

const INITIAL_STEPS = [
  { step: 1, label: 'Scraping Instagram & Reddit...', status: 'pending' },
  { step: 2, label: 'Analysing trends...', status: 'pending' },
  { step: 3, label: 'Writing your script...', status: 'pending' },
  { step: 4, label: 'Generating hooks & copy...', status: 'pending' },
]

const LS_KEY = 'cp_last_script'

function saveToStorage(topicId, script, contentKit) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ topicId, script, contentKit, savedAt: Date.now() })) } catch {}
}

function loadFromStorage(topicId) {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.topicId !== topicId) return null
    return parsed
  } catch { return null }
}

export function ScriptGenerationProvider({ children }) {
  const [activeTopicId, setActiveTopicId] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState(INITIAL_STEPS)
  const [script, setScript] = useState(null)
  const [contentKit, setContentKit] = useState(null)
  const [error, setError] = useState(null)
  const [regenerating, setRegenerating] = useState({})
  const cancelRef = useRef(null)

  const updateStep = useCallback((stepNum, status) => {
    setSteps(prev => prev.map(s => s.step === stepNum ? { ...s, status } : s))
  }, [])

  const generate = useCallback((tid, topicTitle, niche, tone, format, { force = false } = {}) => {
    if (cancelRef.current) cancelRef.current()

    // Check localStorage cache first (survives page refresh for same topic).
    // force=true skips cache — used by Re-forge to always produce a new script.
    if (!force) {
      const cached = loadFromStorage(tid)
      if (cached?.script) {
        setActiveTopicId(tid)
        setScript(cached.script)
        setContentKit(cached.contentKit)
        setIsGenerating(false)
        setSteps(INITIAL_STEPS.map(s => ({ ...s, status: 'done' })))
        return
      }
    }

    // Clear stale cache so the new result overwrites it
    try { localStorage.removeItem(LS_KEY) } catch {}

    setActiveTopicId(tid)
    setIsGenerating(true)
    setError(null)
    setScript(null)
    setContentKit(null)
    setSteps(INITIAL_STEPS)

    const cancel = generateScript(
      tid, topicTitle, niche, tone, format,
      ({ step, status }) => updateStep(step, status),
      ({ script: gen, contentKit: kit }) => {
        setScript(gen)
        setContentKit(kit)
        setIsGenerating(false)
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
        saveToStorage(tid, gen, kit)
      },
      (err) => {
        const msg = typeof err === 'string' && err.length < 120 ? err : 'Script generation failed. Please try again.'
        setError(msg)
        setIsGenerating(false)
      }
    )
    cancelRef.current = cancel
  }, [updateStep])

  const cancelGeneration = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setIsGenerating(false)
    setSteps(INITIAL_STEPS)
  }, [])

  const reset = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setActiveTopicId(null)
    setIsGenerating(false)
    setSteps(INITIAL_STEPS)
    setScript(null)
    setContentKit(null)
    setError(null)
    setRegenerating({})
  }, [])

  const regenerateContentSection = useCallback(async (section) => {
    if (!script) return
    setRegenerating(prev => ({ ...prev, [section]: true }))
    setError(null)
    const sectionMap = { hooks: 'hookVariants', caption: 'caption', hashtags: 'hashtags', thumbnail: 'thumbnailText' }
    const apiSection = sectionMap[section] || section
    try {
      const result = await regenerateSection(script.id, apiSection, script.tone, script.format)
      const content = result?.content
      if (content !== undefined) {
        const kitKey = sectionMap[section] || section
        setContentKit(prev => {
          const next = { ...prev, [kitKey]: content }
          saveToStorage(activeTopicId, script, next)
          return next
        })
      }
    } catch { setError(`Failed to regenerate ${section}`) }
    finally { setRegenerating(prev => ({ ...prev, [section]: false })) }
  }, [script, activeTopicId])

  const reforge = useCallback((tid, topicTitle, niche, tone, format) => {
    generate(tid, topicTitle, niche, tone, format, { force: true })
  }, [generate])

  const value = useMemo(() => ({
    activeTopicId, isGenerating, steps, script, contentKit, error, regenerating,
    generate, reforge, cancelGeneration, reset, regenerateContentSection,
    setScript, setContentKit,
  }), [activeTopicId, isGenerating, steps, script, contentKit, error, regenerating,
      generate, reforge, cancelGeneration, reset, regenerateContentSection])

  return <ScriptGenerationContext.Provider value={value}>{children}</ScriptGenerationContext.Provider>
}

export function useScriptGenerationContext() {
  const ctx = useContext(ScriptGenerationContext)
  if (!ctx) throw new Error('useScriptGenerationContext must be used inside ScriptGenerationProvider')
  return ctx
}
