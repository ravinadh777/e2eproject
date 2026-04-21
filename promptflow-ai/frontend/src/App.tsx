// frontend/src/App.tsx
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

const Login        = lazy(() => import('./pages/Login'));
const Signup       = lazy(() => import('./pages/Signup'));
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Workspace    = lazy(() => import('./pages/Workspace'));
const Documents    = lazy(() => import('./pages/Documents'));
const AiChat       = lazy(() => import('./pages/AiChat'));
const Billing      = lazy(() => import('./pages/Billing'));
const Analytics    = lazy(() => import('./pages/Analytics'));
const NotFound     = lazy(() => import('./pages/NotFound'));

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuthStore();
  return !token ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login"  element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

          {/* Protected routes */}
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"              element={<Dashboard />} />
            <Route path="workspace/:workspaceId" element={<Workspace />} />
            <Route path="workspace/:workspaceId/documents" element={<Documents />} />
            <Route path="workspace/:workspaceId/chat"      element={<AiChat />} />
            <Route path="billing"                element={<Billing />} />
            <Route path="analytics"              element={<Analytics />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
