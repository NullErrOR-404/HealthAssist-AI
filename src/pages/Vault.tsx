import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Folder, Upload, FileText, Image as ImageIcon, Loader2, Search, X } from 'lucide-react';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { AuthButton } from '../components/ui/AuthButton';
import { useAuthStore } from '../store/authStore';
import logo from '../assets/Logo.png';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { BottomMenu } from '../components/ui/BottomMenu';

interface Document {
  id: string;
  file_name: string;
  file_type: string;
  summary: string;
  url: string;
  uploaded_at: string;
}

const Vault = () => {
  const { session, isGuest } = useAuthStore();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/vault', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchDocuments();
  }, [session]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch('/api/vault/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData
      });
      
      if (res.ok) {
        await fetchDocuments();
      } else {
        console.error("Upload failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      <header className="pt-10 pb-6 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden border border-border">
             <img src={logo} alt="HealthAssist AI" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">Vault</h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Medical Records</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <AuthButton />
          <ThemeToggle />
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm hover:scale-110 hover:-translate-y-1 transition-all duration-300">
            <User size={18} />
          </button>
        </div>
      </header>

      <main className="px-6 sm:px-12 pt-8 max-w-7xl mx-auto space-y-8">
        {isGuest && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 p-4 rounded-2xl flex items-center gap-3">
            <Folder className="shrink-0" />
            <p className="text-sm font-medium">Guest Mode: Document uploading is disabled. Sign up for a free account to securely store and analyze your medical records.</p>
          </div>
        )}

        {/* Upload Action */}
        <section className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Your Documents</h2>
                <p className="text-muted-foreground text-sm">Upload lab results, x-rays, or prescriptions. AI will analyze them automatically.</p>
            </div>
            
            <div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                />
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isGuest}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    {uploading ? 'Analyzing...' : 'Upload File'}
                </button>
            </div>
        </section>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.length > 0 ? (
                documents.map(doc => {
                    const isPdf = doc.file_type === 'application/pdf';
                    return (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={doc.id} 
                            className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm flex flex-col hover:border-primary/50 transition-colors group cursor-pointer"
                            onClick={() => window.open(doc.url, '_blank')}
                        >
                            <div className="h-32 bg-muted/50 flex items-center justify-center relative border-b border-border">
                                {isPdf ? (
                                    <FileText className="w-12 h-12 text-blue-500/50" />
                                ) : (
                                    <div className="absolute inset-0 w-full h-full">
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <Search className="text-white w-8 h-8" />
                                        </div>
                                        <img src={doc.url} alt={doc.file_name} className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>
                            <div className="p-5 flex-1 flex flex-col">
                                <h3 className="font-bold text-foreground line-clamp-1 mb-1">{doc.file_name}</h3>
                                <p className="text-xs text-muted-foreground mb-3">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                                
                                <div className="mt-auto bg-primary/5 rounded-xl p-3 border border-primary/10">
                                    <p className="text-sm font-medium text-foreground line-clamp-3">
                                        <span className="font-bold text-primary mr-1">AI Summary:</span> 
                                        {doc.summary}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })
            ) : (
                <div className="col-span-full border-2 border-dashed border-border rounded-3xl p-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/20">
                    <Folder className="w-16 h-16 mb-4 text-muted-foreground/50" />
                    <h3 className="text-xl font-bold text-foreground mb-2">Vault is Empty</h3>
                    <p className="max-w-md">Securely store your medical records here. When you upload a document, HealthAssist AI will automatically analyze it and save a summary.</p>
                </div>
            )}
          </section>
        )}
      </main>

      <BottomMenu />
    </div>
  );
};

export default Vault;
