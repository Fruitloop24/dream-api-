/**
 * ============================================================================
 * APP ROUTER - MAIN APPLICATION ROUTES
 * ============================================================================
 *
 * Uses @dream-api/sdk for everything - NO Clerk imports needed.
 * SDK handles auth internally via shared Clerk app.
 *
 * ============================================================================
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { DreamAPIProvider, useDreamAPI } from './hooks/useDreamAPI'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ChoosePlanPage from './pages/ChoosePlanPage'

// Protected route wrapper using SDK auth
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isReady, isSignedIn } = useDreamAPI();

  if (!isReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public: Landing page */}
      <Route path="/" element={<Landing />} />

      {/* Protected: Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Protected: Choose Plan */}
      <Route
        path="/choose-plan"
        element={
          <ProtectedRoute>
            <ChoosePlanPage />
          </ProtectedRoute>
        }
      />

      {/* Catch-all: redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <DreamAPIProvider>
      <AppRoutes />
    </DreamAPIProvider>
  );
}

export default App
