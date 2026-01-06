/**
 * dream-api - Router
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from '@clerk/clerk-react';
import Landing from './pages/LandingNew';
import Templates from './pages/Templates';
import { getTheme } from './config';
import Dashboard from './pages/DashboardNew';
import ApiTierConfig from './pages/ApiTierConfig';
import Credentials from './pages/Credentials';

function App() {
  const theme = getTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/templates" element={<Templates />} />
        <Route path="/sign-in/*" element={
          <div className={`min-h-screen ${theme.pageBg} flex items-center justify-center`}>
            <SignIn routing="path" path="/sign-in" />
          </div>
        } />
        <Route path="/sign-up/*" element={
          <div className={`min-h-screen ${theme.pageBg} flex items-center justify-center`}>
            <SignUp routing="path" path="/sign-up" />
          </div>
        } />

        {/* Protected routes - require auth */}
        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/api-tier-config"
          element={
            <>
              <SignedIn>
                <ApiTierConfig />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/credentials"
          element={
            <>
              <SignedIn>
                <Credentials />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
