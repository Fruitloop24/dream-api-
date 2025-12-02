/**
 * dream-api - Router
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn, SignIn, SignUp } from '@clerk/clerk-react';
import Landing from './pages/LandingNew';
import Dashboard from './pages/DashboardNew';
import Configure from './pages/Configure';
import Setup from './pages/Setup';
import PreviewConfigure from './pages/PreviewConfigure';
import PreviewStyling from './pages/PreviewStyling';
import PreviewReady from './pages/PreviewReady';
import ApiTierConfig from './pages/ApiTierConfig';

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
          path="/configure"
          element={
            <>
              <SignedIn>
                <Configure />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/setup"
          element={
            <>
              <SignedIn>
                <Setup />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/preview-configure"
          element={
            <>
              <SignedIn>
                <PreviewConfigure />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/preview-styling"
          element={
            <>
              <SignedIn>
                <PreviewStyling />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
        <Route
          path="/preview-ready"
          element={
            <>
              <SignedIn>
                <PreviewReady />
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
