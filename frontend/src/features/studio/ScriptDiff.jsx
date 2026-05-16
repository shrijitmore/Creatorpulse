import React from 'react'
import { Icon, Button, Modal } from '../../components/ui.jsx'

/**
 * Shows original script vs user-edited version side by side.
 * Highlights changed fields.
 */
export default function ScriptDiff({ open, onClose, original, edited }) {
  if (!original || !edited) return null

  const hookChanged = original.hookLine !== edited.hookLine
  const ctaChanged  = original.cta !== edited.cta

  const sceneDiffs = (edited.scenes || []).map((scene, i) => {
    const orig = original.scenes?.[i] || {}
    return {
      sceneNumber: scene.sceneNumber,
      visualChanged:    orig.visuals !== scene.visuals,
      voiceoverChanged: orig.voiceover !== scene.voiceover,
      origVisuals:   orig.visuals,
      editVisuals:   scene.visuals,
      origVoiceover: orig.voiceover,
      editVoiceover: scene.voiceover,
    }
  }).filter(d => d.visualChanged || d.voiceoverChanged)

  const totalChanges = (hookChanged ? 1 : 0) + (ctaChanged ? 1 : 0) + sceneDiffs.length

  return (
    <Modal open={open} onClose={onClose} title="Script changes" kicker={`${totalChanges} change${totalChanges !== 1 ? 's' : ''}`} width="xl">
      {totalChanges === 0 ? (
        <p className="text-[13.5px] text-ink3 italic text-center py-4">No changes from original.</p>
      ) : (
        <div className="space-y-4">
          {/* Column headers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-[11px] text-ink3 uppercase tracking-[0.08em] font-medium px-1">Original</div>
            <div className="text-[11px] text-ink3 uppercase tracking-[0.08em] font-medium px-1">Edited</div>
          </div>

          {/* Hook diff */}
          {hookChanged && (
            <DiffRow label="Hook" original={original.hookLine} edited={edited.hookLine}/>
          )}

          {/* Scene diffs */}
          {sceneDiffs.map(d => (
            <div key={d.sceneNumber}>
              <p className="kicker mb-2">Scene {d.sceneNumber}</p>
              {d.visualChanged && (
                <DiffRow label="Visuals" original={d.origVisuals} edited={d.editVisuals}/>
              )}
              {d.voiceoverChanged && (
                <DiffRow label="Voiceover" original={d.origVoiceover} edited={d.editVoiceover} italic/>
              )}
            </div>
          ))}

          {/* CTA diff */}
          {ctaChanged && (
            <DiffRow label="CTA" original={original.cta} edited={edited.cta}/>
          )}
        </div>
      )}
    </Modal>
  )
}

function DiffRow({ label, original, edited, italic = false }) {
  return (
    <div className="mb-3">
      <p className="text-[10.5px] text-ink3 uppercase tracking-[0.06em] font-medium mb-1.5">{label}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg p-3 text-[13px] leading-relaxed"
          style={{ background:'#FEF2F2', border:'1px solid #FECACA', color:'#991B1B', fontStyle: italic ? 'italic' : 'normal' }}>
          {original}
        </div>
        <div className="rounded-lg p-3 text-[13px] leading-relaxed"
          style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', color:'#166534', fontStyle: italic ? 'italic' : 'normal' }}>
          {edited}
        </div>
      </div>
    </div>
  )
}
