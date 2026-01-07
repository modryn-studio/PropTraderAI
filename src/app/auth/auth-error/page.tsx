import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card text-center">
          <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-error" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Authentication Error</h1>
          <p className="text-content-secondary mb-6">
            There was a problem signing you in. The link may have expired or already been used.
          </p>
          <Link href="/auth/login" className="btn-primary inline-block">
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}
