import React, { useState } from 'react';
import { Search, Loader2, Layers, RotateCcw } from 'lucide-react';

interface Flashcard {
  question: string;
  answer: string;
}

export const FlashcardGenerator: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true); setError(null); setCards([]); setCurrentIndex(0); setShowAnswer(false);
    try {
      const res = await fetch('/api/flashcards', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic })
      });
      if (!res.ok) throw new Error('Failed to generate flashcards.');
      const data = await res.json();
      // Parse the JSON array from the response
      try {
        const parsed = JSON.parse(data.response);
        if (Array.isArray(parsed)) {
          setCards(parsed);
        } else {
          throw new Error('Invalid format');
        }
      } catch {
        // Fallback: try to extract Q&A pairs from markdown
        const lines = data.response.split('\n').filter((l: string) => l.trim());
        const fallbackCards: Flashcard[] = [];
        for (let i = 0; i < lines.length; i += 2) {
          if (lines[i + 1]) {
            fallbackCards.push({
              question: lines[i].replace(/^\*?\*?Q\d*[\.:]\s*/i, '').replace(/\*\*/g, ''),
              answer: lines[i + 1].replace(/^\*?\*?A\d*[\.:]\s*/i, '').replace(/\*\*/g, '')
            });
          }
        }
        if (fallbackCards.length > 0) setCards(fallbackCards);
        else setError('Could not parse flashcards. Try a different topic.');
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentIndex(prev => (prev + 1) % cards.length);
  };

  const prevCard = () => {
    setShowAnswer(false);
    setCurrentIndex(prev => (prev - 1 + cards.length) % cards.length);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0">
        <form onSubmit={handleGenerate} className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-muted-foreground" />
          <input type="text" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="E.g. Cranial Nerves, Cardiac Cycle..."
            className="w-full bg-muted border border-border rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {loading && <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3"><Loader2 className="animate-spin text-primary w-8 h-8" /><p className="text-sm font-medium animate-pulse">Generating flashcards...</p></div>}
        {error && <div className="p-4 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 text-sm"><p className="font-bold mb-1">Error</p><p>{error}</p></div>}

        {!loading && !error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50">
            <Layers size={32} /><p className="text-sm text-center">Enter a medical topic to<br/>generate study flashcards.</p>
          </div>
        )}

        {cards.length > 0 && !loading && (
          <div className="space-y-4">
            {/* Card Counter */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Card {currentIndex + 1} of {cards.length}</p>
              <button onClick={() => { setCards([]); setCurrentIndex(0); setShowAnswer(false); }} className="text-xs text-primary font-bold flex items-center gap-1"><RotateCcw size={12} /> Reset</button>
            </div>

            {/* Flashcard */}
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="w-full min-h-[200px] bg-card border-2 border-border rounded-2xl p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg cursor-pointer"
            >
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                {showAnswer ? 'ANSWER' : 'QUESTION'}
              </p>
              <p className="text-base font-medium text-foreground leading-relaxed">
                {showAnswer ? cards[currentIndex].answer : cards[currentIndex].question}
              </p>
              {!showAnswer && (
                <p className="text-xs text-muted-foreground mt-4 italic">Tap to reveal answer</p>
              )}
            </button>

            {/* Navigation */}
            <div className="flex gap-3">
              <button onClick={prevCard} className="flex-1 py-3 bg-muted text-foreground font-bold text-sm rounded-xl border border-border hover:bg-muted/80 transition-all">← Previous</button>
              <button onClick={nextCard} className="flex-1 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
