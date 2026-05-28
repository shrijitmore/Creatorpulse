import { useState, useCallback, useRef } from 'react'
import { generateScript, regenerateSection } from '../lib/api.js'

const INITIAL_STEPS = [
  { step: 1, label: 'Scraping Instagram & Reddit...', icon: '🔍', status: 'pending' },
  { step: 2, label: 'Analysing trends...', icon: '📊', status: 'pending' },
  { step: 3, label: 'Writing your script...', icon: '✍️', status: 'pending' },
  { step: 4, label: 'Generating hooks & copy...', icon: '🎣', status: 'pending' }
]

function cacheKey(topicId) { return `sg_cache_${topicId}` }

function readCache(topicId) {
  if (!topicId) return null
  try { return JSON.parse(sessionStorage.getItem(cacheKey(topicId))) } catch { return null }
}

function writeCache(topicId, data) {
  if (!topicId) return
  try { sessionStorage.setItem(cacheKey(topicId), JSON.stringify(data)) } catch {}
}

export function useScriptGeneration(topicId) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [steps, setSteps] = useState(INITIAL_STEPS)
  const [script, setScript] = useState(() => readCache(topicId)?.script ?? null)
  const [contentKit, setContentKit] = useState(() => readCache(topicId)?.contentKit ?? null)
  const [error, setError] = useState(null)
  const [regenerating, setRegenerating] = useState({})
  const cancelRef = useRef(null)

  const updateStep = useCallback((stepNum, status) => {
    setSteps(prev => prev.map(s => s.step === stepNum ? { ...s, status } : s))
  }, [])

  const generate = useCallback((tid, topicTitle, niche, tone, format) => {
    if (cancelRef.current) cancelRef.current()

    setIsGenerating(true)
    setError(null)
    setScript(null)
    setContentKit(null)
    setSteps(INITIAL_STEPS)

    const cancel = generateScript(
      tid, topicTitle, niche, tone, format,
      ({ step, status }) => updateStep(step, status),
      ({ script: generatedScript, contentKit: generatedKit }) => {
        setScript(generatedScript)
        setContentKit(generatedKit)
        setIsGenerating(false)
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
        writeCache(tid, { script: generatedScript, contentKit: generatedKit })
      },
      (err) => {
        console.error('Generation error:', err)
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
        setContentKit(prev => ({ ...prev, [kitKey]: content }))
      }
    } catch (err) {
      console.error('Regeneration error:', err)
      setError(`Failed to regenerate ${section}`)
    } finally {
      setRegenerating(prev => ({ ...prev, [section]: false }))
    }
  }, [script])

  const reset = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setIsGenerating(false)
    setSteps(INITIAL_STEPS)
    setScript(null)
    setContentKit(null)
    setError(null)
    setRegenerating({})
    if (topicId) try { sessionStorage.removeItem(cacheKey(topicId)) } catch {}
  }, [topicId])

  return { isGenerating, steps, script, contentKit, error, regenerating, generate, cancelGeneration, regenerateContentSection, reset }
}
