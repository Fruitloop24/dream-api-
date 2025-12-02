/**
 * Setup Page - Preview Branding
 * Simple branding setup for free preview (no OAuth needed)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Setup() {
  const navigate = useNavigate();

  const [branding, setBranding] = useState({
    appName: '',
    logoUrl: '',
    primaryColor: '#0f172a',
  });

  const handleNext = () => {
    // Validate
    if (!branding.appName) {
      alert('Please enter your app name');
      return;
    }

    // Save to localStorage
    localStorage.setItem('previewBranding', JSON.stringify(branding));

    // Go to tier configuration
    navigate('/preview-configure');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Let's Build Your Preview</h1>
          <p className="text-xl text-slate-600">Start with your branding</p>
        </div>

        {/* Progress */}
        <div className="mb-12 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Step 1 of 3:</span>
            <span className="text-slate-900 font-bold">Branding</span>
          </div>
        </div>

        <div className="space-y-6">
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
                This will appear in your navbar and landing page
              </p>
            </label>
          </div>

          {/* Logo URL */}
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
                Leave blank to use text logo. Recommended: 120x40px
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
                This color will be used for buttons and accents
              </p>
            </label>
          </div>
        </div>

        {/* Next Button */}
        <div className="text-center mt-12">
          <button
            onClick={handleNext}
            className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-lg transition-colors"
          >
            Next: Configure Tiers →
          </button>
        </div>
      </div>
    </div>
  );
}
