/**
 * SHARED NAVIGATION - Used across all pages
 *
 * Features:
 * - Logo/brand
 * - Auth state (Sign In / Profile dropdown)
 * - Account Settings link (Clerk portal)
 * - Billing link (Stripe portal)
 * - Sign out
 */

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDreamAPI, dreamAPI } from '../hooks/useDreamAPI';
import { CONFIG, getAccentClasses, getThemeClasses } from '../config';

interface NavProps {
  showAuthLinks?: boolean; // Show Features/Pricing/FAQ links
  transparent?: boolean; // Transparent background (for landing hero)
}

export default function Nav({ showAuthLinks = false, transparent = false }: NavProps) {
  const { isReady, isSignedIn, user, signOut } = useDreamAPI();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const accent = getAccentClasses();
  const theme = getThemeClasses();

  const plan = user?.plan || 'free';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSignUpUrl = () => dreamAPI.auth.getSignUpUrl({
    redirect: window.location.origin + '/choose-plan'
  });

  const getSignInUrl = () => dreamAPI.auth.getSignInUrl({
    redirect: window.location.origin + '/dashboard'
  });

  const handleAccountSettings = () => {
    const url = dreamAPI.auth.getCustomerPortalUrl();
    window.location.href = url;
  };

  const handleBilling = async () => {
    try {
      const api = (dreamAPI as any);
      if (api.billing?.openPortal) {
        const result = await api.billing.openPortal({ returnUrl: window.location.href });
        if (result.url) window.location.href = result.url;
      }
    } catch (error) {
      console.error('Billing portal error:', error);
    }
  };

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className={transparent ? 'bg-transparent' : theme.navBg}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          {CONFIG.logo && (
            <img src={CONFIG.logo} alt="Logo" className="h-8 rounded" />
          )}
          <span className={`text-xl font-medium ${accent.text}`}>
            {CONFIG.appName}
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-6">
          {/* Page links (landing only) */}
          {showAuthLinks && (
            <>
              <a href="#features" className={`text-sm ${theme.link} transition-colors hidden sm:block`}>
                Features
              </a>
              <a href="#pricing" className={`text-sm ${theme.link} transition-colors hidden sm:block`}>
                Pricing
              </a>
              <a href="#faq" className={`text-sm ${theme.link} transition-colors hidden sm:block`}>
                FAQ
              </a>
            </>
          )}

          {/* Auth state */}
          {!isReady ? (
            <span className="text-zinc-600 text-sm">...</span>
          ) : isSignedIn ? (
            /* Logged in: Profile dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme.buttonHover} transition-colors`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full ${accent.bg} flex items-center justify-center text-white text-sm font-medium`}>
                  {user?.email?.charAt(0).toUpperCase() || '?'}
                </div>
                {/* Chevron */}
                <svg
                  className={`w-4 h-4 text-zinc-500 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {dropdownOpen && (
                <div className={`absolute right-0 mt-2 w-56 ${theme.dropdownBg} rounded-lg shadow-xl z-50`}>
                  {/* User info */}
                  <div className={`px-4 py-3 border-b ${theme.dropdownDivider}`}>
                    <p className={`text-sm ${theme.heading} truncate`}>{user?.email}</p>
                    <p className={`text-xs ${theme.muted} mt-0.5`}>
                      Plan: <span className={accent.text}>{plan.toUpperCase()}</span>
                    </p>
                  </div>

                  {/* Links */}
                  <div className="py-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className={`block px-4 py-2 text-sm ${theme.dropdownItem} transition-colors`}
                    >
                      Dashboard
                    </Link>
                    <Link
                      to="/choose-plan"
                      onClick={() => setDropdownOpen(false)}
                      className={`block px-4 py-2 text-sm ${theme.dropdownItem} transition-colors`}
                    >
                      {plan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                    </Link>
                    <button
                      onClick={handleAccountSettings}
                      className={`w-full text-left px-4 py-2 text-sm ${theme.dropdownItem} transition-colors`}
                    >
                      Account Settings
                    </button>
                    {plan !== 'free' && (
                      <button
                        onClick={handleBilling}
                        className={`w-full text-left px-4 py-2 text-sm ${theme.dropdownItem} transition-colors`}
                      >
                        Billing
                      </button>
                    )}
                  </div>

                  {/* Sign out */}
                  <div className={`border-t ${theme.dropdownDivider} py-1`}>
                    <button
                      onClick={handleSignOut}
                      className={`w-full text-left px-4 py-2 text-sm ${theme.dangerItem} transition-colors`}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Not logged in: Sign In / Get Started */
            <>
              <a
                href={getSignInUrl()}
                className={`text-sm ${theme.link} transition-colors`}
              >
                Sign In
              </a>
              <a
                href={getSignUpUrl()}
                className={`px-4 py-2 text-sm font-medium rounded ${accent.bg} text-white ${accent.bgHover} transition-colors`}
              >
                Get Started
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
