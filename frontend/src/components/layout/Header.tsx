/**
 * Header - Top navigation bar with logo, nav links, and user button
 */

import { UserButton } from '@clerk/clerk-react';
import { CONFIG } from '../../config';
import { SubscriptionDropdown } from './SubscriptionDropdown';
import type { PlatformSubscription } from '@/hooks/usePlatformSubscription';

interface HeaderProps {
  subscription?: PlatformSubscription | null;
  subscriptionLoading?: boolean;
  statusDisplay?: { label: string; color: string };
  onManageBilling?: () => void;
}

export function Header({
  subscription,
  subscriptionLoading = false,
  statusDisplay = { label: 'Loading', color: 'gray' },
  onManageBilling,
}: HeaderProps) {
  const showSubscription = subscription !== undefined || subscriptionLoading;

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <img src="/panacea_pup_color_clean.png" alt="Dream API" className="h-10 w-auto rounded-lg" />
            <span className="text-xl font-bold text-white">Dream-API</span>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/dashboard" className="hover:text-white transition">Dashboard</a>
            <a href="/templates" className="hover:text-white transition">Templates</a>
            <a href={CONFIG.links.docs} className="hover:text-white transition">Docs</a>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {showSubscription && onManageBilling && (
            <SubscriptionDropdown
              subscription={subscription ?? null}
              loading={subscriptionLoading}
              statusDisplay={statusDisplay}
              onManageBilling={onManageBilling}
            />
          )}
          <UserButton />
        </div>
      </div>
    </header>
  );
}
