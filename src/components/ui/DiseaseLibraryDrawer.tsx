import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, BookOpen, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface DiseaseLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiseaseLibraryDrawer: React.FC<DiseaseLibraryDrawerProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setContent(null);

    try {
      const response = await fetch('/api/disease-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: query })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch research data.');
      }

      const data = await response.json();
      setContent(data.response);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 left-0 bottom-0 w-[90%] max-w-md bg-background border-r border-border shadow-2xl z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-foreground leading-tight">Disease Library</h2>
                  <p className="text-xs text-muted-foreground">Research Syllabus Generator</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-6 pb-2 shrink-0">
              <form onSubmit={handleSearch} className="relative flex items-center">
                <Search size={18} className="absolute left-4 text-muted-foreground" />
                <input 
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="E.g. Multiple Sclerosis, Type 2 Diabetes..."
                  className="w-full bg-muted border border-border rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground transition-all"
                />
              </form>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
              {loading && (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
                  <Loader2 className="animate-spin text-primary w-8 h-8" />
                  <p className="text-sm font-medium animate-pulse">Compiling medical research...</p>
                </div>
              )}

              {error && (
                <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm">
                  <p className="font-bold mb-1">Error</p>
                  <p>{error}</p>
                </div>
              )}

              {!loading && !error && !content && (
                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50">
                  <BookOpen size={32} />
                  <p className="text-sm text-center">Search for a disease to generate<br/>a structured study guide.</p>
                </div>
              )}

              {content && !loading && (
                <div className="prose prose-sm max-w-none text-[14px] text-foreground
                  prose-p:leading-relaxed prose-headings:text-foreground prose-headings:font-bold
                  prose-h1:text-xl prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wider prose-h2:text-primary prose-h2:mt-6 prose-h2:mb-3
                  prose-li:marker:text-primary
                  prose-strong:text-foreground
                  prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border
                  prose-td:p-2 prose-td:border prose-td:border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
