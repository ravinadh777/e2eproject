// frontend/src/pages/AiChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Send, Bot, User, FileText, Loader2, Sparkles, Plus } from 'lucide-react';
import api from '../utils/api';

interface Message { role: 'user' | 'assistant'; content: string; sources?: any[]; }
interface Document { id: string; name: string; status: string; }

export default function AiChat() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [usage, setUsage] = useState<{ current: number; limit: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (workspaceId) {
      api.get(`/workspace/${workspaceId}/documents`)
        .then(({ data }) => setDocuments(data.documents?.filter((d: Document) => d.status === 'ready') || []))
        .catch(() => {});
      api.get('/ai/usage').then(({ data }) => setUsage(data)).catch(() => {});
    }
  }, [workspaceId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message: userMessage,
        workspaceId,
        conversationId,
        documentIds: selectedDocs,
      });
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: data.response, sources: data.sources }]);
      if (data.usage) setUsage(data.usage);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Failed to get response. Please try again.';
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${errorMsg}` }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const suggestions = [
    'What are the key topics in my documents?',
    'Summarize the most important points',
    'What action items are mentioned?',
    'List all dates and deadlines',
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar - Document selection */}
      <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <FileText size={15} /> Documents
          <span className="ml-auto text-xs text-gray-400">{selectedDocs.length} selected</span>
        </h3>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs">No documents ready.<br />Upload some first.</p>
          </div>
        ) : (
          <div className="space-y-1 flex-1 overflow-y-auto">
            {documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDoc(doc.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                  selectedDocs.includes(doc.id)
                    ? 'bg-indigo-50 text-indigo-700 font-medium border border-indigo-200'
                    : 'text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
              >
                <FileText size={12} className="flex-shrink-0" />
                <span className="truncate">{doc.name}</span>
              </button>
            ))}
          </div>
        )}

        {usage && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Usage</span>
              <span>{usage.current}/{usage.limit}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  (usage.current / usage.limit) > 0.9 ? 'bg-red-500' :
                  (usage.current / usage.limit) > 0.7 ? 'bg-yellow-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${Math.min((usage.current / usage.limit) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-400">
              {selectedDocs.length > 0 ? `${selectedDocs.length} document${selectedDocs.length > 1 ? 's' : ''} selected` : 'Select documents for context'}
            </p>
          </div>
          <button
            onClick={() => { setMessages([]); setConversationId(undefined); }}
            className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            <Plus size={13} /> New chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
                <Bot size={32} className="text-indigo-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Ask me anything</h3>
              <p className="text-sm text-gray-400 mt-1 mb-6">Select documents and start chatting</p>
              <div className="grid grid-cols-2 gap-2 w-full max-w-md">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => setInput(s)}
                    className="text-left text-xs bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 border border-gray-100 hover:border-indigo-200 rounded-lg p-3 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-100'
                }`}>
                  {msg.role === 'user'
                    ? <User size={14} className="text-white" />
                    : <Bot size={14} className="text-gray-600" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                    : 'bg-gray-50 text-gray-800 rounded-tl-sm border border-gray-100'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Sources:</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.sources.map((s: any) => (
                          <span key={s.id} className="text-xs bg-white border border-gray-200 rounded px-2 py-0.5 flex items-center gap-1">
                            <FileText size={10} /> {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                <Bot size={14} className="text-gray-600" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex gap-2 items-end bg-gray-50 rounded-xl border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all px-3 py-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedDocs.length > 0 ? 'Ask about your documents...' : 'Ask anything...'}
              rows={1}
              className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 py-1"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send size={14} className={loading ? 'text-gray-400' : 'text-white'} />
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5 ml-1">Shift+Enter for newline · Enter to send</p>
        </div>
      </div>
    </div>
  );
}
