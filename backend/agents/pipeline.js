import { StateGraph, END } from '@langchain/langgraph'
import { scrapeTrends } from './scraper.js'
import { analyzeTrends } from './trendAnalyst.js'
import { writeScript } from './scriptWriter.js'
import { generateCopyKit } from './hookCopy.js'

// ─── Trend Pipeline (Agents 1 + 2) ────────────────────────────────────────────

const trendStateChannels = {
  niches: { value: (a, b) => b ?? a, default: () => [] },
  platforms: { value: (a, b) => b ?? a, default: () => [] },
  rawTrends: { value: (a, b) => b ?? a, default: () => [] },
  trends: { value: (a, b) => b ?? a, default: () => [] },
  recommendations: { value: (a, b) => b ?? a, default: () => [] },
  error: { value: (a, b) => b ?? a, default: () => null }
}

async function scrapeNode(state) {
  console.log('[pipeline:trend] Running scrape node')
  try {
    const rawTrends = await scrapeTrends(state.niches, state.platforms)
    return { rawTrends }
  } catch (err) {
    console.error('[pipeline:trend] Scrape node error:', err.message)
    return { rawTrends: [], error: err.message }
  }
}

async function analyzeNode(state) {
  console.log('[pipeline:trend] Running analyze node')
  try {
    const { trends, recommendations } = await analyzeTrends(state.rawTrends, state.niches)
    return { trends, recommendations }
  } catch (err) {
    console.error('[pipeline:trend] Analyze node error:', err.message)
    return { trends: state.rawTrends, recommendations: state.rawTrends.slice(0, 3), error: err.message }
  }
}

function buildTrendGraph() {
  const graph = new StateGraph({ channels: trendStateChannels })

  graph.addNode('scrape', scrapeNode)
  graph.addNode('analyze', analyzeNode)

  graph.addEdge('__start__', 'scrape')
  graph.addEdge('scrape', 'analyze')
  graph.addEdge('analyze', '__end__')

  return graph.compile()
}

/**
 * Run the full trend pipeline: Scraper → Analyst
 * @param {string[]} niches
 * @param {string[]} platforms
 * @returns {Promise<{ trends: Trend[], recommendations: Trend[] }>}
 */
export async function runTrendPipeline(niches, platforms) {
  const compiled = buildTrendGraph()
  const result = await compiled.invoke({ niches, platforms })
  return {
    trends: result.trends || [],
    recommendations: result.recommendations || []
  }
}

// ─── Script Pipeline (Agents 3 + 4) ───────────────────────────────────────────

const scriptStateChannels = {
  topic: { value: (a, b) => b ?? a, default: () => '' },
  topicTitle: { value: (a, b) => b ?? a, default: () => '' },
  tone: { value: (a, b) => b ?? a, default: () => 'educational' },
  format: { value: (a, b) => b ?? a, default: () => '60s' },
  niche: { value: (a, b) => b ?? a, default: () => '' },
  script: { value: (a, b) => b ?? a, default: () => null },
  contentKit: { value: (a, b) => b ?? a, default: () => null },
  onProgress: { value: (a, b) => b ?? a, default: () => null },
  error: { value: (a, b) => b ?? a, default: () => null }
}

function makeWriteScriptNode() {
  return async function writeScriptNode(state) {
    console.log('[pipeline:script] Running write-script node')
    if (state.onProgress) {
      state.onProgress({ step: 3, status: 'active', label: 'Writing script...' })
    }
    try {
      const script = await writeScript(
        state.topic,
        state.topicTitle,
        state.tone,
        state.format,
        state.niche
      )
      if (state.onProgress) {
        state.onProgress({ step: 3, status: 'done', label: 'Script written' })
      }
      return { script }
    } catch (err) {
      console.error('[pipeline:script] Write script node error:', err.message)
      return { error: err.message }
    }
  }
}

function makeGenerateCopyNode() {
  return async function generateCopyNode(state) {
    console.log('[pipeline:script] Running generate-copy node')
    if (state.onProgress) {
      state.onProgress({ step: 4, status: 'active', label: 'Generating content kit...' })
    }
    try {
      const contentKit = await generateCopyKit(state.script, state.topicTitle, state.niche)
      if (state.onProgress) {
        state.onProgress({ step: 4, status: 'done', label: 'Content kit ready' })
      }
      return { contentKit }
    } catch (err) {
      console.error('[pipeline:script] Generate copy node error:', err.message)
      return { error: err.message }
    }
  }
}

function buildScriptGraph() {
  const graph = new StateGraph({ channels: scriptStateChannels })

  graph.addNode('writeScript', makeWriteScriptNode())
  graph.addNode('generateCopy', makeGenerateCopyNode())

  graph.addEdge('__start__', 'writeScript')
  graph.addEdge('writeScript', 'generateCopy')
  graph.addEdge('generateCopy', '__end__')

  return graph.compile()
}

/**
 * Run the full script pipeline: Script Writer → Hook Copy
 * @param {string} topic - topic ID
 * @param {string} topicTitle
 * @param {string} tone
 * @param {string} format
 * @param {string} niche
 * @param {Function} onProgress - called with { step, status, label }
 * @returns {Promise<{ script: Script, contentKit: ContentKit }>}
 */
export async function runScriptPipeline(topic, topicTitle, tone, format, niche, onProgress) {
  const compiled = buildScriptGraph()
  const result = await compiled.invoke({
    topic,
    topicTitle,
    tone,
    format,
    niche,
    onProgress: onProgress || null
  })

  if (!result.script) {
    throw new Error(result.error || 'Script pipeline failed to produce output')
  }

  return {
    script: result.script,
    contentKit: result.contentKit || null
  }
}
