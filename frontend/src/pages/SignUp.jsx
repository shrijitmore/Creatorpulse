import React from 'react'
import { SignUp } from '@clerk/clerk-react'
import { Wordmark } from '../components/ui.jsx'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-paper px-4">
      <div className="mb-8">
        <Wordmark withTag />
      </div>
      <SignUp
        signInUrl="/sign-in"
        fallbackRedirectUrl="/onboarding"
        appearance={{
          variables: {
            colorPrimary: '#C47338',
            colorBackground: '#FFFFFF',
            colorInputBackground: '#FFFFFF',
            colorInputText: '#1A1714',
            borderRadius: '10px',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '14px',
          },
          elements: {
            rootBox: 'w-full max-w-[400px]',
            card: 'shadow-pop border border-line rounded-xl',
            headerTitle: 'text-ink font-semibold tracking-tight',
            headerSubtitle: 'text-ink3',
            formButtonPrimary: 'btn btn-primary w-full justify-center',
            formFieldInput: 'field',
            footerActionLink: 'text-terra hover:text-terradeep font-medium',
          }
        }}
      />
    </div>
  )
}
