import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Maps from './pages/Maps';
import Login from './pages/Login';
import Settings from './pages/Settings';
import { useAuthStore } from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { Activity } from 'lucide-react';
import { ClinicalToolsDrawer } from './components/ui/ClinicalToolsDrawer';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -15 }}
    transition={{ duration: 0.35, ease: 'circOut' }}
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center flex-col">
         <Activity size={48} className="text-blue-600 animate-pulse mb-4" />
         <p className="text-gray-500 font-bold tracking-widest uppercase text-sm animate-pulse">Loading Clinical Data</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  const { session } = useAuthStore();
  const { highContrast, textScale, isToolsDrawerOpen, toggleToolsDrawer } = useSettingsStore();
  const location = useLocation();

  useEffect(() => {
    // Apply accessibility settings globally
    const root = document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    
    root.style.setProperty('--text-scale', textScale.toString());
    root.style.fontSize = `${textScale * 100}%`;
  }, [highContrast, textScale]);

  // Initialize Lenis smooth scroll
  useEffect(() => {
    const lenis = new Lenis({
      duration: 2.0,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <>
      <ClinicalToolsDrawer 
        isOpen={isToolsDrawerOpen} 
        onClose={() => toggleToolsDrawer(false)} 
      />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route 
            path="/login" 
            element={
              <PageTransition>
                {session ? <Navigate to="/" replace /> : <Login />}
              </PageTransition>
            } 
          />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Home />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/chat" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Chat />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/maps" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Maps />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <PageTransition>
                  <Settings />
                </PageTransition>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </AnimatePresence>
    </>
  );
}

export default App;
