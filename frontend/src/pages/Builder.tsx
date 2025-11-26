/**
 * ============================================================================
 * UNIFIED BUILDER - Single page for SaaS configuration
 * ============================================================================
 *
 * Combines Configure + Styling into one page with:
 * - Dropdown for SaaS types
 * - Card-based tier configuration
 * - Integrated branding
 * - AI chat interface
 * - Live preview
 */

import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';

const CONFIG_API_URL = import.meta.env.VITE_CONFIG_API_URL || 'https://config-api.k-c-sheffield012376.workers.dev';
const ORCHESTRATOR_URL = import.meta.env.VITE_ORCHESTRATOR_URL || 'https://deploy-orchestrator.k-c-sheffield012376.workers.dev';
const AI_WORKER_URL = import.meta.env.VITE_AI_WORKER_URL || 'https://ai-config-worker.k-c-sheffield012376.workers.dev';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  features: string;
  popular: boolean;
}

interface Branding {
  appName: string;
  logoUrl: string;
  primaryColor: string;
  valueProp: string;
  description: string;
  heroImageUrl: string;
}

export default function Builder() {
  const { getToken } = useAuth();

  // SaaS type selection
  const [saasType, setSaasType] = useState('custom');

  // Product configuration
  const [productName, setProductName] = useState('');
  const [numTiers, setNumTiers] = useState<number>(2);
  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 25, features: 'Basic features,Community support', popular: false },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 'unlimited', features: 'All features,Priority support,API access', popular: true },
  ]);

  // Branding
  const [branding, setBranding] = useState<Branding>({
    appName: '',
    logoUrl: '',
    primaryColor: '#0f172a',
    valueProp: '',
    description: '',
    heroImageUrl: '',
  });

  // AI integration
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [customDirections, setCustomDirections] = useState('');

  // Deployment
  const [deploying, setDeploying] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [_showPreviewDialog, setShowPreviewDialog] = useState(false);

  // SaaS type presets
  const saasTypes = [
    { value: 'custom', label: 'Custom', description: 'Build from scratch' },
    { value: 'membership', label: 'Membership Site', description: 'Content library, paywall access' },
    { value: 'consulting', label: 'Consulting Business', description: 'Appointments, service packages' },
    { value: 'course', label: 'Course Platform', description: 'Video courses, progress tracking' },
    { value: 'tool', label: 'SaaS Tool', description: 'Software with usage limits' },
  ];

  const handleSaaSTypeChange = (type: string) => {
    setSaasType(type);

    // Apply presets
    switch (type) {
      case 'membership':
        setTiers([
          { name: 'free', displayName: 'Free', price: 0, limit: 5, features: 'Sample content,Community access', popular: false },
          { name: 'premium', displayName: 'Premium', price: 19, limit: 'unlimited', features: 'All content,Early access,Priority support', popular: true },
        ]);
        setBranding({ ...branding, valueProp: 'Premium Content Membership' });
        break;
      case 'consulting':
        setTiers([
          { name: 'discovery', displayName: 'Discovery Call', price: 0, limit: 1, features: '30-minute consultation', popular: false },
          { name: 'monthly', displayName: 'Monthly Retainer', price: 299, limit: 'unlimited', features: 'Weekly calls,Email support,Strategy sessions', popular: true },
        ]);
        setBranding({ ...branding, valueProp: 'Expert Consulting Services' });
        break;
      case 'course':
        setTiers([
          { name: 'free', displayName: 'Free Trial', price: 0, limit: 3, features: 'Sample lessons,Community access', popular: false },
          { name: 'full', displayName: 'Full Course', price: 97, limit: 'unlimited', features: 'All lessons,Certificate,Community access', popular: true },
        ]);
        setBranding({ ...branding, valueProp: 'Professional Course Platform' });
        break;
      case 'tool':
        setTiers([
          { name: 'free', displayName: 'Free', price: 0, limit: 100, features: 'Basic features,Community support', popular: false },
          { name: 'pro', displayName: 'Pro', price: 49, limit: 'unlimited', features: 'Advanced features,API access,Priority support', popular: true },
        ]);
        setBranding({ ...branding, valueProp: 'Powerful SaaS Tool' });
        break;
    }
  };

  const handleNumTiersChange = (num: number) => {
    setNumTiers(num);
    const newTiers: Tier[] = [];
    for (let i = 0; i < num; i++) {
      newTiers.push(
        tiers[i] || {
          name: '',
          displayName: '',
          price: 0,
          limit: '',
          features: '',
          popular: false,
        }
      );
    }
    setTiers(newTiers);
  };

  const updateTier = (index: number, field: keyof Tier, value: any) => {
    const updated = [...tiers];
    updated[index] = { ...updated[index], [field]: value };
    setTiers(updated);
  };

  const handleAISubmit = async () => {
    if (!aiInput.trim()) return;

    setAiLoading(true);

    // TODO: Integrate with AI worker
    // For now, simulate AI processing
    setTimeout(() => {
      // Simple parsing for demo
      if (aiInput.toLowerCase().includes('membership')) {
        handleSaaSTypeChange('membership');
      } else if (aiInput.toLowerCase().includes('consulting')) {
        handleSaaSTypeChange('consulting');
      } else if (aiInput.toLowerCase().includes('course')) {
        handleSaaSTypeChange('course');
      } else if (aiInput.toLowerCase().includes('tool')) {
        handleSaaSTypeChange('tool');
      }

      setAiLoading(false);
      setAiInput('');
    }, 1500);
  };

  const handleDeploy = async () => {
    // Validate
    if (!productName) {
      alert('Please enter your product name');
      return;
    }

    if (!branding.appName) {
      alert('Please enter your app name');
      return;
    }

    if (!branding.valueProp) {
      alert('Please enter a value proposition');
      return;
    }

    const incomplete = tiers.some(t => !t.name || !t.displayName);
    if (incomplete) {
      alert('Please fill in all tier fields');
      return;
    }

    try {
      setDeploying(true);

      // Step 1: Verify JWT with config-api to get userId
      setDeploymentStatus('🔐 Authenticating...');
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
        console.error('[Builder] Auth failed:', errorData);
        throw new Error('Authentication failed');
      }

      const { userId } = await authResponse.json();
      console.log('[Builder] Got userId from Clerk:', userId);

      const tierConfig = {
        productName,
        tiers
      };

      let finalConfig: any = {
        userId,
        tierConfig,
        branding
      };

      // Step 2: If custom directions provided, call AI worker
      if (customDirections.trim()) {
        setDeploymentStatus('🤖 Processing AI customizations...');

        try {
          const aiResponse = await fetch(AI_WORKER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productName,
              tiers,
              branding,
              customDirections
            })
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            console.log('[Builder] AI enhanced config:', aiData);
            finalConfig = aiData.enhancedConfig;
            setDeploymentStatus(`✨ AI selected: ${aiData.selectedComponents.join(', ')}`);
          } else {
            console.warn('[Builder] AI worker failed, using original config');
          }
        } catch (aiError) {
          console.warn('[Builder] AI worker error, using original config:', aiError);
          // Continue with original config
        }
      }

      // Step 3: Trigger deployment
      setDeploymentStatus('🚀 Triggering deployment...');

      const deployResponse = await fetch(`${ORCHESTRATOR_URL}/deploy/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalConfig)
      });

      if (!deployResponse.ok) {
        const errorText = await deployResponse.text();
        throw new Error(`Deployment failed: ${errorText}`);
      }

      const deployData = await deployResponse.json();
      console.log('[Builder] Deploy response:', deployData);

      setDeploymentStatus('⏳ GitHub Actions is building your preview...');

      // Poll for deployment status
      if (deployData.deploymentId) {
        // Poll GitHub Actions or deployment status
        const pollInterval = setInterval(async () => {
          try {
            // Check if we have a preview URL in the response
            if (deployData.previewUrl) {
              clearInterval(pollInterval);
              setPreviewUrl(deployData.previewUrl);
              setDeploymentStatus('✅ Preview deployed successfully!');
              setShowPreviewDialog(true);
              setDeploying(false);
            }
          } catch (pollError) {
            console.error('[Builder] Polling error:', pollError);
          }
        }, 5000);

        // Stop polling after 2 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          if (!previewUrl) {
            setDeploymentStatus('⏱️ Deployment is taking longer than expected. Check your email for the preview URL.');
            setDeploying(false);
          }
        }, 120000);
      }

    } catch (error) {
      console.error('Deployment error:', error);
      setDeploymentStatus(`❌ Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeploying(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Build Your SaaS Template</h1>
          <p className="text-xl text-slate-600">Configure your template - we'll deploy it with auth, payments, and usage tracking pre-wired</p>
          <p className="text-sm text-slate-500 mt-2">After deployment, you can customize the template and push changes to your live site</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="lg:col-span-2 space-y-8">
            {/* AI Assistant */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">AI Assistant</h3>
              <p className="text-slate-600 mb-4">Describe your SaaS and we'll configure it for you</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="I want a membership site for my photography tutorials..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  disabled={aiLoading}
                />
                <button
                  onClick={handleAISubmit}
                  disabled={aiLoading || !aiInput.trim()}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white border-none rounded-lg font-semibold transition-colors cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
                >
                  {aiLoading ? '...' : 'Go'}
                </button>
              </div>
            </div>

            {/* SaaS Type */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">SaaS Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {saasTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => handleSaaSTypeChange(type.value)}
                    className={`p-4 border-2 rounded-lg text-left transition-colors cursor-pointer ${
                      saasType === type.value
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-semibold text-slate-900 mb-1">{type.label}</div>
                    <div className="text-sm text-slate-600">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Product Configuration */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Product & Pricing</h3>

              {/* Product Name */}
              <label className="block mb-6">
                <span className="text-slate-900 font-semibold mb-2 block">Product Name</span>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="My Awesome SaaS"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                />
              </label>

              {/* Number of Tiers */}
              <div className="mb-6">
                <h4 className="text-slate-900 font-semibold mb-4">Number of Pricing Tiers</h4>
                <div className="flex gap-4">
                  {[2, 3, 4].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleNumTiersChange(num)}
                      className={`px-6 py-3 border-2 rounded-lg font-semibold transition-colors cursor-pointer ${
                        numTiers === num
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {num} Tiers
                    </button>
                  ))}
                </div>
              </div>

              {/* Tier Cards */}
              <div className="space-y-6">
                {tiers.map((tier, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <h4 className="text-lg font-bold text-slate-900 mb-4">
                      Tier {index + 1} {tier.popular && <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded ml-2">Popular</span>}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <label className="block">
                        <span className="text-slate-700 text-sm font-semibold mb-2 block">Tier ID</span>
                        <input
                          type="text"
                          value={tier.name}
                          onChange={(e) => updateTier(index, 'name', e.target.value.toLowerCase())}
                          placeholder="free, pro, enterprise"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-700 text-sm font-semibold mb-2 block">Display Name</span>
                        <input
                          type="text"
                          value={tier.displayName}
                          onChange={(e) => updateTier(index, 'displayName', e.target.value)}
                          placeholder="Free, Pro, Enterprise"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <label className="block">
                        <span className="text-slate-700 text-sm font-semibold mb-2 block">Price ($/month)</span>
                        <input
                          type="text"
                          value={tier.price}
                          onChange={(e) => updateTier(index, 'price', Number(e.target.value) || 0)}
                          placeholder="0, 29, 99"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                        />
                      </label>
                      <label className="block">
                        <span className="text-slate-700 text-sm font-semibold mb-2 block">Monthly Limit</span>
                        <input
                          type="text"
                          value={tier.limit}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateTier(index, 'limit', val === 'unlimited' ? 'unlimited' : Number(val) || val);
                          }}
                          placeholder="5, 100, unlimited"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                        />
                      </label>
                    </div>

                    <label className="block mb-4">
                      <span className="text-slate-700 text-sm font-semibold mb-2 block">Features (comma-separated)</span>
                      <input
                        type="text"
                        value={tier.features}
                        onChange={(e) => updateTier(index, 'features', e.target.value)}
                        placeholder="API access, Email support, Priority support"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                      />
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tier.popular}
                        onChange={(e) => updateTier(index, 'popular', e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-slate-700 text-sm font-semibold">
                        Show "Popular" badge
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Branding */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Branding</h3>

              <div className="space-y-6">
                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">App Name *</span>
                  <input
                    type="text"
                    value={branding.appName}
                    onChange={(e) => setBranding({ ...branding, appName: e.target.value })}
                    placeholder="My Awesome SaaS"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">Logo URL (optional)</span>
                  <input
                    type="url"
                    value={branding.logoUrl}
                    onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">Primary Color</span>
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
                </label>

                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">Value Proposition *</span>
                  <input
                    type="text"
                    value={branding.valueProp}
                    onChange={(e) => setBranding({ ...branding, valueProp: e.target.value })}
                    placeholder="Deploy Your SaaS in 48 Seconds"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">Description (optional)</span>
                  <textarea
                    value={branding.description}
                    onChange={(e) => setBranding({ ...branding, description: e.target.value })}
                    placeholder="A powerful SaaS platform that helps you..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                <label className="block">
                  <span className="text-slate-900 font-semibold mb-2 block">Hero Image URL (optional)</span>
                  <input
                    type="url"
                    value={branding.heroImageUrl}
                    onChange={(e) => setBranding({ ...branding, heroImageUrl: e.target.value })}
                    placeholder="https://example.com/hero.jpg"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>
            </div>

            {/* Custom Directions */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-8 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-bold text-slate-900 mb-2">✨ AI Custom Directions</h3>
              <p className="text-sm text-slate-600 mb-4">Have any special requirements or customizations? Describe them here and our AI will try to incorporate them.</p>
              <textarea
                value={customDirections}
                onChange={(e) => setCustomDirections(e.target.value)}
                placeholder="Example: 'Add a dark mode toggle', 'Use green as accent color for CTAs', 'Include a video section on the landing page'..."
                rows={4}
                className="w-full px-4 py-3 border border-purple-300 rounded-lg text-slate-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
              />
              <p className="text-xs text-slate-500 mt-2">Note: Complex requests may require manual edits after deployment. You'll have full access to customize the template.</p>
            </div>
          </div>

          {/* Right Column - Preview & Deploy */}
          <div className="space-y-8">
            {/* Live Preview */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Live Preview</h3>
              <div className="aspect-video bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                <div className="text-center text-slate-500">
                  <div className="text-2xl mb-2">🚀</div>
                  <p>Your SaaS preview will appear here</p>
                </div>
              </div>
            </div>

            {/* Deploy */}
            <div className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Deploy</h3>
              <p className="text-slate-600 mb-6">Deploy your complete SaaS in 48 seconds</p>

              <button
                onClick={handleDeploy}
                disabled={deploying}
                className={`w-full py-4 text-white border-none rounded-lg font-bold text-lg transition-colors cursor-pointer ${
                  deploying ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'
                }`}
              >
                {deploying ? 'Deploying...' : 'Deploy Preview →'}
              </button>

              {/* Deployment Status */}
              {deploymentStatus && (
                <div className={`mt-6 p-4 rounded-lg ${
                  deploymentStatus.startsWith('❌') ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm whitespace-pre-line ${
                    deploymentStatus.startsWith('❌') ? 'text-red-800' : 'text-green-800'
                  }`}>
                    {deploymentStatus}
                  </p>
                  {previewUrl && (
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block px-4 py-2 bg-slate-900 text-white rounded-lg font-semibold text-sm hover:bg-slate-800 transition-colors"
                    >
                      Visit Preview Site →
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}