// frontend/src/pages/Documents.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Trash2, CheckCircle, Clock, AlertCircle, MessageSquare, ArrowLeft } from 'lucide-react';
import api from '../utils/api';

interface Document { id: string; name: string; mimeType: string; sizeBytes: number; status: string; createdAt: string; }

const statusIcon = { ready: <CheckCircle size={14} className="text-green-500" />, processing: <Clock size={14} className="text-yellow-500" />, uploading: <Clock size={14} className="text-blue-500" />, failed: <AlertCircle size={14} className="text-red-500" /> };
const statusColor = { ready: 'bg-green-50 text-green-700', processing: 'bg-yellow-50 text-yellow-700', uploading: 'bg-blue-50 text-blue-700', failed: 'bg-red-50 text-red-700' };

const formatBytes = (b: number) => b < 1024 ? `${b}B` : b < 1024*1024 ? `${(b/1024).toFixed(1)}KB` : `${(b/1024/1024).toFixed(1)}MB`;

export default function Documents() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get(`/workspace/${workspaceId}/documents`);
      setDocuments(data.documents || []);
    } catch { setError('Failed to load documents'); }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, [workspaceId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true); setError('');
    for (const file of acceptedFiles) {
      const fd = new FormData();
      fd.append('file', file);
      try {
        await api.post(`/workspace/${workspaceId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } catch (err: any) {
        setError(err.response?.data?.error || `Failed to upload ${file.name}`);
      }
    }
    setUploading(false);
    fetchDocuments();
  }, [workspaceId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'], 'text/plain': ['.txt'], 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
  });

  const deleteDocument = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.delete(`/workspace/${workspaceId}/documents/${id}`);
      setDocuments((d) => d.filter((doc) => doc.id !== id));
    } catch { setError('Failed to delete document'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/workspace/${workspaceId}`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Documents</h1>
            <p className="text-sm text-gray-500">{documents.length} document{documents.length !== 1 ? 's' : ''} uploaded</p>
          </div>
        </div>
        <Link to={`/workspace/${workspaceId}/chat`}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition-colors">
          <MessageSquare size={15} /> Open Chat
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}

      {/* Dropzone */}
      <div {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
          isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
        }`}>
        <input {...getInputProps()} />
        <Upload size={36} className={`mx-auto mb-3 ${isDragActive ? 'text-indigo-600' : 'text-gray-300'}`} />
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-indigo-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600" />
            <span className="text-sm">Uploading...</span>
          </div>
        ) : isDragActive ? (
          <p className="text-indigo-600 font-medium">Drop files here</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Drag & drop files, or <span className="text-indigo-600">click to browse</span></p>
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT, CSV — up to 10MB each</p>
          </>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30" />
          <p>No documents yet. Upload your first document above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-200 transition-colors group">
              <FileText size={22} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm truncate">{doc.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{formatBytes(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString()}</p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[doc.status as keyof typeof statusColor] || 'bg-gray-50 text-gray-600'}`}>
                {statusIcon[doc.status as keyof typeof statusIcon]}
                {doc.status}
              </div>
              <button onClick={() => deleteDocument(doc.id)}
                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all ml-2">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
