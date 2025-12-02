/**
 * Landing Page - dream-api
 *
 * Simple marketing page with signup
 */

import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

export default function Landing() {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isSignedIn) {
      navigate('/dashboard');
    }
  }, [isSignedIn, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">dream-api</h1>
          <a href="#signup" className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">
            Get Started
          </a>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-5xl font-bold mb-6">
            See Your SaaS Working in 5 Minutes
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Configure your branding, tiers, and billing.
            <br />
            Get a live preview with auth + payments already working.
          </p>

          {/* CTA Button */}
          <div className="mb-16">
            <a
              href="/sign-up"
              className="inline-block px-12 py-5 bg-blue-600 rounded-lg font-bold text-2xl hover:bg-blue-700 transition-colors"
            >
              Try Free Preview →
            </a>
            <p className="text-gray-400 text-sm mt-4">
              No credit card required. See it working first.
            </p>
          </div>

          {/* Value Props */}
          <div className="grid md:grid-cols-3 gap-6 my-16">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="font-bold mb-2">Authentication</h3>
              <p className="text-gray-400 text-sm">
                Secure user auth handled for you
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl mb-4">💳</div>
              <h3 className="font-bold mb-2">Stripe Billing</h3>
              <p className="text-gray-400 text-sm">
                Subscriptions & one-offs, your Stripe account
              </p>
            </div>
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="font-bold mb-2">Usage Tracking</h3>
              <p className="text-gray-400 text-sm">
                Automatic tier limits & enforcement
              </p>
            </div>
          </div>

          {/* How It Works */}
          <div className="bg-gray-800 p-8 rounded-lg max-w-2xl mx-auto mb-16">
            <h3 className="text-2xl font-bold mb-6">How It Works</h3>
            <div className="grid gap-4 text-left">
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-blue-500">1</div>
                <div>
                  <h4 className="font-bold mb-1">Configure Your SaaS</h4>
                  <p className="text-gray-400 text-sm">Add your branding, pricing tiers, and features (2 minutes)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-blue-500">2</div>
                <div>
                  <h4 className="font-bold mb-1">See It Live</h4>
                  <p className="text-gray-400 text-sm">Get a working preview with auth, billing, and customer portal (instant)</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-blue-500">3</div>
                <div>
                  <h4 className="font-bold mb-1">Love It? Deploy It</h4>
                  <p className="text-gray-400 text-sm">Subscribe for $29/mo, get your API key, connect your Stripe</p>
                </div>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div className="text-left bg-gray-900 p-6 rounded-lg mb-16">
            <p className="text-gray-400 text-sm mb-2">That's it. Really.</p>
            <pre className="text-green-400 text-sm overflow-x-auto">
{`// Track usage
fetch('https://api.dream-api.com/api/data', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'X-User-Id': userId,
    'X-User-Plan': 'free'
  }
})

// Upgrade user
fetch('https://api.dream-api.com/api/create-checkout', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' },
  body: JSON.stringify({ tier: 'pro' })
})`}
            </pre>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-br from-blue-900 to-blue-800 p-8 rounded-lg max-w-md mx-auto mb-16">
            <h3 className="text-3xl font-bold mb-2">$29/mo</h3>
            <p className="text-blue-200 mb-6">After you love the preview</p>
            <ul className="text-left space-y-3 mb-6">
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Production API credentials
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Connect your Stripe account
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Unlimited API calls
              </li>
              <li className="flex items-center">
                <span className="text-green-400 mr-2">✓</span>
                Your customers pay you directly
              </li>
            </ul>
          </div>

          {/* Signup */}
          <div id="signup" className="max-w-md mx-auto">
            <a
              href="/sign-up"
              className="block w-full py-4 bg-blue-600 rounded-lg font-bold text-xl hover:bg-blue-700 text-center"
            >
              Try Free Preview Now →
            </a>
            <p className="text-center text-gray-400 text-sm mt-4">
              Already have an account?{' '}
              <a href="/sign-in" className="text-blue-400 hover:text-blue-300">
                Sign in
              </a>
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>© 2025 dream-api. Built on Cloudflare + Clerk + Stripe.</p>
      </footer>
    </div>
  );
}
