// frontend/src/pages/NotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-8xl font-bold text-indigo-100">404</h1>
        <p className="text-2xl font-bold text-gray-900 mt-2">Page not found</p>
        <p className="text-gray-500 mt-2 mb-6">The page you're looking for doesn't exist.</p>
        <Link to="/dashboard" className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
