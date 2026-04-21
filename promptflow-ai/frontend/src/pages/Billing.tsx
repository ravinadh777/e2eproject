// frontend/src/pages/Billing.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle2, Zap, Users, TrendingUp, CreditCard, Receipt } from 'lucide-react';
import api from '../utils/api';

interface Plan { id: string; name: string; price: number; priceDisplay: string; requests: number; storage: number; members: number; features: string[]; }
interface Subscription { plan: string; status: string; currentPeriodEnd: string; }

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState('');
  const [workspaceId] = useState('default');

  useEffect(() => {
    Promise.allSettled([
      api.get('/billing/plans'),
      api.get(`/billing/${workspaceId}`),
      api.get(`/billing/${workspaceId}/invoices`),
    ]).then(([plansRes, subRes, invRes]) => {
      if (plansRes.status === 'fulfilled') setPlans(plansRes.value.data.plans || []);
      if (subRes.status === 'fulfilled') { setSubscription(subRes.value.data.subscription); setUsage(subRes.value.data.usage); }
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data.invoices || []);
      setLoading(false);
    });
  }, []);

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      await api.post(`/billing/${workspaceId}/change-plan`, { plan: planId });
      const { data } = await api.get(`/billing/${workspaceId}`);
      setSubscription(data.subscription); setUsage(data.usage);
    } catch {} finally { setUpgrading(''); }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600" /></div>;

  const planIcons: Record<string, React.ReactNode> = { free: <Zap size={20} />, pro: <TrendingUp size={20} />, team: <Users size={20} /> };
  const planColors: Record<string, string> = { free: 'border-gray-200', pro: 'border-indigo-500 ring-2 ring-indigo-500/20', team: 'border-purple-500 ring-2 ring-purple-500/20' };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plans</h1>
        <p className="text-gray-500 mt-1">Manage your subscription and usage</p>
      </div>

      {/* Usage summary */}
      {usage && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Current Usage</h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'AI Requests', value: usage.aiRequests.used, limit: usage.aiRequests.limit, pct: usage.aiRequests.percent },
              { label: 'Storage', value: `${Math.round(usage.storage.usedBytes / 1024 / 1024)}MB`, limit: `${Math.round(usage.storage.limitBytes / 1024 / 1024)}MB`, pct: usage.storage.percent },
              { label: 'Team Members', value: usage.members.used, limit: usage.members.limit, pct: Math.round((usage.members.used / usage.members.limit) * 100) },
            ].map((u) => (
              <div key={u.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-500">{u.label}</span>
                  <span className="font-medium text-gray-900">{u.value} / {u.limit}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${u.pct > 90 ? 'bg-red-500' : u.pct > 70 ? 'bg-yellow-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min(u.pct, 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">{u.pct}% used</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan === plan.id;
            const isPopular = plan.id === 'pro';
            return (
              <div key={plan.id} className={`bg-white rounded-xl border-2 p-6 relative transition-all ${planColors[plan.id] || 'border-gray-200'}`}>
                {isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</div>}
                <div className={`inline-flex p-2 rounded-lg mb-3 ${plan.id === 'team' ? 'bg-purple-50 text-purple-600' : plan.id === 'pro' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-50 text-gray-600'}`}>
                  {planIcons[plan.id]}
                </div>
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <div className="mt-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">{plan.priceDisplay}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={14} className={plan.id === 'team' ? 'text-purple-500' : 'text-indigo-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => !isCurrent && handleUpgrade(plan.id)}
                  disabled={isCurrent || upgrading === plan.id}
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isCurrent ? 'bg-gray-100 text-gray-500 cursor-default' :
                    plan.id === 'team' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                    plan.id === 'pro' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' :
                    'border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}>
                  {upgrading === plan.id ? 'Processing...' : isCurrent ? '✓ Current plan' : plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2"><Receipt size={16} /> Invoice History</h2>
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <CreditCard size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</p>
                    <p className="text-xs text-gray-400">{inv.period}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${inv.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>{inv.status}</span>
                  <span className="text-sm font-medium text-gray-900">${(inv.amount / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
