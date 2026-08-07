import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Pill, Droplet, Heart, Scale, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { AuthButton } from '../components/ui/AuthButton';
import logo from '../assets/Logo.png';
import { useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { BottomMenu } from '../components/ui/BottomMenu';

interface Vital {
  id: string;
  metric_type: string;
  value: string;
  unit: string;
  recorded_at: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  active: boolean;
  created_at: string;
}

const Dashboard = () => {
  const { session } = useAuthStore();
  const navigate = useNavigate();
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vitalsRes, medsRes] = await Promise.all([
          fetch('/api/vitals', {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          }),
          fetch('/api/medications', {
            headers: { 'Authorization': `Bearer ${session?.access_token}` }
          })
        ]);

        if (vitalsRes.ok) setVitals(await vitalsRes.json());
        if (medsRes.ok) setMedications(await medsRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (session) fetchData();
  }, [session]);

  const chartData = vitals
    .filter(v => v.metric_type === 'blood_pressure')
    .map(v => {
      const [sys, dia] = v.value.split('/');
      return {
        date: new Date(v.recorded_at).toLocaleDateString(),
        systolic: parseInt(sys) || 0,
        diastolic: parseInt(dia) || 0,
      };
    }).reverse();

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 selection:bg-primary/20">
      <header className="pt-10 pb-6 px-6 sm:px-12 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-40 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-card shadow-sm flex items-center justify-center overflow-hidden border border-border">
             <img src={logo} alt="HealthAssist AI" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-foreground leading-tight">My Health</h1>
            <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">Vitals & Meds</p>
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
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Vitals Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-red-500" />
                <h2 className="text-2xl font-bold tracking-tight">Vitals Trend</h2>
              </div>
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-semibold text-muted-foreground mb-6 uppercase tracking-wider">Blood Pressure History</h3>
                {chartData.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                          itemStyle={{ color: 'var(--foreground)' }}
                        />
                        <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Systolic" />
                        <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Diastolic" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No blood pressure records found. Tell the AI Copilot to log your vitals!</p>
                )}
              </div>
            </section>

            {/* Medications Section */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Pill className="text-indigo-500" />
                <h2 className="text-2xl font-bold tracking-tight">Active Medications</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {medications.length > 0 ? (
                  medications.map(med => (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={med.id} 
                      className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-start gap-4 hover:border-indigo-500/50 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Pill className="text-indigo-500 w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-lg">{med.name}</h4>
                        <p className="text-sm text-muted-foreground">{med.dosage} {med.frequency && `• ${med.frequency}`}</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
                    <p>No active medications. Tell the AI Copilot when you start a new prescription!</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <BottomMenu />
    </div>
  );
};

export default Dashboard;
