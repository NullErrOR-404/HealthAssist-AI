import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


export const DiseaseLibrary: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&namespace=0&format=json&origin=*`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data[1] || []);
        }
      } catch (err) {
        console.error("Failed to fetch autocomplete", err);
      }
    };
    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = async (e?: React.FormEvent, searchOverride?: string) => {
    if (e) e.preventDefault();
    const searchQuery = searchOverride || query;
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);
    setContent(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/disease-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disease: searchQuery })
      });
      if (!res.ok) {
        let errorDetail = 'Failed to fetch.';
        try {
          const errData = await res.json();
          if (errData.detail) errorDetail = errData.detail;
        } catch (e) {}
        throw new Error(errorDetail);
      }
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
      <div className="p-4 pb-2 shrink-0 relative" ref={wrapperRef}>
        <form onSubmit={handleSearch} className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-muted-foreground z-10" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="E.g. Multiple Sclerosis, Type 2 Diabetes..."
            className="w-full bg-muted border border-border rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
        </form>
        {/* Dropdown Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-[calc(100%-0.5rem)] left-4 right-4 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((disease) => (
              <button
                key={disease}
                type="button"
                onClick={() => handleSearch(undefined, disease)}
                className="w-full text-left px-4 py-3 text-sm font-medium text-foreground hover:bg-muted transition-colors flex items-center justify-between group"
              >
                {disease}
                <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {loading && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Loader2 className="animate-spin text-primary w-8 h-8" />
            <p className="text-sm font-medium animate-pulse">Compiling medical research...</p>
          </div>
        )}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm">
            <p className="font-bold mb-1">Error</p><p>{error}</p>
          </div>
        )}
        {!loading && !error && !content && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50">
            <BookOpen size={32} /><p className="text-sm text-center">Search for a disease to generate<br/>a structured study guide.</p>
          </div>
        )}
        {content && !loading && (
          <div className="flex flex-col gap-5 pb-12">
            {content.split(/(?=## )/g).map((chunk, idx) => {
              if (!chunk.trim()) return null;
              const isHero = idx === 0;
              return (
                <div key={idx} className={isHero ? "mb-2" : "bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"}>
                  <div className="prose prose-sm max-w-none text-[14.5px] leading-relaxed text-foreground prose-headings:text-foreground prose-h1:text-2xl prose-h1:font-extrabold prose-h1:tracking-tight prose-h1:mb-2 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-primary prose-h2:mt-0 prose-h2:mb-4 prose-h2:font-bold prose-li:marker:text-primary prose-strong:text-foreground prose-p:leading-relaxed prose-li:leading-relaxed prose-table:border-collapse prose-table:w-full prose-th:bg-muted prose-th:p-2 prose-th:border prose-th:border-border prose-td:p-2 prose-td:border prose-td:border-border">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        img: ({node, ...props}) => (
                          <div className="w-full h-56 md:h-64 overflow-hidden rounded-2xl mb-6 shadow-md border border-border relative group cursor-pointer">
                            <img {...props} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-5">
                              {props.alt && (
                                <p className="text-white/90 font-semibold text-sm drop-shadow-md tracking-wide">
                                  {props.alt.replace(/Clinical Image|Molecule\/Pill/gi, '').trim()}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      }}
                    >
                      {chunk}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
