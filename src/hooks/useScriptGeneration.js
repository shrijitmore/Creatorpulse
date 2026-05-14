import { useState, useCallback, useRef } from 'react'
import { generateScript, regenerateSection } from '../lib/api.js'

const INITIAL_STEPS = [
  { step: 1, label: 'Scraping Instagram, X, Reddit...', icon: '🔍', status: 'pending' },
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
    setSteps(prev => prev.map(s =>
      s.step === stepNum ? { ...s, status } : s
    ))
  }, [])

  const generate = useCallback((topicId, tone, format) => {
    // Cancel any existing generation
    if (cancelRef.current) {
      cancelRef.current()
    }

    setIsGenerating(true)
    setError(null)
    setScript(null)
    setContentKit(null)
    setSteps(INITIAL_STEPS)

    const cancel = generateScript(
      topicId,
      tone,
      format,
      // onStep
      ({ step, status }) => {
        updateStep(step, status)
      },
      // onComplete
      ({ script: generatedScript, contentKit: generatedKit }) => {
        setScript(generatedScript)
        setContentKit(generatedKit)
        setIsGenerating(false)
        // Mark all steps done
        setSteps(prev => prev.map(s => ({ ...s, status: 'done' })))
      },
      // onError
      (err) => {
        console.error('Generation error:', err)
        setError('Generation failed. Please try again.')
        setIsGenerating(false)
      }
    )

    cancelRef.current = cancel
  }, [updateStep])

  const cancelGeneration = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    setIsGenerating(false)
    setSteps(INITIAL_STEPS)
  }, [])

  const regenerateContentSection = useCallback(async (section) => {
    if (!script) return
    setRegenerating(prev => ({ ...prev, [section]: true }))
    setError(null)

    try {
      const result = await regenerateSection(script.id, section, script.tone, script.format)

      if (section === 'hooks' && result.hookVariants) {
        setContentKit(prev => ({ ...prev, hookVariants: result.hookVariants }))
      } else if (section === 'caption' && result.caption) {
        setContentKit(prev => ({ ...prev, caption: result.caption }))
      } else if (section === 'hashtags' && result.hashtags) {
        setContentKit(prev => ({ ...prev, hashtags: result.hashtags }))
      } else if (section === 'thumbnail' && result.thumbnailText) {
        setContentKit(prev => ({ ...prev, thumbnailText: result.thumbnailText }))
      }
    } catch (err) {
      console.error('Regeneration error:', err)
      setError(`Failed to regenerate ${section}`)
    } finally {
      setRegenerating(prev => ({ ...prev, [section]: false }))
    }
  }, [script])

  const reset = useCallback(() => {
    if (cancelRef.current) {
      cancelRef.current()
      cancelRef.current = null
    }
    setIsGenerating(false)
    setSteps(INITIAL_STEPS)
    setScript(null)
    setContentKit(null)
    setError(null)
    setRegenerating({})
  }, [])

  return {
    isGenerating,
    steps,
    script,
    contentKit,
    error,
    regenerating,
    generate,
    cancelGeneration,
    regenerateContentSection,
    reset
  }
}
