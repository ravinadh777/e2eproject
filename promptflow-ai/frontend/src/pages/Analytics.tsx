// frontend/src/pages/Analytics.tsx
import React, { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, MessageSquare, Clock, AlertTriangle, Activity } from 'lucide-react';
import api from '../utils/api';

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard').then(({ data }) => setData(data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600" /></div>;

  const trend = data?.dailyTrend || [];
  const topMetrics = data?.topMetrics || {};

  const metrics = [
    { label: 'Avg Daily AI Requests', value: topMetrics.avgDailyAiRequests || 0, icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Avg Latency', value: `${topMetrics.avgLatencyMs || 0}ms`, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Error Rate', value: `${topMetrics.errorRate || 0}%`, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'Active Workspaces', value: topMetrics.activeWorkspaces || 0, icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Platform usage and performance metrics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className={`inline-flex p-2 rounded-lg ${m.bg} mb-3`}><m.icon size={18} className={m.color} /></div>
            <div className="text-2xl font-bold text-gray-900">{m.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-indigo-600" /> AI Requests — Last 30 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trend}>
            <defs>
              <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Area type="monotone" dataKey="aiRequests" stroke="#6366f1" fill="url(#reqGrad)" strokeWidth={2} name="Requests" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Active Users</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trend.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="activeUsers" fill="#818cf8" radius={[3,3,0,0]} name="Users" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Avg Latency (ms)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend.slice(-14)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="avgLatencyMs" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} name="Latency ms" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
