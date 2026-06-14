import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { Icon } from '../components/ui.jsx'
import { PLANS } from '../constants/plans.js'
import { COLORS } from '../constants/theme.js'
import { createSubscription, verifySubscription, redeemCode } from '../lib/api.js'

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) { resolve(true); return }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function Checkout() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const planId = params.get('plan') || 'pro'
  const [cycle, setCycle] = useState(params.get('cycle') === 'yearly' ? 'yearly' : 'monthly')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [error, setError] = useState('')

  const plan = PLANS.find(p => p.id === planId) || PLANS[1]
  const basePrice = plan.price
  const cyclePrice = cycle === 'yearly' ? Math.round(basePrice * 0.8) : basePrice
  const totalPrice = cycle === 'yearly' ? cyclePrice * 12 : cyclePrice

  useEffect(() => {
    if (!plan || plan.id === 'free') navigate('/plans', { replace: true })
  }, [plan, navigate])

  const handleRedeem = async () => {
    if (!code.trim()) return
    setRedeeming(true)
    setError('')
    try {
      const result = await redeemCode(code.trim())
      if (result?.granted) {
        navigate(`/plans/success?plan=${result.plan || planId}`)
      } else {
        setError('This code is not valid.')
      }
    } catch {
      setError('This code is not valid or has expired.')
    } finally {
      setRedeeming(false)
    }
  }

  const handlePay = async () => {
    setLoading(true)
    setError('')
    try {
      const ok = await loadRazorpay()
      if (!ok) throw new Error('Payment system failed to load. Please try again.')

      const sub = await createSubscription({ planId, cycle })

      if (sub.simulated) {
        navigate(`/plans/success?plan=${planId}`)
        return
      }

      const options = {
        key: sub.keyId,
        subscription_id: sub.subscriptionId,
        name: 'Influensa',
        description: `${plan.name} · ${cycle === 'yearly' ? 'Yearly' : 'Monthly'}`,
        prefill: {
          name: user?.fullName || '',
          email: user?.primaryEmailAddress?.emailAddress || '',
        },
        theme: { color: '#0A0A0A' },
        modal: { backdropclose: false },
        handler: async (response) => {
          try {
            await verifySubscription({
              paymentId: response.razorpay_payment_id,
              subscriptionId: response.razorpay_subscription_id,
              signature: response.razorpay_signature,
              planId,
              cycle,
            })
            navigate(`/plans/success?plan=${planId}`)
          } catch {
            setError('Payment verification failed. Contact support if amount was deducted.')
            setLoading(false)
          }
        },
        'modal.ondismiss': () => setLoading(false),
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', (resp) => {
        setError(resp.error?.description || 'Payment failed. Please try again.')
        setLoading(false)
      })
      rzp.open()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  if (!plan) return null

  const cycleButtons = ['monthly', 'yearly'].map(c => (
    <button
      key={c}
      onClick={() => setCycle(c)}
      style={{
        flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer',
        background: cycle === c ? 'var(--paper)' : 'transparent',
        color: cycle === c ? 'var(--ink)' : 'var(--mute)',
        fontSize: 13, fontWeight: cycle === c ? 500 : 400,
        boxShadow: cycle === c ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s',
      }}>
      {c === 'monthly' ? 'Monthly' : 'Yearly · save 20%'}
    </button>
  ))

  const featureItems = plan.features.map(f => (
    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)' }}>
      <Icon.Check size={12} stroke={2.5} style={{ color: 'var(--ink)', flexShrink: 0 }}/>
      {f}
    </li>
  ))

  return (
    <div className="app-main">
      <div className="app-top" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => navigate('/plans')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, padding: 0 }}>
          <Icon.ChevL size={14}/> Back
        </button>
        <div>
          <span className="kicker">Checkout</span>
          <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', marginTop: 4 }}>
            Complete your upgrade
          </h1>
        </div>
      </div>

      <div className="billing-checkout">

        {/* Order summary */}
        <div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <span className="kicker">Order summary</span>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>Influensa {plan.name}</p>
                  <p style={{ fontSize: 13, color: 'var(--mute)', marginTop: 3 }}>Billed {cycle === 'yearly' ? 'annually' : 'monthly'} · auto-renews</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
                    ₹{cyclePrice.toLocaleString('en-IN')}<span style={{ fontSize: 13, fontWeight: 400, color: 'var(--mute)' }}>/mo</span>
                  </p>
                  {cycle === 'yearly' && (
                    <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 2 }}>₹{totalPrice.toLocaleString('en-IN')} billed now</p>
                  )}
                </div>
              </div>

              {/* Billing cycle toggle */}
              <div style={{ background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10, padding: 4, display: 'flex', marginBottom: 20 }}>
                {cycleButtons}
              </div>

              {/* Features included */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <p style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--mute)', marginBottom: 10 }}>Included</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {featureItems}
                </ul>
              </div>

              {/* Totals */}
              <div style={{ borderTop: '1px solid var(--line)', marginTop: 20, paddingTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: 'var(--mute)' }}>{cycle === 'yearly' ? 'Billed annually' : 'Billed monthly'}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink)' }}>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Due today</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Payment panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              <span className="kicker">Payment</span>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 10, background: COLORS.errorsoft, border: `1px solid ${COLORS.error}40` }}>
                  <p style={{ fontSize: 12.5, color: COLORS.error }}>{error}</p>
                </div>
              )}

              <button
                onClick={handlePay}
                disabled={loading || redeeming}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12,
                  background: loading ? 'var(--paper-3)' : 'var(--ink)',
                  color: loading ? 'var(--mute)' : 'var(--paper)',
                  border: 'none', cursor: loading ? 'default' : 'pointer',
                  fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
                  transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}>
                {loading ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid var(--mute)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
                    Processing…
                  </>
                ) : (
                  <>
                    Subscribe · ₹{totalPrice.toLocaleString('en-IN')}
                    <Icon.Arrow size={14}/>
                  </>
                )}
              </button>

              {/* Access code */}
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <label className="label">Have an access code?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    className="input"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setError('') }}
                    placeholder="e.g. FREEPRO"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={handleRedeem}
                    disabled={!code.trim() || redeeming}
                    className="btn btn-line"
                    style={{ height: 44, padding: '0 14px', borderRadius: 10, flexShrink: 0 }}>
                    {redeeming ? '…' : 'Redeem'}
                  </button>
                </div>
                <p style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 6 }}>Redeeming a code grants access instantly — no payment needed.</p>
              </div>

              <p style={{ fontSize: 11.5, color: 'var(--mute)', textAlign: 'center', lineHeight: 1.6 }}>
                Secured by Razorpay · PCI-DSS Level 1<br/>
                Cancel anytime from settings · No hidden fees
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
