import React from 'react'
import { Icon } from '../../components/ui.jsx'
import { COMPARE_ROWS } from '../../constants/plans.js'

function Cell({ value }) {
  if (value === true) {
    return (
      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
        <Icon.Check size={14} stroke={2.5} style={{ color: 'var(--ink)', margin: '0 auto', display: 'block' }}/>
      </td>
    )
  }
  if (value === false) {
    return (
      <td style={{ padding: '13px 16px', textAlign: 'center' }}>
        <span style={{ display: 'block', width: 12, height: 1.5, background: 'var(--mute-3)', margin: '0 auto', borderRadius: 1 }}/>
      </td>
    )
  }
  return (
    <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 13, color: 'var(--ink-2)' }}>
      {value}
    </td>
  )
}

export default function CompareTable() {
  const rows = COMPARE_ROWS.map((row, i) => (
    <tr key={row.feature} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--paper-2)' }}>
      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--ink-2)', borderRight: '1px solid var(--line)' }}>
        {row.feature}
      </td>
      <Cell value={row.free}/>
      <td style={{ padding: '13px 16px', textAlign: 'center', borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', background: 'rgba(10,10,10,0.025)' }}>
        {row.pro === true
          ? <Icon.Check size={14} stroke={2.5} style={{ color: 'var(--ink)', margin: '0 auto', display: 'block' }}/>
          : row.pro === false
            ? <span style={{ display: 'block', width: 12, height: 1.5, background: 'var(--mute-3)', margin: '0 auto', borderRadius: 1 }}/>
            : <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>{row.pro}</span>
        }
      </td>
      <Cell value={row.agency}/>
    </tr>
  ))

  return (
    <div>
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <span className="kicker">Compare</span>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 8 }}>
          Full feature breakdown
        </h2>
      </div>
      <div className="compare-scroll" style={{ border: '1px solid var(--line)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600, borderRight: '1px solid var(--line)' }}>Feature</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600 }}>Free</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', fontWeight: 700, borderLeft: '1px solid var(--line)', borderRight: '1px solid var(--line)', background: 'rgba(10,10,10,0.04)' }}>Pro ✦</th>
              <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', fontWeight: 600 }}>Agency</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </div>
    </div>
  )
}
