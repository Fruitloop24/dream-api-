/**
 * API Product Configuration - dream-api
 *
 * Configure SaaS subscription tiers OR Store one-off products
 * Handles both CREATE (new project) and EDIT (existing tiers) modes
 * Dark theme matching dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';

const OAUTH_API = import.meta.env.VITE_OAUTH_API_URL || 'http://localhost:8789';
const FRONT_AUTH_API = import.meta.env.VITE_FRONT_AUTH_API_URL || 'http://localhost:8788';

type ConfigTab = 'saas' | 'store';
type ModeType = 'test' | 'live';

interface SaasTier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  popular?: boolean;
  priceId?: string;
  productId?: string;
}

interface StoreProduct {
  name: string;
  displayName: string;
  price: number;
  description: string;
  imageUrl: string;
  inventory: number | null;
  features: string;
  priceId?: string;
  productId?: string;
}

export default function ApiTierConfig() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const { getToken } = useAuth();

  // Detect edit mode, promote mode, and project info from URL params
  const isEditMode = searchParams.get('edit') === 'true';
  const isPromoteMode = searchParams.get('promote') === 'true';
  const editMode = (searchParams.get('mode') as ModeType) || 'test';
  const projectNameParam = searchParams.get('projectName') || '';
  const projectTypeFromUrl = searchParams.get('projectType') as ConfigTab | null;
  const publishableKeyParam = searchParams.get('pk') || '';

  // Mode: test or live (test only for new projects, edit mode uses URL param)
  const [mode] = useState<ModeType>(editMode);

  // Project name (only for new projects)
  const [projectName, setProjectName] = useState<string>(projectNameParam);

  // Tab: saas or store (default to saas, but only after choosing)
  const [activeTab, setActiveTab] = useState<ConfigTab>(projectTypeFromUrl || 'saas');

  // For new projects: track if user has chosen a type yet
  // Only skip chooser if: edit mode, promote mode, OR projectType was explicitly passed in URL
  const [hasChosenType, setHasChosenType] = useState<boolean>(isEditMode || isPromoteMode || !!projectTypeFromUrl);

  // SaaS tiers
  const [saasTiers, setSaasTiers] = useState<SaasTier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, popular: false },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 1000, popular: true },
  ]);

  // Store products
  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([
    { name: 'product1', displayName: 'My Product', price: 49, description: '', imageUrl: '', inventory: null, features: '' },
  ]);

  // Original tiers for comparison (edit mode)
  const [originalTiers, setOriginalTiers] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);

  // Check URL params for stripe connected
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('stripe') === 'connected') {
      setStripeConnected(true);
    }
  }, []);

  // Load existing tiers when in edit mode or promote mode
  useEffect(() => {
    if ((isEditMode || isPromoteMode) && user?.id) {
      if (projectTypeFromUrl) setActiveTab(projectTypeFromUrl);
      loadExistingTiers();
    }
  }, [isEditMode, isPromoteMode, user?.id, mode, projectTypeFromUrl]);

  const loadExistingTiers = async () => {
    setLoadingTiers(true);
    try {
      const params = new URLSearchParams({
        userId: user?.id || '',
        mode,
        ...(publishableKeyParam ? { publishableKey: publishableKeyParam } : {}),
        ...(projectTypeFromUrl ? { projectType: projectTypeFromUrl } : {}),
      });
      const response = await fetch(`${OAUTH_API}/tiers?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const tiers = data.tiers || [];
        setOriginalTiers(tiers);

        // Separate into SaaS and Store
        const saasList: SaasTier[] = [];
        const storeList: StoreProduct[] = [];

        for (const tier of tiers) {
          // Parse features JSON if present
          let parsedFeatures: any = {};
          if (tier.features) {
            try {
              parsedFeatures = typeof tier.features === 'string' ? JSON.parse(tier.features) : tier.features;
            } catch {
              parsedFeatures = { features: tier.features };
            }
          }

          const billingMode = parsedFeatures.billingMode || 'subscription';

          if (billingMode === 'one_off') {
            storeList.push({
              name: tier.name,
              displayName: tier.displayName || tier.name,
              price: tier.price || 0,
              description: parsedFeatures.description || '',
              imageUrl: parsedFeatures.imageUrl || '',
              inventory: tier.inventory ?? null,
              features: Array.isArray(parsedFeatures.features) ? parsedFeatures.features.join(', ') : '',
              priceId: tier.priceId,
              productId: tier.productId,
            });
          } else {
            saasList.push({
              name: tier.name,
              displayName: tier.displayName || tier.name,
              price: tier.price || 0,
              limit: tier.limit === null ? 'unlimited' : tier.limit,
              popular: !!tier.popular,
              priceId: tier.priceId,
              productId: tier.productId,
            });
          }
        }

        if (saasList.length > 0) {
          setSaasTiers(saasList);
        }
        if (storeList.length > 0) {
          setStoreProducts(storeList);
        }

        // Respect projectType from URL if provided, otherwise infer from data
        if (projectTypeFromUrl) {
          setActiveTab(projectTypeFromUrl);
        } else if (storeList.length > 0 && saasList.length === 0) {
          setActiveTab('store');
        } else if (saasList.length > 0) {
          setActiveTab('saas');
        }
      }
    } catch (err) {
      console.error('Failed to load tiers:', err);
    } finally {
      setLoadingTiers(false);
    }
  };

  // Image upload helper
  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1] || '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageUpload = async (file: File, index: number) => {
    try {
      setUploadingIndex(index);
      const base64 = await fileToBase64(file);
      const token = await getToken({ template: 'dream-api' });
      if (!token) throw new Error('Missing auth token');

      const res = await fetch(`${FRONT_AUTH_API}/upload-asset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          data: base64,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      updateStoreProduct(index, 'imageUrl', data.url || '');
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed. Try again.');
    } finally {
      setUploadingIndex(null);
    }
  };

  // SaaS tier helpers
  const updateSaasTier = (index: number, field: keyof SaasTier, value: any) => {
    const updated = [...saasTiers];
    updated[index] = { ...updated[index], [field]: value };
    setSaasTiers(updated);
  };

  const addSaasTier = () => {
    setSaasTiers([
      ...saasTiers,
      { name: '', displayName: '', price: 0, limit: 100, popular: false },
    ]);
  };

  const removeSaasTier = (index: number) => {
    if (saasTiers.length <= 1) return;
    setSaasTiers(saasTiers.filter((_, i) => i !== index));
  };

  // Handle type selection for new projects
  const handleChooseType = (type: ConfigTab) => {
    setActiveTab(type);
    setHasChosenType(true);
  };

  // Store product helpers
  const updateStoreProduct = (index: number, field: keyof StoreProduct, value: any) => {
    const updated = [...storeProducts];
    updated[index] = { ...updated[index], [field]: value };
    setStoreProducts(updated);
  };

  const addStoreProduct = () => {
    setStoreProducts([
      ...storeProducts,
      { name: '', displayName: '', price: 0, description: '', imageUrl: '', inventory: null, features: '' },
    ]);
  };

  const removeStoreProduct = (index: number) => {
    if (storeProducts.length <= 1) return;
    setStoreProducts(storeProducts.filter((_, i) => i !== index));
  };

  // Submit handler - handles create, update, and promote
  const handleSubmit = async () => {
    // Validate project name (only for new projects)
    if (!isEditMode && !isPromoteMode && !projectName.trim()) {
      alert('Please enter a project name');
      return;
    }

    setLoading(true);

    try {
      if (isPromoteMode) {
        // PROMOTE MODE: Create live products from edited test tiers
        await handlePromote();
      } else if (isEditMode) {
        // UPDATE MODE: Update existing tiers
        await handleUpdate();
        navigate('/dashboard');
      } else {
        // CREATE MODE: Create new products and keys
        await handleCreate();
        // Go to credentials page to show the new keys
        navigate('/credentials');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  // Handle creating new project
  const handleCreate = async () => {
    // Build tiers array based on active tab
    let tiers: any[] = [];

    if (activeTab === 'saas') {
      const incomplete = saasTiers.some(t => !t.name || !t.displayName);
      if (incomplete) {
        throw new Error('Please fill in all tier fields (name and display name required)');
      }
      tiers = saasTiers.map(t => ({
        name: t.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: t.displayName,
        price: t.price,
        limit: t.limit,
        billingMode: 'subscription',
        popular: t.popular,
      }));
    } else {
      const incomplete = storeProducts.some(p => !p.name || !p.displayName);
      if (incomplete) {
        throw new Error('Please fill in all product fields (name and display name required)');
      }
      tiers = storeProducts.map(p => ({
        name: p.name.toLowerCase().replace(/\s+/g, '_'),
        displayName: p.displayName,
        price: p.price,
        limit: 0,
        billingMode: 'one_off',
        features: p.features,
        description: p.description,
        imageUrl: p.imageUrl,
        inventory: p.inventory,
      }));
    }

    const response = await fetch(`${OAUTH_API}/create-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user?.id,
        tiers,
        mode,
        projectName: projectName.trim(),
        projectType: activeTab,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create products: ${error}`);
    }
  };

  // Handle updating existing tiers
  const handleUpdate = async () => {
    const currentTiers = activeTab === 'saas' ? saasTiers : storeProducts;
    const originalNames = new Set(originalTiers.map(t => t.name));
    const currentNames = new Set(currentTiers.map(t => t.name));

    // Find tiers to update (exist in both)
    const toUpdate = currentTiers.filter(t => originalNames.has(t.name));

    // Find tiers to add (new ones)
    const toAdd = currentTiers.filter(t => !originalNames.has(t.name) && t.name && t.displayName);

    // Find tiers to delete (removed ones)
    const toDelete = originalTiers.filter(t => !currentNames.has(t.name));

    // Update existing tiers
    for (const tier of toUpdate) {
      const updates: any = {
        displayName: tier.displayName,
        price: tier.price,
        popular: 'popular' in tier ? tier.popular : false,
      };

      if (activeTab === 'saas') {
        updates.limit = 'limit' in tier ? (tier.limit === 'unlimited' ? 'unlimited' : tier.limit) : 0;
      } else {
        // Store products - cast to StoreProduct for type safety
        const storeProduct = tier as StoreProduct;
        updates.inventory = storeProduct.inventory ?? null;
        updates.features = JSON.stringify({
          features: storeProduct.features ? storeProduct.features.split(',').map((f: string) => f.trim()) : [],
          billingMode: 'one_off',
          imageUrl: storeProduct.imageUrl || '',
          description: storeProduct.description || '',
        });
      }

      await fetch(`${OAUTH_API}/tiers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          tierName: tier.name,
          mode,
          publishableKey: publishableKeyParam,
          projectType: activeTab,
          updates,
        }),
      });
    }

    // Add new tiers
    for (const tier of toAdd) {
      await fetch(`${OAUTH_API}/tiers/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          mode,
          publishableKey: publishableKeyParam,
          projectType: activeTab,
          tier: {
            name: tier.name.toLowerCase().replace(/\s+/g, '_'),
            displayName: tier.displayName,
            price: tier.price,
            limit: 'limit' in tier ? (tier as SaasTier).limit : 0,
            billingMode: activeTab === 'saas' ? 'subscription' : 'one_off',
            features: 'features' in tier ? (tier as StoreProduct).features : '',
            description: 'description' in tier ? (tier as StoreProduct).description : '',
            imageUrl: 'imageUrl' in tier ? (tier as StoreProduct).imageUrl : '',
            inventory: 'inventory' in tier ? (tier as StoreProduct).inventory : null,
            popular: 'popular' in tier ? tier.popular : false,
          },
        }),
      });
    }

    // Delete removed tiers
    for (const tier of toDelete) {
      await fetch(`${OAUTH_API}/tiers`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          tierName: tier.name,
          mode,
          publishableKey: publishableKeyParam,
          projectType: activeTab,
        }),
      });
    }
  };

  // Handle promoting test to live with edited values
  const handlePromote = async () => {
    const token = await getToken({ template: 'dream-api' });
    if (!token) throw new Error('Not authenticated');

    // Build tiers array with edited values
    let tiers: any[] = [];

    if (activeTab === 'saas') {
      tiers = saasTiers.map(t => ({
        name: t.name,
        displayName: t.displayName,
        price: t.price,
        limit: t.limit,
        billingMode: 'subscription',
        popular: t.popular,
      }));
    } else {
      tiers = storeProducts.map(p => ({
        name: p.name,
        displayName: p.displayName,
        price: p.price,
        limit: 0,
        billingMode: 'one_off',
        features: p.features,
        description: p.description,
        imageUrl: p.imageUrl,
        inventory: p.inventory, // User can edit this before going live
      }));
    }

    const response = await fetch(`${OAUTH_API}/promote-to-live`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: user?.id,
        publishableKey: publishableKeyParam,
        tiers, // Pass edited tiers to use for live products
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      // Handle "already has live keys" case
      if (response.status === 409 && errorData.existingLiveKey) {
        alert(`This project already has live keys!\n\nExisting key: ${errorData.existingLiveKey}\n\nUse "Edit Tiers" on the live project to make changes.`);
        navigate('/dashboard');
        return;
      }
      throw new Error(errorData.message || errorData.error || 'Failed to promote');
    }

    const data = await response.json();

    // Show the new live keys
    if (data.secretKey) {
      alert(`Live keys created!\n\nPublishable Key: ${data.publishableKey}\n\nSecret Key: ${data.secretKey}\n\nSAVE THIS SECRET KEY NOW - you won't see it again!`);
    }

    navigate('/dashboard');
  };

  if (loadingTiers) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading tiers...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold">dream-api</h1>
            <span className="text-gray-500">/ {isPromoteMode ? 'Go Live' : isEditMode ? 'Edit Products' : 'Configure Products'}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-400 hover:text-white"
            >
              Back to Dashboard
            </button>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Stripe Connected Banner */}
        {stripeConnected && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✓</span>
            <div>
              <p className="font-semibold text-green-200">Stripe Connected!</p>
              <p className="text-sm text-green-300/70">Configure your products below.</p>
            </div>
          </div>
        )}

        {/* Promote Mode Banner */}
        {isPromoteMode && (
          <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🚀</span>
            <div>
              <p className="font-semibold text-green-200">Go Live</p>
              <p className="text-sm text-green-300/70">Review and adjust your products before creating live keys. Reset inventory, update prices, then launch!</p>
            </div>
          </div>
        )}

        {/* Edit Mode Banner */}
        {isEditMode && !isPromoteMode && (
          <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✎</span>
            <div>
              <p className="font-semibold text-blue-200">Edit Mode</p>
              <p className="text-sm text-blue-300/70">Update your existing tiers. Changes will not generate new API keys.</p>
            </div>
          </div>
        )}

        {/* Project Name */}
        {!isEditMode && !isPromoteMode && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
            <label className="block font-semibold mb-2">Project Name</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., My Chat API, My Store, Weather API"
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="text-sm text-gray-500 mt-2">This name will identify your API keys in the dashboard</p>
          </div>
        )}
        {(isEditMode || isPromoteMode) && projectNameParam && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
            <p className="text-sm text-gray-400">Project</p>
            <p className="font-semibold">{decodeURIComponent(projectNameParam)}</p>
          </div>
        )}

        {/* Mode Display - Test only for new projects, shows mode badge for edits */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Environment Mode</h3>
              <p className="text-sm text-gray-400">
                {isEditMode
                  ? `Editing ${mode} mode tiers.`
                  : 'Creating in Test mode. Promote to Live from dashboard when ready.'}
              </p>
            </div>
            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${
              mode === 'test'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500'
                : 'bg-green-500/20 text-green-300 border border-green-500'
            }`}>
              {mode === 'test' ? 'Test Mode' : 'Live Mode'}
            </span>
          </div>
        </div>

        {/* Type Chooser - Show for new projects before they pick a type */}
        {!isEditMode && !hasChosenType && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-2">Choose Your Business Type</h2>
            <p className="text-gray-400 mb-6">This determines what kind of products you can create. Choose wisely - this can't be changed later for this project.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SaaS Card */}
              <button
                onClick={() => handleChooseType('saas')}
                className="bg-gray-800 border-2 border-gray-700 hover:border-blue-500 rounded-xl p-6 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">📊</span>
                  <h3 className="text-lg font-bold group-hover:text-blue-400">SaaS / Subscriptions</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Monthly subscriptions with usage limits. Track API calls, enforce quotas, bill recurring.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Tiers with monthly limits</li>
                  <li>• Usage tracking per user</li>
                  <li>• Recurring billing</li>
                </ul>
              </button>

              {/* Store Card */}
              <button
                onClick={() => handleChooseType('store')}
                className="bg-gray-800 border-2 border-gray-700 hover:border-purple-500 rounded-xl p-6 text-left transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🛒</span>
                  <h3 className="text-lg font-bold group-hover:text-purple-400">Store / One-offs</h3>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  One-time purchases with inventory. Sell digital products, templates, downloads.
                </p>
                <ul className="text-sm text-gray-500 space-y-1">
                  <li>• Products with prices</li>
                  <li>• Optional inventory tracking</li>
                  <li>• One-time payments</li>
                </ul>
              </button>
            </div>
          </div>
        )}

        {/* Show selected type badge after choosing (in create mode) */}
        {!isEditMode && hasChosenType && (
          <div className="flex items-center gap-3 mb-6">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              activeTab === 'saas'
                ? 'bg-blue-900/30 border border-blue-700 text-blue-200'
                : 'bg-purple-900/30 border border-purple-700 text-purple-200'
            }`}>
              {activeTab === 'saas' ? '📊 SaaS / Subscriptions' : '🛒 Store / One-offs'}
            </span>
            <button
              onClick={() => setHasChosenType(false)}
              className="text-xs text-gray-500 hover:text-gray-300"
            >
              Change
            </button>
          </div>
        )}

        {/* Edit/Promote mode: Show type badge instead of tabs */}
        {(isEditMode || isPromoteMode) && (
          <div className="mb-6">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
              activeTab === 'saas'
                ? 'bg-blue-900/30 border border-blue-700 text-blue-200'
                : 'bg-purple-900/30 border border-purple-700 text-purple-200'
            }`}>
              {activeTab === 'saas' ? 'SaaS / Subscriptions' : 'Store / One-offs'}
            </span>
          </div>
        )}

        {/* SaaS Tab Content - Only show after type chosen */}
        {(isEditMode || isPromoteMode || hasChosenType) && activeTab === 'saas' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
              <p className="text-sm text-gray-400">
                Configure subscription tiers with monthly limits. Customers subscribe and get usage-tracked API access.
              </p>
            </div>

            {saasTiers.map((tier, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    Tier {index + 1}
                    {tier.priceId && <span className="ml-2 text-xs text-gray-500">(existing)</span>}
                  </h3>
                  <button
                    onClick={() => removeSaasTier(index)}
                    disabled={saasTiers.length <= 1}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Tier ID (lowercase)</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateSaasTier(index, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="free, pro, enterprise"
                      disabled={!!tier.priceId && !isPromoteMode} // Allow name change in promote mode (creating new products)
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={tier.displayName}
                      onChange={(e) => updateSaasTier(index, 'displayName', e.target.value)}
                      placeholder="Free, Pro, Enterprise"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Price ($/month)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tier.price}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        updateSaasTier(index, 'price', val === '' ? 0 : Number(val));
                      }}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Monthly Limit</label>
                    <input
                      type="text"
                      value={tier.limit}
                      onChange={(e) => {
                        const val = e.target.value;
                        updateSaasTier(index, 'limit', val === 'unlimited' ? 'unlimited' : Number(val) || 0);
                      }}
                      placeholder="100, 1000, unlimited"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tier.popular || false}
                        onChange={(e) => updateSaasTier(index, 'popular', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900"
                      />
                      <span className="text-sm text-gray-400">Popular</span>
                    </label>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={addSaasTier}
              className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-300"
            >
              + Add Tier
            </button>
          </div>
        )}

        {/* Store Tab Content - Only show after type chosen */}
        {(isEditMode || isPromoteMode || hasChosenType) && activeTab === 'store' && (
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-4">
              <p className="text-sm text-gray-400">
                Configure one-off products for your store. Customers pay once, inventory decrements automatically.
              </p>
            </div>

            {storeProducts.map((product, index) => (
              <div key={index} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    Product {index + 1}
                    {product.priceId && <span className="ml-2 text-xs text-gray-500">(existing)</span>}
                  </h3>
                  <button
                    onClick={() => removeStoreProduct(index)}
                    disabled={storeProducts.length <= 1}
                    className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Product ID (lowercase)</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateStoreProduct(index, 'name', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                      placeholder="product_1, template_pro"
                      disabled={!!product.priceId && !isPromoteMode} // Allow name change in promote mode (creating new products)
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={product.displayName}
                      onChange={(e) => updateStoreProduct(index, 'displayName', e.target.value)}
                      placeholder="My Product"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Price ($)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={product.price}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '');
                        updateStoreProduct(index, 'price', val === '' ? 0 : Number(val));
                      }}
                      placeholder="49"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Inventory (blank = unlimited)</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={product.inventory ?? ''}
                      onChange={(e) => updateStoreProduct(index, 'inventory', e.target.value === '' ? null : Number(e.target.value))}
                      placeholder="100"
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={product.description}
                    onChange={(e) => updateStoreProduct(index, 'description', e.target.value)}
                    placeholder="What does this product include?"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-1">Image URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={product.imageUrl}
                      onChange={(e) => updateStoreProduct(index, 'imageUrl', e.target.value)}
                      placeholder="https://... or upload below"
                      className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                    />
                    <label className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg cursor-pointer text-sm">
                      {uploadingIndex === index ? 'Uploading...' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(file, index);
                        }}
                        disabled={uploadingIndex !== null}
                      />
                    </label>
                  </div>
                  {product.imageUrl && (
                    <div className="mt-2">
                      <img src={product.imageUrl} alt="Preview" className="h-20 w-20 object-cover rounded border border-gray-700" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Features/Badges (comma separated)</label>
                  <input
                    type="text"
                    value={product.features}
                    onChange={(e) => updateStoreProduct(index, 'features', e.target.value)}
                    placeholder="Lifetime access, Free updates, Source code"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500"
                  />
                </div>
              </div>
            ))}

            <button
              onClick={addStoreProduct}
              className="w-full py-3 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-gray-600 hover:text-gray-300"
            >
              + Add Product
            </button>
          </div>
        )}

        {/* Submit Button - Only show after type chosen */}
        {(isEditMode || isPromoteMode || hasChosenType) && (
        <div className="mt-8 pt-6 border-t border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
              loading
                ? 'bg-gray-700 cursor-not-allowed'
                : isPromoteMode
                  ? 'bg-green-600 hover:bg-green-700'
                  : isEditMode
                    ? 'bg-blue-600 hover:bg-blue-700'
                    : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading
              ? (isPromoteMode ? 'Creating Live Products...' : isEditMode ? 'Saving Changes...' : 'Creating Products...')
              : isPromoteMode
                ? `🚀 Create Live ${activeTab === 'saas' ? 'Subscriptions' : 'Products'}`
                : isEditMode
                  ? 'Save Changes'
                  : `Create Test ${activeTab === 'saas' ? 'Subscriptions' : 'Products'} →`
            }
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            {isPromoteMode
              ? 'Creates LIVE products on Stripe and generates new live API keys.'
              : isEditMode
                ? 'Updates your existing tiers without creating new API keys.'
                : `This creates ${mode} products on your Stripe account and generates ${mode} API keys.`
            }
          </p>
        </div>
        )}
      </main>
    </div>
  );
}
