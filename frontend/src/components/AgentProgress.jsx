import React from 'react'
import { Check, X } from 'lucide-react'

export default function AgentProgress({ steps, onCancel }) {
  const completedCount = steps.filter(s => s.status === 'done').length
  const totalSteps = steps.length
  const progressPct = (completedCount / totalSteps) * 100
  const activeStep = steps.find(s => s.status === 'active')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div
        className="relative w-full max-w-md mx-4 p-8 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 0 60px rgba(191,255,0,0.08)'
        }}
      >
        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 rounded transition-colors"
          style={{ color: '#71717a' }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF3D71'}
          onMouseLeave={e => e.currentTarget.style.color = '#71717a'}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2
            className="font-bebas text-3xl mb-1"
            style={{ color: '#BFFF00', letterSpacing: '0.05em' }}
          >
            FORGING YOUR SCRIPT
          </h2>
          <p
            className="text-sm"
            style={{ color: '#71717a', fontFamily: '"Crimson Pro", serif', fontStyle: 'italic' }}
          >
            {activeStep ? activeStep.label : completedCount === totalSteps ? 'Complete!' : 'Initialising...'}
          </p>
        </div>

        {/* Overall progress bar */}
        <div
          className="h-1 rounded-full overflow-hidden mb-8"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #BFFF00, #00D1FF)',
              boxShadow: '0 0 8px rgba(191,255,0,0.5)'
            }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => {
            const isActive = step.status === 'active'
            const isDone = step.status === 'done'
            const isPending = step.status === 'pending'

            return (
              <div key={step.step} className="flex items-center gap-4">
                {/* Step indicator */}
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300"
                  style={{
                    background: isDone
                      ? '#BFFF00'
                      : isActive
                        ? 'rgba(191,255,0,0.15)'
                        : 'rgba(255,255,255,0.05)',
                    border: isActive
                      ? '1px solid rgba(191,255,0,0.5)'
                      : isDone
                        ? '1px solid #BFFF00'
                        : '1px solid rgba(255,255,255,0.1)',
                    boxShadow: isActive
                      ? '0 0 12px rgba(191,255,0,0.3)'
                      : 'none'
                  }}
                >
                  {isDone ? (
                    <Check size={14} style={{ color: '#08090D' }} />
                  ) : (
                    <span
                      className={isActive ? 'step-active' : ''}
                      style={{ color: isActive ? '#BFFF00' : '#3f3f46' }}
                    >
                      {step.icon}
                    </span>
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-mono"
                    style={{
                      color: isDone
                        ? '#BFFF00'
                        : isActive
                          ? '#f4f4f5'
                          : '#3f3f46',
                      transition: 'color 0.3s ease'
                    }}
                  >
                    {step.label}
                  </p>

                  {/* Active step sub-progress */}
                  {isActive && (
                    <div
                      className="mt-1.5 h-0.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          background: '#BFFF00',
                          animation: 'progressSweep 1.5s ease-in-out infinite',
                          width: '40%',
                          transform: 'translateX(-100%)',
                          boxShadow: '0 0 6px rgba(191,255,0,0.5)'
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Status */}
                <div className="flex-shrink-0">
                  {isDone && (
                    <span
                      className="text-xs font-mono"
                      style={{ color: '#BFFF00' }}
                    >
                      DONE
                    </span>
                  )}
                  {isActive && (
                    <span
                      className="text-xs font-mono step-active"
                      style={{ color: '#a1a1aa' }}
                    >
                      ...
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom note */}
        <p
          className="mt-8 text-center text-xs font-mono"
          style={{ color: '#3f3f46' }}
        >
          POWERED BY TRENDFORGE AI ENGINE
        </p>
      </div>

      <style>{`
        @keyframes progressSweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  )
}
