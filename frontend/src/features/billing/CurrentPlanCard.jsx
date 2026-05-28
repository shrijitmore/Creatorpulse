import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/ui.jsx'
import { COLORS } from '../../constants/theme.js'
import { USAGE_THRESHOLDS } from '../../constants/plans.js'

export default function CurrentPlanCard({ plan = 'free', scriptsUsed = 0, scriptsLimit = 5, resetDate = null }) {
  const navigate = useNavigate()
  const isFree = plan === 'free'
  const pct = isFree ? Math.min(100, Math.round((scriptsUsed / scriptsLimit) * 100)) : 0
  const barColor = pct >= USAGE_THRESHOLDS.danger ? COLORS.error : pct >= USAGE_THRESHOLDS.warning ? COLORS.warn : 'var(--ink)'

  return (
    <div style={{
      border: '1px solid var(--line)',
      borderRadius: 14,
      padding: '20px 24px',
      background: 'var(--paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 24,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 200 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: isFree ? 'var(--paper-3)' : 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {isFree
            ? <Icon.Bolt size={16} style={{ color: 'var(--mute)' }}/>
            : <Icon.Star size={16} style={{ color: 'var(--paper)' }}/>
          }
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              {isFree ? 'Free plan' : plan === 'pro' ? 'Pro plan' : 'Agency plan'}
            </p>
            <span style={{
              fontSize: 10, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 999,
              background: isFree ? 'var(--paper-3)' : 'var(--ink)',
              color: isFree ? 'var(--mute)' : 'var(--paper)',
              border: '1px solid var(--line)',
            }}>
              {isFree ? 'Free' : 'Active'}
            </span>
          </div>
          {isFree ? (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 12, color: 'var(--mute)' }}>Scripts this month</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: barColor }}>{scriptsUsed} / {scriptsLimit}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: 'var(--paper-3)', overflow: 'hidden', width: 200 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 999, transition: 'width 0.4s ease' }}/>
              </div>
              {resetDate && <p style={{ fontSize: 11, color: 'var(--mute)', marginTop: 5 }}>Resets {resetDate}</p>}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--mute)' }}>Unlimited scripts · All platforms · AI coaching</p>
          )}
        </div>
      </div>

      {isFree && (
        <button
          onClick={() => navigate('/plans')}
          className="btn btn-primary btn-sm"
          style={{ flexShrink: 0 }}>
          <Icon.Bolt size={13}/>
          Upgrade plan
        </button>
      )}
    </div>
  )
}
