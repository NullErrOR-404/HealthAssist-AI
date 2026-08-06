import React, { useState } from 'react';
import { Search, Loader2, Plus, Trash2, AlertTriangle, Pill } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const DrugInteractionChecker: React.FC = () => {
  const [drugInput, setDrugInput] = useState('');
  const [drugs, setDrugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDrug = () => {
    if (drugInput.trim() && !drugs.includes(drugInput.trim())) {
      setDrugs(prev => [...prev, drugInput.trim()]);
      setDrugInput('');
    }
  };

  const handleCheck = async () => {
    if (drugs.length < 2) return;
    setLoading(true);
    setError(null);
    setContent(null);
    try {
      const res = await fetch('/api/drug-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drugs })
      });
      if (!res.ok) throw new Error('Failed to check interactions.');
      const data = await res.json();
      setContent(data.response);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={drugInput}
            onChange={(e) => setDrugInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDrug())}
            placeholder="Enter a medication name..."
            className="flex-1 bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
          <button onClick={addDrug} className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors">
            <Plus size={18} />
          </button>
        </div>
        {drugs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {drugs.map((d) => (
              <span key={d} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 text-xs font-bold rounded-full">
                <Pill size={12} /> {d}
                <button onClick={() => setDrugs(prev => prev.filter(x => x !== d))}><Trash2 size={12} /></button>
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleCheck}
          disabled={drugs.length < 2 || loading}
          className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <AlertTriangle size={16} /> Check Interactions ({drugs.length} drugs)
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
            <p className="text-sm font-medium animate-pulse">Analyzing drug interactions...</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm">
            <p className="font-bold mb-1">Error</p><p>{error}</p>
          </div>
        )}
        {!loading && !error && !content && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50">
            <AlertTriangle size={32} /><p className="text-sm text-center">Add 2+ medications to check<br/>for potential interactions.</p>
          </div>
        )}
        {content && !loading && (
          <div className="prose prose-sm max-w-none text-[14px] text-foreground prose-headings:text-foreground prose-h1:text-xl prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-primary prose-h2:mt-6 prose-h2:mb-3 prose-li:marker:text-primary prose-strong:text-foreground prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border prose-td:p-2 prose-td:border prose-td:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
