// frontend/src/pages/Workspace.tsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, MessageSquare, Users, Settings, Plus } from 'lucide-react';
import api from '../utils/api';

export default function Workspace() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/workspace/${workspaceId}`)
      .then(({ data }) => setWorkspace(data.workspace))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 rounded-full border-b-2 border-indigo-600" /></div>;
  if (!workspace) return <div className="text-center py-20 text-gray-400">Workspace not found.</div>;

  const cards = [
    { label: 'Documents', desc: 'Upload and manage PDFs, DOCX, TXT files', icon: FileText, to: `/workspace/${workspaceId}/documents`, color: 'bg-blue-50 text-blue-600' },
    { label: 'AI Chat', desc: 'Ask questions about your uploaded documents', icon: MessageSquare, to: `/workspace/${workspaceId}/chat`, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Members', desc: 'Manage team members and permissions', icon: Users, to: '#', color: 'bg-green-50 text-green-600' },
    { label: 'Settings', desc: 'Workspace settings and configuration', icon: Settings, to: '#', color: 'bg-gray-50 text-gray-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold">
            {workspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
            {workspace.description && <p className="text-gray-500 text-sm mt-0.5">{workspace.description}</p>}
          </div>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full font-medium ${workspace.plan === 'team' ? 'bg-purple-100 text-purple-700' : workspace.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
          {workspace.plan} plan
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link key={card.label} to={card.to}
            className="bg-white border border-gray-100 rounded-xl p-6 hover:border-indigo-200 hover:shadow-md transition-all group">
            <div className={`inline-flex p-2.5 rounded-xl mb-4 ${card.color}`}><card.icon size={22} /></div>
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">{card.label}</h3>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>

      {workspace.members && workspace.members.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={16} /> Team Members ({workspace.members.length})
          </h2>
          <div className="space-y-2">
            {workspace.members.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-sm font-bold">
                    {(m.userId || 'U').toString().charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm text-gray-700 font-mono text-xs">{m.userId}</span>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${m.role === 'owner' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-50 text-gray-600'}`}>{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
