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
            Auth + Billing in 5 Minutes
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Stop building authentication and Stripe integration.
            <br />
            Just use our API. $29/mo.
          </p>

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

          {/* Pricing */}
          <div className="bg-gray-800 p-8 rounded-lg max-w-md mx-auto mb-16">
            <h3 className="text-3xl font-bold mb-4">$29/mo</h3>
            <ul className="text-left space-y-3 mb-6">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Auth + Billing API
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Usage tracking & limits
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Your Stripe account
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Webhook handling
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Customer portal
              </li>
            </ul>
            <a href="#signup" className="block w-full py-3 bg-blue-600 rounded font-bold hover:bg-blue-700">
              Start Free Trial
            </a>
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

          {/* Signup */}
          <div id="signup" className="max-w-md mx-auto">
            <h3 className="text-2xl font-bold mb-6">Get Started</h3>
            <a
              href="/sign-up"
              className="block w-full py-4 bg-blue-600 rounded font-bold text-xl hover:bg-blue-700 text-center"
            >
              Sign Up Now
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
