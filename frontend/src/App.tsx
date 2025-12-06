/**
 * dream-api - Router
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from '@clerk/clerk-react';
import Landing from './pages/LandingNew';
import Dashboard from './pages/DashboardNew';
import ApiTierConfig from './pages/ApiTierConfig';
import Credentials from './pages/Credentials';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/sign-in/*" element={<SignIn routing="path" path="/sign-in" />} />
        <Route path="/sign-up/*" element={<SignUp routing="path" path="/sign-up" />} />

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
