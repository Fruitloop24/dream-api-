/**
 * ============================================================================
 * STYLING PAGE - BRANDING & CUSTOMIZATION
 * ============================================================================
 *
 * Collects branding information:
 * - App name
 * - Logo (URL or upload)
 * - Primary color
 * - Value proposition
 * - Description
 * - Hero image (URL or upload)
 */

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const CONFIG_API_URL = import.meta.env.VITE_CONFIG_API_URL || 'https://config-api.k-c-sheffield012376.workers.dev';
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'https://deploy-orchestrator.k-c-sheffield012376.workers.dev';

export default function Styling() {
  const { getToken } = useAuth();

  const [branding, setBranding] = useState({
    appName: '',
    logoUrl: '',
    primaryColor: '#0f172a', // slate-900
    valueProp: '',
    description: '',
    heroImageUrl: '',
  });

  const [deploying, setDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('');

  const handleSubmit = async () => {
    // Validate required fields
    if (!branding.appName) {
      alert('Please enter your app name');
      return;
    }

    if (!branding.valueProp) {
      alert('Please enter a value proposition');
      return;
    }

    try {
      // Step 1: Verify JWT with config-api to get userId
      const token = await getToken();
      if (!token) {
        alert('Authentication failed. Please log in again.');
        return;
      }

      const authResponse = await fetch(`${CONFIG_API_URL}/verify-auth`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!authResponse.ok) {
        const errorData = await authResponse.json();
        console.error('[Styling] Auth failed:', errorData);
        throw new Error('Authentication failed');
      }

      const { userId } = await authResponse.json();
      console.log('[Styling] Got userId from Clerk:', userId);

      // Step 2: Get tier config from localStorage (saved by Configure page)
      const tierConfigJson = localStorage.getItem('tierConfig');
      if (!tierConfigJson) {
        throw new Error('Tier configuration not found. Please go back to Configure page.');
      }
      const tierConfig = JSON.parse(tierConfigJson);
      console.log('[Styling] Loaded tier config from localStorage:', tierConfig);

      // Step 3: Trigger deployment via orchestrator with FULL config (no KV needed!)
      setDeploymentStatus('✓ Starting deployment...');
      setDeploying(true);

      try {
        const deployResponse = await fetch(`${ORCHESTRATOR_URL}/deploy/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            tierConfig,
            branding
          })
        });

        if (!deployResponse.ok) {
          throw new Error('Failed to trigger deployment');
        }

        const deployData = await deployResponse.json();

        setDeploymentStatus('✓ Deployment triggered! Building preview...');

        // Poll for deployment status (or use webhook in future)
        // For now, show deployment ID
        if (deployData.deploymentId) {
          setDeploymentStatus(`✓ Deployment started! ID: ${deployData.deploymentId}\n\nWatch progress at: https://github.com/Fruitloop24/fact-saas-v2/actions`);
        }

        // TODO: Poll for completion and get preview URLs
        // For now, user can check GitHub Actions

      } catch (deployError) {
        console.error('Deployment error:', deployError);
        setDeploymentStatus(`✗ Deployment failed: ${deployError instanceof Error ? deployError.message : 'Unknown error'}`);
      } finally {
        setDeploying(false);
      }

    } catch (error) {
      console.error('Error saving branding config:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      setDeploymentStatus(`✗ Failed: ${message}`);
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Style Your SaaS</h1>
          <p className="text-xl text-slate-600">Make it yours with your branding</p>
        </div>

        <div className="space-y-8">
          {/* App Name */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                App Name *
              </span>
              <input
                type="text"
                value={branding.appName}
                onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
                placeholder="My Awesome SaaS"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                This will appear in your navbar and footer
              </p>
            </label>
          </div>

          {/* Logo */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Logo URL (optional)
              </span>
              <input
                type="url"
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                Leave blank to use text logo. Recommended size: 120x40px
              </p>
            </label>
          </div>

          {/* Primary Color */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Primary Brand Color
              </span>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-20 h-12 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={branding.primaryColor}
                  onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  placeholder="#0f172a"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-slate-900 font-mono"
                />
              </div>
              <p className="text-slate-500 text-sm mt-2">
                This color will be used for buttons, links, and accents
              </p>
            </label>
          </div>

          {/* Value Proposition */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Value Proposition *
              </span>
              <input
                type="text"
                value={branding.valueProp}
                onChange={(e) => setBranding({ ...branding, valueProp: e.target.value })}
                placeholder="Deploy Your SaaS in 5 Minutes"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                Short, punchy headline for your landing page (5-10 words)
              </p>
            </label>
          </div>

          {/* Description */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Description (optional)
              </span>
              <textarea
                value={branding.description}
                onChange={(e) => setBranding({ ...branding, description: e.target.value })}
                placeholder="A powerful SaaS platform that helps you..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                1-2 sentences explaining what your app does
              </p>
            </label>
          </div>

          {/* Hero Image */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Hero Image URL (optional)
              </span>
              <input
                type="url"
                value={branding.heroImageUrl}
                onChange={(e) => setBranding({ ...branding, heroImageUrl: e.target.value })}
                placeholder="https://example.com/hero.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                Large image for landing page hero section. Recommended size: 1200x800px
              </p>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="text-center mt-12">
          <button
            onClick={handleSubmit}
            disabled={deploying}
            className={`px-12 py-4 text-white border-none rounded-lg font-bold text-lg transition-colors cursor-pointer ${
              deploying ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {deploying ? 'Deploying...' : 'Deploy Preview →'}
          </button>
          <p className="mt-4 text-slate-500 text-sm">
            We'll create a live preview of your SaaS in ~5 minutes
          </p>

          {/* Deployment Status */}
          {deploymentStatus && (
            <div className={`mt-6 p-6 rounded-lg ${
              deploymentStatus.startsWith('✗') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-sm whitespace-pre-line ${
                deploymentStatus.startsWith('✗') ? 'text-red-800' : 'text-green-800'
              }`}>
                {deploymentStatus}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
