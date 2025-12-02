/**
 * Preview Configure - Tier Configuration for Preview
 * Same as Configure.tsx but for preview site (not production API)
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Tier {
  name: string;
  displayName: string;
  price: number;
  limit: number | 'unlimited';
  features: string;
  popular: boolean;
}

export default function PreviewConfigure() {
  const navigate = useNavigate();
  const [productName, setProductName] = useState('');
  const [numTiers, setNumTiers] = useState<number>(2);
  const [tiers, setTiers] = useState<Tier[]>([
    { name: 'free', displayName: 'Free', price: 0, limit: 100, features: 'Basic features,Community support', popular: false },
    { name: 'pro', displayName: 'Pro', price: 29, limit: 'unlimited', features: 'All features,Priority support,API access', popular: true },
  ]);

  const handleNumTiersChange = (num: number) => {
    setNumTiers(num);
    const newTiers: Tier[] = [];
    for (let i = 0; i < num; i++) {
      newTiers.push(
        tiers[i] || {
          name: '',
          displayName: '',
          price: 0,
          limit: 0,
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

  const handleSubmit = () => {
    // Validate
    if (!productName) {
      alert('Please enter your product name');
      return;
    }

    const incomplete = tiers.some(t => !t.name || !t.displayName);
    if (incomplete) {
      alert('Please fill in all tier fields');
      return;
    }

    // Save to localStorage
    const tierConfig = {
      productName,
      tiers
    };
    localStorage.setItem('previewTiers', JSON.stringify(tierConfig));

    // Navigate to styling
    navigate('/preview-styling');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Configure Your Pricing</h1>
          <p className="text-xl text-slate-600">Set up your tiers for the preview</p>
        </div>

        {/* Progress */}
        <div className="mb-12 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Step 2 of 3:</span>
            <span className="text-slate-900 font-bold">Pricing Tiers</span>
          </div>
        </div>

        {/* Product Name */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 mb-8">
          <label className="block mb-4">
            <span className="text-slate-900 font-semibold mb-2 block">Product Name</span>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="My Awesome SaaS"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-slate-900"
            />
          </label>
        </div>

        {/* Number of Tiers */}
        <div className="bg-white p-8 rounded-xl border border-gray-200 mb-8">
          <h3 className="text-slate-900 font-semibold mb-4">How many pricing tiers?</h3>
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

        {/* Tier Configuration */}
        <div className="space-y-6 mb-12">
          {tiers.map((tier, index) => (
            <div key={index} className="bg-white p-8 rounded-xl border border-gray-200">
              <h3 className="text-lg font-bold text-slate-900 mb-6">
                Tier {index + 1} {index === 0 && '(Usually Free)'}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Tier Name */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Tier ID (lowercase, no spaces)
                  </span>
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => updateTier(index, 'name', e.target.value.toLowerCase())}
                    placeholder="free, pro, enterprise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                {/* Display Name */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Display Name
                  </span>
                  <input
                    type="text"
                    value={tier.displayName}
                    onChange={(e) => updateTier(index, 'displayName', e.target.value)}
                    placeholder="Free, Pro, Enterprise"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Price */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Price ($/month)
                  </span>
                  <input
                    type="text"
                    value={tier.price}
                    onChange={(e) => updateTier(index, 'price', Number(e.target.value) || 0)}
                    placeholder="0, 29, 99"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>

                {/* Limit */}
                <label className="block">
                  <span className="text-slate-700 text-sm font-semibold mb-2 block">
                    Monthly Limit
                  </span>
                  <input
                    type="text"
                    value={tier.limit}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateTier(index, 'limit', val === 'unlimited' ? 'unlimited' : Number(val) || val);
                    }}
                    placeholder="100, 1000, unlimited"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                  />
                </label>
              </div>

              {/* Features */}
              <label className="block mb-4">
                <span className="text-slate-700 text-sm font-semibold mb-2 block">
                  Features (comma-separated)
                </span>
                <input
                  type="text"
                  value={tier.features}
                  onChange={(e) => updateTier(index, 'features', e.target.value)}
                  placeholder="API access, Email support, Priority support"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-slate-900"
                />
              </label>

              {/* Popular Badge */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tier.popular}
                  onChange={(e) => updateTier(index, 'popular', e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-700 text-sm font-semibold">
                  Show "Popular" badge on this tier
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="text-center">
          <button
            onClick={handleSubmit}
            className="px-12 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-lg transition-colors"
          >
            Next: Final Touches →
          </button>
        </div>
      </div>
    </div>
  );
}
