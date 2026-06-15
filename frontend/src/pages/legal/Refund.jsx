import React from 'react'
import { Link } from 'react-router-dom'
import LegalDoc from './LegalDoc.jsx'

export default function Refund() {
  return (
    <LegalDoc
      title="Refund & Cancellation Policy"
      description="How cancellations and refunds work on Influensa."
      path="/refund"
      updated="15 June 2026">
      <p>
        This policy explains how billing, cancellations, and refunds work for Influensa subscriptions,
        operated by <strong>[LEGAL ENTITY NAME]</strong>.
      </p>

      <h2>1. Subscriptions</h2>
      <p>
        Paid plans are billed via Razorpay and renew automatically (monthly or yearly) until cancelled.
        You can review plan prices on the <Link to="/pricing">pricing page</Link>.
      </p>

      <h2>2. Cancellation</h2>
      <p>
        You may cancel anytime from your account settings. Cancellation stops future renewals; you keep paid
        access until the end of your current billing period. We do not pro-rate partial periods.
      </p>

      <h2>3. Refunds</h2>
      <p>
        Because Influensa is a digital service consumed immediately, fees are generally non-refundable once a
        billing period has started. We may, at our discretion, issue a refund within <strong>7 days</strong> of a
        charge if the Service was materially unavailable or in cases of accidental duplicate billing.
      </p>

      <h2>4. How to request a refund</h2>
      <p>
        Email <a href="mailto:billing@influensa.xyz">billing@influensa.xyz</a> from your account email with your
        payment ID and reason. Approved refunds are processed to your original payment method within
        <strong> 5–10 business days</strong> (timing depends on your bank/Razorpay).
      </p>

      <h2>5. Free tier</h2>
      <p>The free plan is free forever and involves no charges or refunds.</p>

      <h2>6. Contact</h2>
      <p>
        Questions about billing? Visit our <Link to="/contact">contact page</Link> or email
        <a href="mailto:billing@influensa.xyz"> billing@influensa.xyz</a>.
      </p>
    </LegalDoc>
  )
}
