/**
 * Header - Top navigation bar with logo, nav links, and user button
 */

import { UserButton } from '@clerk/clerk-react';
import { CONFIG } from '../../config';

export function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <a href="/" className="text-xl font-bold text-white hover:text-gray-300 transition">
            {CONFIG.appName}
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <a href="/dashboard" className="hover:text-white transition">Dashboard</a>
            <a href="/templates" className="hover:text-white transition">Templates</a>
            <a href={CONFIG.links.docs} className="hover:text-white transition">Docs</a>
          </nav>
        </div>
        <UserButton />
      </div>
    </header>
  );
}
