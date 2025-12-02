/**
 * Preview Styling - Final branding touches
 * Hero image, description, etc.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PreviewStyling() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [styling, setStyling] = useState({
    valueProp: '',
    description: '',
    heroImageUrl: '',
  });

  const handleSubmit = async () => {
    // Validate
    if (!styling.valueProp) {
      alert('Please enter a value proposition');
      return;
    }

    setLoading(true);

    try {
      // Get branding and tiers from localStorage
      const brandingJson = localStorage.getItem('previewBranding');
      const tiersJson = localStorage.getItem('previewTiers');

      if (!brandingJson || !tiersJson) {
        alert('Missing configuration. Please go back and complete all steps.');
        setLoading(false);
        return;
      }

      const branding = JSON.parse(brandingJson);
      const tiers = JSON.parse(tiersJson);

      // Combine everything
      const fullConfig = {
        ...branding,
        ...styling,
        ...tiers,
      };

      // Save full config
      localStorage.setItem('previewConfig', JSON.stringify(fullConfig));

      // TODO: Send to worker to generate preview site
      // For now, go to preview-ready page

      navigate('/preview-ready');
    } catch (error) {
      console.error('Error saving styling:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Final Touches</h1>
          <p className="text-xl text-slate-600">Add your messaging and images</p>
        </div>

        {/* Progress */}
        <div className="mb-12 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Step 3 of 3:</span>
            <span className="text-slate-900 font-bold">Styling & Content</span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Value Proposition */}
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <label className="block">
              <span className="text-slate-900 font-semibold mb-2 block">
                Value Proposition *
              </span>
              <input
                type="text"
                value={styling.valueProp}
                onChange={(e) => setStyling({ ...styling, valueProp: e.target.value })}
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
                value={styling.description}
                onChange={(e) => setStyling({ ...styling, description: e.target.value })}
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
                value={styling.heroImageUrl}
                onChange={(e) => setStyling({ ...styling, heroImageUrl: e.target.value })}
                placeholder="https://example.com/hero.jpg"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
              />
              <p className="text-slate-500 text-sm mt-2">
                Large image for landing page hero. Recommended: 1200x800px
              </p>
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="text-center mt-12">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`px-12 py-4 text-white rounded-lg font-bold text-lg transition-colors ${
              loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {loading ? 'Creating Preview...' : 'See Your Preview →'}
          </button>
          <p className="mt-4 text-slate-500 text-sm">
            We'll show you a live preview with your branding
          </p>
        </div>
      </div>
    </div>
  );
}
