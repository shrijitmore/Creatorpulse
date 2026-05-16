import React, { useState, useEffect, useRef, createContext, useContext, useCallback, useMemo } from 'react'

// ─── Icons (monoline stroke-1.6) ─────────────────────────────────────────────

const Ic = ({ children, size = 16, stroke = 1.6, className = '', style = {} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke}
    strokeLinecap="round" strokeLinejoin="round"
    className={className} style={style}>{children}</svg>
)

export const Icon = {
  Logo:     (p) => (<Ic {...p}><path d="M3 12h3l2-6 4 12 2-6h7"/></Ic>),
  Home:     (p) => (<Ic {...p}><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/></Ic>),
  Studio:   (p) => (<Ic {...p}><rect x="3" y="5" width="18" height="11" rx="2"/><path d="M2 20h20"/><path d="M10 9l4 2-4 2z" fill="currentColor"/></Ic>),
  Profile:  (p) => (<Ic {...p}><circle cx="12" cy="9" r="3"/><path d="M5 20a7 7 0 0 1 14 0"/></Ic>),
  Bookmark: (p) => (<Ic {...p}><path d="M6 3h12v18l-6-4-6 4z"/></Ic>),
  Settings: (p) => (<Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Ic>),
  Search:   (p) => (<Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ic>),
  Plus:     (p) => (<Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>),
  X:        (p) => (<Ic {...p}><path d="M18 6L6 18M6 6l12 12"/></Ic>),
  Check:    (p) => (<Ic {...p}><path d="M4 12l5 5L20 6"/></Ic>),
  Arrow:    (p) => (<Ic {...p}><path d="M5 12h14M13 5l7 7-7 7"/></Ic>),
  ChevR:    (p) => (<Ic {...p}><path d="M9 6l6 6-6 6"/></Ic>),
  ChevD:    (p) => (<Ic {...p}><path d="M6 9l6 6 6-6"/></Ic>),
  ChevL:    (p) => (<Ic {...p}><path d="M15 6l-6 6 6 6"/></Ic>),
  Refresh:  (p) => (<Ic {...p}><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></Ic>),
  Copy:     (p) => (<Ic {...p}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></Ic>),
  Send:     (p) => (<Ic {...p}><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></Ic>),
  Save:     (p) => (<Ic {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></Ic>),
  Edit:     (p) => (<Ic {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></Ic>),
  Trash:    (p) => (<Ic {...p}><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></Ic>),
  Info:     (p) => (<Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></Ic>),
  Alert:    (p) => (<Ic {...p}><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></Ic>),
  Help:     (p) => (<Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4"/><path d="M12 17.5h.01"/></Ic>),
  Wand:     (p) => (<Ic {...p}><path d="M4 20l11-11"/><path d="M15 4l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/></Ic>),
  Bolt:     (p) => (<Ic {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></Ic>),
  Sparkle:  (p) => (<Ic {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/></Ic>),
  Star:     (p) => (<Ic {...p}><path d="M12 2l3 7 7 .6-5.4 4.7L18 22l-6-3.7L6 22l1.4-7.7L2 9.6 9 9z"/></Ic>),
  Hash:     (p) => (<Ic {...p}><path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18"/></Ic>),
  Clock:    (p) => (<Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Ic>),
  Flame:    (p) => (<Ic {...p}><path d="M12 3s4 3 4 8a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 2 2 2 0-3-2-4-2-6z"/></Ic>),
  Rising:   (p) => (<Ic {...p}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></Ic>),
  Globe:    (p) => (<Ic {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Ic>),
  Brain:    (p) => (<Ic {...p}><path d="M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-2 5v0a3 3 0 0 0 3 3 3 3 0 0 0 2 2 3 3 0 0 0 5-1v-13a3 3 0 0 0-5 1z"/><path d="M15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 2 5v0a3 3 0 0 1-3 3 3 3 0 0 1-2 2 3 3 0 0 1-3-1"/></Ic>),
  Mic:      (p) => (<Ic {...p}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/></Ic>),
  Target:   (p) => (<Ic {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></Ic>),
  Layers:   (p) => (<Ic {...p}><path d="M12 2L2 7l10 5 10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></Ic>),
  Quote:    (p) => (<Ic {...p}><path d="M6 17h3l2-4V7H5v6h3z"/><path d="M14 17h3l2-4V7h-6v6h3z"/></Ic>),
  Eye:      (p) => (<Ic {...p}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></Ic>),
  EyeOff:   (p) => (<Ic {...p}><path d="M17.9 17.9A11 11 0 0 1 12 19c-7 0-11-7-11-7a18 18 0 0 1 3.1-4.1M9.9 4.2A11 11 0 0 1 12 4c7 0 11 7 11 7a18 18 0 0 1-2.1 3M3 3l18 18"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></Ic>),
  Filter:   (p) => (<Ic {...p}><path d="M3 5h18M6 12h12M10 19h4"/></Ic>),
  Sliders:  (p) => (<Ic {...p}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></Ic>),
  IG:       (p) => (<Ic {...p}><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></Ic>),
  XTwit:    (p) => (<Ic {...p}><path d="M4 4l16 16M20 4L4 20"/></Ic>),
  Reddit:   (p) => (<Ic {...p}><circle cx="12" cy="13" r="8"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M9 16c1 1 2 1.5 3 1.5s2-.5 3-1.5"/><circle cx="19" cy="6" r="2"/><path d="M17 7l-2 2"/></Ic>),
  YT:       (p) => (<Ic {...p}><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></Ic>),
  TikTok:   (p) => (<Ic {...p}><path d="M9 8v8a3 3 0 1 1-3-3"/><path d="M15 4c0 3 2 5 5 5"/><path d="M15 4v10a4 4 0 1 1-4-4"/></Ic>),
  LinkedIn: (p) => (<Ic {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7M7 7v.01M11 17v-5a2 2 0 0 1 4 0v5M11 12v5M17 17v-3a2 2 0 0 0-2-2"/></Ic>),
}

// ─── Logomark + Wordmark ─────────────────────────────────────────────────────

export function Logomark({ size = 28 }) {
  return (
    <span className="cp-logomark" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none">
        <path d="M3 12h3l2-6 4 12 2-6h7" stroke="#C47338" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

export function Wordmark({ withTag = false }) {
  return (
    <div className="flex items-center gap-2">
      <Logomark size={28} />
      <div className="flex flex-col leading-none">
        <span className="font-semibold text-[15px] tracking-[-0.01em] text-ink">creatorpulse</span>
        {withTag && <span className="text-[10px] text-ink3 mt-0.5 tracking-[0.04em]">your AI cofounder for content</span>}
      </div>
    </div>
  )
}

// ─── Button ──────────────────────────────────────────────────────────────────

export function Button({ variant = 'soft', size = 'md', icon, iconRight, children, className = '', ...rest }) {
  const v = { primary: 'btn btn-primary', terra: 'btn btn-terra', soft: 'btn btn-soft', ghost: 'btn btn-ghost' }[variant] || 'btn btn-soft'
  const s = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : ''
  return (
    <button className={`${v} ${s} ${className}`} {...rest}>
      {icon}{children && <span>{children}</span>}{iconRight}
    </button>
  )
}

export function IconButton({ icon, label, onClick, tone = 'default', className = '', placement = 'top', ...rest }) {
  const colors = {
    default: 'text-ink3 hover:text-ink hover:bg-paper2',
    danger:  'text-ink3 hover:text-errorc hover:bg-[#F5DDD2]',
    success: 'text-ink3 hover:text-successc hover:bg-[#E5EBDB]',
  }[tone]
  return (
    <Tooltip label={label} placement={placement}>
      <button onClick={onClick} aria-label={label}
        className={`inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors ${colors} ${className}`} {...rest}>
        {icon}
      </button>
    </Tooltip>
  )
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

export function Tooltip({ label, children, placement = 'top', shortcut }) {
  if (!label) return children
  return (
    <span className="tt-anchor">
      {children}
      <span className={`tt tt-${placement}`}>
        {label}
        {shortcut && <span className="ml-2 opacity-60 font-mono text-[10px]">{shortcut}</span>}
      </span>
    </span>
  )
}

// ─── Chip ────────────────────────────────────────────────────────────────────

export function Chip({ children, tone = 'line', className = '', icon }) {
  const c = {
    line: 'chip chip-line', soft: 'chip chip-soft', ink: 'chip chip-ink',
    terra: 'chip chip-terra', success: 'chip chip-success', warn: 'chip chip-warn', error: 'chip chip-error',
  }[tone] || 'chip chip-line'
  return <span className={`${c} ${className}`}>{icon}{children}</span>
}

// ─── Field + Input ───────────────────────────────────────────────────────────

export function Field({ label, hint, error, help, children, required, className = '' }) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[12px] text-ink2 font-medium">
            {label}{required && <span className="text-errorc ml-0.5">*</span>}
          </span>
          {help && (
            <Tooltip label={help}>
              <span className="text-ink3 hover:text-ink cursor-help"><Icon.Help size={12} /></span>
            </Tooltip>
          )}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-[11.5px] text-ink3">{hint}</p>}
      {error && <p className="mt-1.5 text-[11.5px] text-errorc flex items-center gap-1"><Icon.Alert size={11}/> {error}</p>}
    </div>
  )
}

export const Input = React.forwardRef(function Input({ error, icon, className = '', ...rest }, ref) {
  if (icon) {
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 pointer-events-none">{icon}</span>
        <input ref={ref} className={`field pl-9 ${error ? 'field-error' : ''} ${className}`} {...rest} />
      </div>
    )
  }
  return <input ref={ref} className={`field ${error ? 'field-error' : ''} ${className}`} {...rest} />
})

// ─── Segmented ───────────────────────────────────────────────────────────────

export function Segmented({ options, value, onChange }) {
  return (
    <div className="seg">
      {options.map(o => (
        <button key={o.value} data-active={String(o.value === value)} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

// ─── Toggle ──────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange, label }) {
  return (
    <button onClick={() => onChange(!checked)} className="inline-flex items-center gap-2.5" role="switch" aria-checked={checked}>
      <span className="w-9 h-5 rounded-full relative transition-colors" style={{ background: checked ? 'var(--terra)' : 'var(--ink4)' }}>
        <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all" style={{ left: checked ? '18px' : '2px', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
      </span>
      {label && <span className="text-[13.5px] text-ink">{label}</span>}
    </button>
  )
}

// ─── Pill ────────────────────────────────────────────────────────────────────

export function Pill({ active, onClick, icon, children }) {
  return (
    <button className="pill" data-active={String(!!active)} onClick={onClick}>
      {icon}{children}
      {active && <Icon.Check size={12} stroke={2.5}/>}
    </button>
  )
}

// ─── Modal ───────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, kicker, children, footer, width = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  const w = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[width]
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 fade-in"
      style={{ background: 'rgba(26,23,20,0.32)', backdropFilter: 'blur(2px)' }}
      onMouseDown={onClose}>
      <div className={`card w-full ${w}`} onMouseDown={e => e.stopPropagation()}
        style={{ animation: 'fadeUp .2s cubic-bezier(.16,1,.3,1) forwards' }}>
        <div className="px-6 pt-5 pb-4 border-b border-line">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              {kicker && <p className="kicker mb-1">{kicker}</p>}
              <h3 className="text-[20px] font-semibold tracking-tight text-ink leading-snug">{title}</h3>
            </div>
            <button onClick={onClose} className="p-1 text-ink3 hover:text-ink rounded-md hover:bg-paper2"><Icon.X size={18}/></button>
          </div>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line bg-paper rounded-b-[12px] flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

// ─── Toast ───────────────────────────────────────────────────────────────────

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((t) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, ...t }])
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), t.duration || 3200)
  }, [])
  const api = useMemo(() => ({
    toast:   push,
    success: (msg, opts) => push({ kind: 'success', msg, ...opts }),
    error:   (msg, opts) => push({ kind: 'error',   msg, ...opts }),
    info:    (msg, opts) => push({ kind: 'info',    msg, ...opts }),
  }), [push])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed bottom-6 right-6 z-[80] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="card pointer-events-auto px-4 py-3 flex items-center gap-3 min-w-[260px] max-w-sm fade-up"
            style={{ boxShadow: '0 12px 32px -8px rgba(26,23,20,0.18), 0 2px 4px rgba(26,23,20,0.06)' }}>
            <span className="flex-shrink-0">
              {t.kind === 'success' && <span className="w-5 h-5 rounded-full bg-successc flex items-center justify-center"><Icon.Check size={12} stroke={2.6} style={{ color:'#fff' }}/></span>}
              {t.kind === 'error'   && <span className="w-5 h-5 rounded-full bg-errorc flex items-center justify-center"><Icon.X size={12} stroke={2.6} style={{ color:'#fff' }}/></span>}
              {t.kind === 'info'    && <span className="w-5 h-5 rounded-full bg-terra flex items-center justify-center"><Icon.Info size={12} style={{ color:'#fff' }}/></span>}
            </span>
            <span className="flex-1 text-[13.5px] text-ink">{t.msg}</span>
            {t.action && (
              <button className="text-[12px] font-medium text-terra hover:text-terradeep"
                onClick={() => t.action.onClick()}>{t.action.label}</button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

// ─── Banner ──────────────────────────────────────────────────────────────────

export function Banner({ kind = 'info', title, children, onDismiss, action }) {
  const k = { info:'banner-info', success:'banner-success', warn:'banner-warn', error:'banner-error' }[kind]
  const defaultIcon = { info: <Icon.Info size={14}/>, success: <Icon.Check size={14}/>, warn: <Icon.Alert size={14}/>, error: <Icon.Alert size={14}/> }[kind]
  return (
    <div className={`banner ${k} mt-3`}>
      <span className="mt-0.5">{defaultIcon}</span>
      <div className="flex-1 min-w-0">
        {title && <p className="text-[13px] font-semibold mb-0.5">{title}</p>}
        <div className="text-[12.5px] opacity-90">{children}</div>
        {action && <button onClick={action.onClick} className="mt-2 text-[11.5px] font-medium underline underline-offset-2">{action.label}</button>}
      </div>
      {onDismiss && <button onClick={onDismiss} className="text-ink3 hover:text-ink p-0.5 -mt-0.5"><Icon.X size={14}/></button>}
    </div>
  )
}

// ─── Empty ───────────────────────────────────────────────────────────────────

export function Empty({ title, sub, action, glyph }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6">
      <div className="w-12 h-12 rounded-xl bg-paper2 border border-line flex items-center justify-center text-ink3 mb-4">
        {glyph || <Icon.Sparkle size={20}/>}
      </div>
      <h3 className="text-[16px] font-semibold text-ink mb-1">{title}</h3>
      <p className="text-[13px] text-ink3 max-w-xs mb-4 leading-relaxed">{sub}</p>
      {action}
    </div>
  )
}

// ─── Confirm ─────────────────────────────────────────────────────────────────

export function Confirm({ open, onCancel, onConfirm, title, message, confirmLabel = 'Confirm', tone = 'primary', kicker }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} kicker={kicker} width="sm"
      footer={<>
        <Button variant="soft" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant={tone} size="sm" onClick={onConfirm}>{confirmLabel}</Button>
      </>}>
      <p className="text-[14px] text-ink2 leading-relaxed">{message}</p>
    </Modal>
  )
}

// ─── Kbd ─────────────────────────────────────────────────────────────────────

export function Kbd({ children }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-[4px] border border-line bg-paper text-ink2 font-mono text-[10.5px] leading-none">
      {children}
    </kbd>
  )
}

// ─── ProLock ─────────────────────────────────────────────────────────────────
// Wraps any element with a pro upgrade prompt. Pass locked=true to activate.

const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
)

export function ProLock({ locked = true, feature = 'Pro feature', children }) {
  if (!locked) return children
  return (
    <div className="relative group/lock inline-flex">
      <div className="opacity-50 pointer-events-none select-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-semibold cursor-pointer"
          style={{ background:'var(--ink)', color:'#fff', whiteSpace:'nowrap' }}>
          <LockIcon/> PRO
        </div>
      </div>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/lock:block z-50 pointer-events-none">
        <div className="card px-3 py-2 text-[12px] whitespace-nowrap"
          style={{ boxShadow:'0 8px 24px rgba(26,23,20,0.15)' }}>
          <p className="font-semibold text-ink mb-0.5">{feature}</p>
          <p className="text-ink3">Upgrade to Pro to unlock</p>
        </div>
      </div>
    </div>
  )
}

// ─── PageHeader ──────────────────────────────────────────────────────────────

export function PageHeader({ kicker, title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-6 pb-6 border-b border-line">
      <div>
        {kicker && <p className="kicker mb-1.5">{kicker}</p>}
        <h1 className="text-[28px] font-semibold tracking-[-0.015em] leading-[1.1] text-ink">{title}</h1>
        {sub && <p className="mt-1.5 text-[14px] text-ink2 max-w-xl leading-relaxed">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-shrink-0">{right}</div>}
    </div>
  )
}
