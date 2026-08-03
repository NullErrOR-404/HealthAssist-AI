import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BentoGridWithFeatures, type BentoFeature } from '@/components/ui/BentoGrid';
import { BottomMenu } from '@/components/ui/BottomMenu';
import { Activity, HeartPulse, ActivitySquare, Stethoscope, AlertCircle, User, Menu } from 'lucide-react';
import logo from '@/assets/Logo.png'; 
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useSettingsStore } from '@/store/settingsStore';
import { OnboardingWizard } from '@/components/ui/OnboardingWizard';
import { AnimatePresence } from 'framer-motion';

export const Home = () => {
  const navigate = useNavigate();
  const { toggleToolsDrawer } = useSettingsStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const res = await fetch('http://127.0.0.1:8000/profile/onboarding-status');
        const data = await res.json();
        if (!data.hasCompletedOnboarding) {
          setShowOnboarding(true);
        }
      } catch (e) {
        // If fetch fails, don't block the user
      }
    };
    checkOnboarding();
  }, []);
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const features: BentoFeature[] = [
    {
      id: "1",
      title: "Current Vitals",
      description: "Heart rate and blood pressure are within normal ranges.",
      content: (
        <div className="flex flex-col items-center justify-center h-full w-full bg-primary/10 rounded-xl p-4 text-primary shadow-inner">
          <HeartPulse size={48} className="mb-2 opacity-80" />
          <span className="text-3xl font-black tracking-tight">72 BPM</span>
          <span className="text-sm font-semibold opacity-70">Resting</span>
        </div>
      ),
      className: "col-span-1 md:col-span-3 lg:col-span-2 border-b md:border-r border-gray-100",
    },
    {
      id: "2",
      title: "AI Triage Insights",
      description: "Based on your recent logs, you may be experiencing mild seasonal allergies.",
      content: (
        <div className="bg-accent/10 rounded-xl h-full w-full p-4 text-accent shadow-inner flex flex-col items-start justify-end">
          <Stethoscope size={32} className="mb-2 opacity-80" />
          <span className="font-bold">Recommendation:</span>
          <span className="text-sm opacity-80">Drink plenty of fluids and monitor for 24h.</span>
        </div>
      ),
      className: "col-span-1 md:col-span-3 lg:col-span-2 border-b lg:border-r border-gray-100",
    },
    {
      id: "3",
      title: "Medications",
      description: "Take 1x Vitamin D3 today at 12:00 PM.",
      content: (
        <div className="bg-muted rounded-xl h-full w-full min-h-[100px] flex items-center justify-center text-muted-foreground font-medium border border-dashed border-border">
          <ActivitySquare size={24} className="mr-2" /> Track Log
        </div>
      ),
      className: "col-span-1 md:col-span-6 lg:col-span-2 border-b lg:border-none",
    },
    {
      id: "4",
      title: "Emergency Actions",
      description: "Quickly access emergency services or share vital health context.",
      content: (
        <div className="flex gap-4 w-full h-full min-h-[60px]">
           <button className="flex-1 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold py-3 rounded-xl flex items-center justify-center transition-colors">
             <AlertCircle size={20} className="mr-2" /> SOS Call
           </button>
        </div>
      ),
      className: "col-span-1 md:col-span-6 lg:col-span-6 border-b border-gray-100",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      
      {/* Onboarding Wizard Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
        )}
      </AnimatePresence>
      
      {/* Header section with clinical aesthetic */}
      <header className="pt-10 pb-6 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50">
        <div className="flex items-center gap-3">
          <button onClick={() => toggleToolsDrawer(true)} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden border border-border">
             <img src={logo} alt="HealthAssist AI" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">HealthAssist</h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Clinical Dashboard</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center text-foreground shadow-sm hover:scale-110 hover:-translate-y-1 transition-all duration-300">
            <User size={18} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-6 sm:px-12 pt-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground mb-2">{getGreeting()}.</h2>
          <p className="text-lg text-gray-500 font-medium">Your vitals are stable. Let's review your health summary.</p>
        </div>

        {/* Bento Grid */}
        <BentoGridWithFeatures features={features} />
      </main>

      {/* Persistent Bottom Nav */}
      <BottomMenu />
    </div>
  );
};

export default Home;
