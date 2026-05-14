import { useState, useCallback, useRef } from 'react'
import { generateScript, regenerateSection } from '../lib/api.js'

const INITIAL_STEPS = [
  { step: 1, label: 'Scraping Instagram & Reddit...', icon: '🔍', status: 'pending' },
  { step: 2, label: 'Analysing trends...', icon: '📊', status: 'pending' },
  { step: 3, label: 'Writing your script...', icon: '✍️', status: 'pending' },
  { step: 4, label: 'Generating hooks & copy...', icon: '🎣', status: 'pending' }
]

export function useScriptGeneration() {
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

  const generate = useCallback((topicId, topicTitle, niche, tone, format) => {
    if (cancelRef.current) cancelRef.current()

    setIsGenerating(true)
    setError(null)
    setScript(null)
    setContentKit(null)
    setSteps(INITIAL_STEPS)

    const cancel = generateScript(
      topicId, topicTitle, niche, tone, format,
      ({ step, status }) => updateStep(step, status),
      ({ script: generatedScript, contentKit: generatedKit }) => {
        setScript(generatedScript)
        setContentKit(generatedKit)
        setIsGenerating(false)
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
      },
      (err) => {
        console.error('Generation error:', err)
        setError(err || 'Generation failed. Please try again.')
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
  }, [])

  return { isGenerating, steps, script, contentKit, error, regenerating, generate, cancelGeneration, regenerateContentSection, reset }
}
