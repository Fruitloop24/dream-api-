'use client'

/**
 * COMPLETE - Post sign-up redirect handler
 *
 * Clerk redirects here after sign-up completes.
 * We just redirect to dashboard.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getThemeClasses } from '@/lib/config';

export default function CompletePage() {
  const router = useRouter();
  const theme = getThemeClasses();

  useEffect(() => {
    // Small delay to let Clerk session settle, then redirect
    const timer = setTimeout(() => {
      router.replace('/dashboard');
    }, 500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className={`min-h-screen ${theme.pageBg} flex items-center justify-center`}>
      <div className="text-center">
        <div className={`w-8 h-8 border-2 ${theme.progressBg} border-t-current rounded-full animate-spin mx-auto mb-4 ${theme.body}`} />
        <p className={theme.body}>Setting up your account...</p>
      </div>
    </div>
  );
}
