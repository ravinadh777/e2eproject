// frontend/src/pages/Signup.tsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';

const requirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains a letter', test: (p: string) => /[a-zA-Z]/.test(p) },
];

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(false);
  const { register, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try { await register(email, password, name); navigate('/dashboard'); } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-4">
            <Zap size={28} className="text-indigo-300" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create account</h1>
          <p className="text-indigo-300 mt-1 text-sm">Start with 100 free AI requests/month</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus
                placeholder="Jane Smith"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Work Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="jane@company.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                  required placeholder="Min 8 characters"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {(focused || password.length > 0) && (
                <div className="mt-2 space-y-1">
                  {requirements.map((r) => (
                    <div key={r.label} className={`flex items-center gap-1.5 text-xs transition-colors ${r.test(password) ? 'text-green-600' : 'text-gray-400'}`}>
                      <CheckCircle2 size={12} className={r.test(password) ? 'text-green-500' : 'text-gray-300'} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {isLoading ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Creating account...</> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 font-medium hover:text-indigo-800">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
