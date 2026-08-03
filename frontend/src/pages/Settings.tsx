import React, { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNavigate } from 'react-router-dom';
import { BottomMenu } from '@/components/ui/BottomMenu';
import { Settings as SettingsIcon, LogOut, ShieldAlert, Trash2, User, FileText, Phone, Zap, Eye, Download, Info, Menu } from 'lucide-react';

export const Settings = () => {
  const { user, signOut } = useAuthStore();
  const { llmEngine, setLlmEngine, highContrast, setHighContrast, textScale, setTextScale, toggleToolsDrawer } = useSettingsStore();
  const navigate = useNavigate();
  const [wiping, setWiping] = useState(false);
  
  // Modals state for legal text
  const [openModal, setOpenModal] = useState<'about' | 'privacy' | 'terms' | null>(null);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleWipeData = async () => {
    const confirm = window.confirm("WARNING: This will instantly clear all your local data, chat history, and sign you out to protect your privacy. Continue?");
    if (!confirm) return;

    setWiping(true);
    setTimeout(async () => {
      localStorage.clear();
      sessionStorage.clear();
      await signOut();
      navigate('/login');
    }, 1500);
  };

  const downloadHealthRecord = () => {
    // In a production app, we would use html2pdf or jspdf here.
    // For this implementation, we will use the native browser print API to save as PDF.
    window.print();
  };

  return (
    <div className="min-h-screen bg-background pb-24 selection:bg-primary/20">
      <div className="max-w-2xl mx-auto p-6">
        <header className="flex items-center gap-3 mb-8">
          <button onClick={() => toggleToolsDrawer(true)} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Settings</h1>
        </header>

        <div className="space-y-6">
          
          {/* Profile Section */}
          <section className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Account Profile</h2>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground">Authenticated Patient</p>
              </div>
            </div>
          </section>

          {/* Clinical Features */}
          <section className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} /> Clinical & Data
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl">
                <div>
                  <h3 className="font-bold text-foreground">Data Export</h3>
                  <p className="text-sm text-muted-foreground">Download your profile and chat history as a PDF to share with your doctor.</p>
                </div>
                <button onClick={downloadHealthRecord} className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors">
                  <Download size={20} />
                </button>
              </div>

              <div className="p-4 bg-destructive/10 rounded-2xl border border-destructive/20">
                <div className="flex items-center gap-2 mb-2">
                  <Phone className="text-destructive w-5 h-5" />
                  <h3 className="font-bold text-destructive">Emergency Contacts</h3>
                </div>
                <p className="text-sm text-destructive/80 mb-3">HealthAssist AI is not a doctor. If you are experiencing a medical emergency, please contact emergency services immediately.</p>
                <div className="flex gap-2">
                  <a href="tel:911" className="px-4 py-2 bg-destructive text-white rounded-lg font-bold text-sm hover:bg-destructive/90 transition-colors">Call 911</a>
                  <a href="tel:988" className="px-4 py-2 bg-background border border-destructive/30 text-destructive rounded-lg font-bold text-sm hover:bg-destructive/10 transition-colors">Crisis Lifeline (988)</a>
                </div>
              </div>
            </div>
          </section>

          {/* AI Engine & Accessibility */}
          <section className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap size={16} /> Preferences
            </h2>

            <div className="space-y-6">
              {/* LLM Engine */}
              <div>
                <label className="font-bold text-foreground block mb-2">AI Engine</label>
                <div className="flex bg-muted rounded-xl p-1">
                  <button 
                    onClick={() => setLlmEngine('fast')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${llmEngine === 'fast' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  >
                    Gemini Flash (Fast)
                  </button>
                  <button 
                    onClick={() => setLlmEngine('deep')}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${llmEngine === 'deep' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
                  >
                    Deep Analysis
                  </button>
                </div>
              </div>

              {/* Accessibility */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye size={18} className="text-muted-foreground" />
                    <span className="font-bold text-foreground">High Contrast Mode</span>
                  </div>
                  <button 
                    onClick={() => setHighContrast(!highContrast)}
                    className={`w-12 h-6 rounded-full relative transition-colors ${highContrast ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${highContrast ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <div>
                  <label className="font-bold text-foreground block mb-2">Text Scale</label>
                  <input 
                    type="range" 
                    min="0.8" max="1.5" step="0.1" 
                    value={textScale} 
                    onChange={(e) => setTextScale(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Small</span>
                    <span>Large</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
          
          {/* Legal & Info */}
          <section className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info size={16} /> Information
            </h2>
            <div className="space-y-2">
              <button onClick={() => setOpenModal('about')} className="w-full text-left p-3 hover:bg-muted/50 rounded-xl transition-colors font-medium">About Us</button>
              <button onClick={() => setOpenModal('privacy')} className="w-full text-left p-3 hover:bg-muted/50 rounded-xl transition-colors font-medium">Privacy Policy</button>
              <button onClick={() => setOpenModal('terms')} className="w-full text-left p-3 hover:bg-muted/50 rounded-xl transition-colors font-medium">Terms & Conditions</button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-card rounded-3xl p-6 shadow-sm border border-border">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert size={16} /> Danger Zone
            </h2>
            <div className="bg-destructive/10 rounded-2xl p-4 border border-destructive/20 mb-4">
              <h3 className="font-bold text-destructive mb-1">One-Tap Data Wipe</h3>
              <p className="text-sm text-destructive/80 mb-4">
                Instantly destroys all local session data, cached chats, and revokes your authentication token. Use this if you are on a shared device.
              </p>
              <button 
                onClick={handleWipeData}
                disabled={wiping}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {wiping ? 'Scrubbing Data...' : (
                  <>
                    <Trash2 size={18} /> Wipe My Data & Exit
                  </>
                )}
              </button>
            </div>
            
            <button 
              onClick={handleSignOut}
              className="w-full bg-muted hover:bg-muted/80 text-foreground font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={18} /> Standard Sign Out
            </button>
          </section>

        </div>
      </div>
      
      {/* Legal Modals */}
      {openModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <h2 className="text-2xl font-black mb-4">
              {openModal === 'about' && "About Us"}
              {openModal === 'privacy' && "Privacy Policy"}
              {openModal === 'terms' && "Terms & Conditions"}
            </h2>
            <div className="max-h-64 overflow-y-auto pr-2 text-sm text-muted-foreground space-y-4 mb-6">
              {/* Dummy content for demonstration */}
              <p>HealthAssist AI is an experimental AI medical co-pilot designed to simulate clinical reasoning using Large Language Models.</p>
              <p>We do not store your data on external tracking servers. Your profile lives in your dedicated database instance. However, by using this app, you agree that you are using this software for informational purposes only and not as a substitute for professional medical advice.</p>
              <p>In the event of an emergency, call your local emergency line immediately.</p>
            </div>
            <button 
              onClick={() => setOpenModal(null)}
              className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <BottomMenu />
    </div>
  );
};

export default Settings;
