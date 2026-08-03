import React, { useState } from 'react';
import { Loader2, Stethoscope, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const ClinicalCaseSimulator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('General Medicine');

  const SPECIALTIES = ['General Medicine', 'Cardiology', 'Neurology', 'Pulmonology', 'Gastroenterology', 'Endocrinology', 'Nephrology', 'Pediatrics'];

  const generateCase = async () => {
    setLoading(true); setError(null); setContent(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/clinical-case', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specialty })
      });
      if (!res.ok) throw new Error('Failed to generate case.');
      const data = await res.json();
      setContent(data.response);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0 space-y-3">
        <div>
          <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Specialty</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map(s => (
              <button key={s} onClick={() => setSpecialty(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${specialty === s ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <button onClick={generateCase} disabled={loading}
          className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
          {content ? <><RefreshCw size={16} /> New Case</> : <><Stethoscope size={16} /> Generate Clinical Case</>}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {loading && <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3"><Loader2 className="animate-spin text-primary w-8 h-8" /><p className="text-sm font-medium animate-pulse">Building patient scenario...</p></div>}
        {error && <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm"><p className="font-bold mb-1">Error</p><p>{error}</p></div>}
        {!loading && !error && !content && <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50"><Stethoscope size={32} /><p className="text-sm text-center">Select a specialty and generate<br/>a clinical case for practice.</p></div>}
        {content && !loading && (
          <div className="prose prose-sm max-w-none text-[14px] text-foreground prose-headings:text-foreground prose-h1:text-xl prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-primary prose-h2:mt-6 prose-h2:mb-3 prose-li:marker:text-primary prose-strong:text-foreground prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border prose-td:p-2 prose-td:border prose-td:border-border">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
