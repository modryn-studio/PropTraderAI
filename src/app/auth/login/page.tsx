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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="card text-center">
            <div className="w-16 h-16 bg-profit/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-profit" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-content-secondary mb-6">
              We sent a magic link to <span className="text-content-primary font-medium">{email}</span>
            </p>
            <p className="text-content-tertiary text-sm">
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-content-secondary hover:text-content-primary transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        {/* Logo */}
        <div className="font-display font-bold text-2xl mb-2">
          PropTrader<span className="text-accent-cyan">.AI</span>
        </div>
        <p className="text-content-secondary mb-8">
          Sign in to start trading with AI
        </p>

        {/* Login Form */}
        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-content-tertiary" />
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
              <div className="bg-error/10 border border-error/30 rounded-lg p-3 text-sm text-error">
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

          <div className="mt-6 pt-6 border-t border-line-subtle text-center text-sm text-content-tertiary">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-accent-cyan hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-accent-cyan hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
