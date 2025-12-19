/**
 * Header - Top navigation bar with logo and user button
 */

import { UserButton } from '@clerk/clerk-react';

export function Header() {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">dream-api</h1>
        <UserButton />
      </div>
    </header>
  );
}
