import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft, BookOpen, Stethoscope } from 'lucide-react';
import { DiseaseLibrary } from '../tools/DiseaseLibrary';

interface ClinicalToolsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolId = 'disease' | null;

const TOOLS = [
  { id: 'disease' as ToolId, name: 'Disease Library', desc: 'Research syllabus generator', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
];

const ToolContent: React.FC<{ toolId: ToolId }> = ({ toolId }) => {
  switch (toolId) {
    case 'disease': return <DiseaseLibrary />;
    default: return null;
  }
};

export const ClinicalToolsDrawer: React.FC<ClinicalToolsDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTool, setActiveTool] = useState<ToolId>(null);

  const activeToolMeta = TOOLS.find(t => t.id === activeTool);

  const handleClose = () => {
    setActiveTool(null);
    onClose();
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
            onClick={handleClose}
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
            <div className="p-5 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {activeTool ? (
                  <button onClick={() => setActiveTool(null)} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors">
                    <ArrowLeft size={18} />
                  </button>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Stethoscope size={20} />
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-foreground leading-tight text-sm">
                    {activeToolMeta ? activeToolMeta.name : 'Clinical Tools'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {activeToolMeta ? activeToolMeta.desc : 'Medical research & study hub'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {!activeTool ? (
                  /* Level 1: Tool Selector List */
                  <motion.div
                    key="hub"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 flex flex-col gap-3 overflow-y-auto h-full"
                  >
                    {TOOLS.map((tool) => {
                      const Icon = tool.icon;
                      return (
                        <motion.button
                          whileHover={{ y: [0, -3, 0], transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                          key={tool.id}
                          onClick={() => setActiveTool(tool.id)}
                          className="flex items-center text-left p-4 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all group"
                        >
                          <div className={`w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center mr-4 group-hover:scale-105 transition-transform shrink-0`}>
                            <Icon size={22} className={tool.color} />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm mb-0.5">{tool.name}</p>
                            <p className="text-xs text-muted-foreground leading-tight">{tool.desc}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                ) : (
                  /* Level 2: Active Tool */
                  <motion.div
                    key={activeTool}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="h-full overflow-hidden flex flex-col"
                  >
                    <ToolContent toolId={activeTool} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
