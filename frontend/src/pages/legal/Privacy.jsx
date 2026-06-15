import React from 'react'
import { Link } from 'react-router-dom'
import LegalDoc from './LegalDoc.jsx'

export default function Privacy() {
  return (
    <LegalDoc
      title="Privacy Policy"
      description="How Influensa collects, uses, and protects your data."
      path="/privacy"
      updated="15 June 2026">
      <p>
        This Privacy Policy explains how <strong>[LEGAL ENTITY NAME]</strong> ("we") handles your data when you
        use Influensa. We collect only what we need to run the Service.
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li><strong>Account data</strong> — name and email, via our auth provider Clerk.</li>
        <li><strong>Profile &amp; content</strong> — niches, voice samples, prompts, and scripts you create.</li>
        <li><strong>Usage data</strong> — pages visited, features used, device/browser info, via analytics.</li>
        <li><strong>Payment data</strong> — handled entirely by Razorpay. We never see or store card numbers.</li>
      </ul>

      <h2>2. How we use it</h2>
      <ul>
        <li>To provide and personalise the Service (trend feeds, AI scripts in your voice).</li>
        <li>To process payments and manage subscriptions.</li>
        <li>To improve reliability, security, and product quality.</li>
        <li>To communicate important account and service updates.</li>
      </ul>

      <h2>3. Sub-processors</h2>
      <p>We share data with vetted processors strictly to operate the Service:</p>
      <ul>
        <li><strong>Clerk</strong> — authentication.</li>
        <li><strong>Razorpay</strong> — payments (PCI-DSS Level 1).</li>
        <li><strong>Google Cloud (Vertex AI / Gemini)</strong> — AI processing of your prompts/content.</li>
        <li><strong>Supabase</strong> — database hosting.</li>
        <li><strong>Google Analytics &amp; Microsoft Clarity</strong> — anonymised usage analytics.</li>
      </ul>

      <h2>4. Cookies &amp; analytics</h2>
      <p>
        We use essential cookies for authentication and privacy-respecting analytics (IP anonymisation enabled).
        You can block non-essential cookies via your browser.
      </p>

      <h2>5. Data retention</h2>
      <p>
        We keep your data while your account is active. On deletion, we remove personal data within a reasonable
        period, except where retention is legally required.
      </p>

      <h2>6. Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal data, and you may object to certain
        processing. Contact us to exercise these rights.
      </p>

      <h2>7. International transfers</h2>
      <p>
        Your data may be processed in countries other than yours (e.g., where our processors operate). We rely on
        appropriate safeguards for such transfers.
      </p>

      <h2>8. Children</h2>
      <p>The Service is not intended for anyone under 18, and we do not knowingly collect their data.</p>

      <h2>9. Contact</h2>
      <p>
        Privacy questions? Use our <Link to="/contact">contact page</Link> or email
        <a href="mailto:privacy@influensa.xyz"> privacy@influensa.xyz</a>.
      </p>
    </LegalDoc>
  )
}
