import React, { useState } from 'react';
import { Search, Loader2, Heart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AnatomyAtlas: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true); setError(null); setContent(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/anatomy-atlas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ structure: query })
      });
      if (!res.ok) throw new Error('Failed to fetch.');
      const data = await res.json();
      setContent(data.response);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0">
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-muted-foreground" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="E.g. Brachial Plexus, Heart, Liver..."
            className="w-full bg-muted border border-border rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
        </form>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {loading && <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3"><Loader2 className="animate-spin text-primary w-8 h-8" /><p className="text-sm font-medium animate-pulse">Generating anatomical breakdown...</p></div>}
        {error && <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm"><p className="font-bold mb-1">Error</p><p>{error}</p></div>}
        {!loading && !error && !content && <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50"><Heart size={32} /><p className="text-sm text-center">Search any body structure for<br/>a detailed anatomical breakdown.</p></div>}
        {content && !loading && (
          <div className="prose prose-sm max-w-none text-[14px] text-foreground prose-headings:text-foreground prose-h1:text-xl prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-primary prose-h2:mt-6 prose-h2:mb-3 prose-li:marker:text-primary prose-strong:text-foreground prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border prose-td:p-2 prose-td:border prose-td:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
