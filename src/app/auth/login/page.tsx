'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Mail, Loader2, Check } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 bg-[rgba(0,255,209,0.15)] flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-[#00FFD1]" />
            </div>
            <h1 className="font-mono text-2xl font-bold mb-2 text-white">Check your email</h1>
            <p className="text-[rgba(255,255,255,0.85)] mb-6">
              We sent a magic link to <span className="text-white font-medium">{email}</span>
            </p>
            <p className="text-[rgba(255,255,255,0.5)] text-sm">
              Click the link in the email to sign in. The link expires in 1 hour.
            </p>
            <button
              onClick={() => setSent(false)}
              className="btn-secondary mt-6 w-full"
            >
              Try a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[rgba(255,255,255,0.85)] hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="app-logo text-2xl mb-2">
          PropTrader<span className="app-logo-accent">.AI</span>
        </div>
        <p className="text-[rgba(255,255,255,0.85)] mb-8">
          Sign in to start trading with AI
        </p>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2 text-white">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[rgba(255,255,255,0.5)]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="terminal-input w-full pl-10"
                />
              </div>
            </div>

            {error && (
              <div className="bg-[rgba(181,50,61,0.1)] border border-[rgba(181,50,61,0.3)] p-3 text-sm text-[#b5323d]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send magic link'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[rgba(255,255,255,0.1)] text-center text-sm text-[rgba(255,255,255,0.5)]">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-[#00FFD1] hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-[#00FFD1] hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
