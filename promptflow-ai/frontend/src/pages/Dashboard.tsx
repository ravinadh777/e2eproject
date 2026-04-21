// frontend/src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { MessageSquare, FileText, Users, Zap, Plus, TrendingUp, Activity } from 'lucide-react';

interface Workspace { id: string; name: string; description: string; userRole: string; plan: string; }
interface DashboardData { summary: any; dailyTrend: any[]; }

export default function Dashboard() {
  const { user } = useAuthStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [analytics, setAnalytics] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWsName, setNewWsName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [wsRes, analyticsRes] = await Promise.allSettled([
          api.get('/workspace'),
          api.get('/analytics/dashboard'),
        ]);
        if (wsRes.status === 'fulfilled') setWorkspaces(wsRes.value.data.workspaces || []);
        if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data);
      } catch {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const createWorkspace = async () => {
    if (!newWsName.trim()) return;
    try {
      const { data } = await api.post('/workspace', { name: newWsName });
      setWorkspaces([...workspaces, data.workspace]);
      setNewWsName(''); setShowCreateModal(false);
    } catch {}
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  const trendData = analytics?.dailyTrend?.slice(-14) || [];
  const stats = [
    { label: 'Workspaces',    value: workspaces.length, icon: Users,       color: 'text-blue-600',   bg: 'bg-blue-50' },
    { label: 'AI Requests',   value: analytics?.summary?.totalEvents || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Documents',     value: '—',               icon: FileText,    color: 'text-green-600',  bg: 'bg-green-50' },
    { label: 'Active Today',  value: trendData[trendData.length-1]?.activeUsers || 0, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-500 mt-1">Here's what's happening across your workspaces.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> New Workspace
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${s.bg} mb-3`}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-600" /> AI Requests — Last 14 Days
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={trendData}>
            <defs>
              <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="aiRequests" stroke="#6366f1" fill="url(#aiGrad)" strokeWidth={2} name="Requests" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Workspaces */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Your Workspaces</h2>
        {workspaces.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
            <Zap size={40} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No workspaces yet.</p>
            <button onClick={() => setShowCreateModal(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
              Create your first workspace →
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link key={ws.id} to={`/workspace/${ws.id}`}
                className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ws.plan === 'team' ? 'bg-purple-100 text-purple-700' :
                    ws.plan === 'pro'  ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>{ws.plan}</span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{ws.name}</h3>
                {ws.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{ws.description}</p>}
                <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><FileText size={12} /> Documents</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> Chat</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Create New Workspace</h3>
            <input
              type="text"
              placeholder="Workspace name"
              value={newWsName}
              onChange={(e) => setNewWsName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createWorkspace()}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreateModal(false)} className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={createWorkspace} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
