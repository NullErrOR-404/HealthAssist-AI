import React, { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { BottomMenu } from "@/components/ui/BottomMenu";
import { Activity, User, Scale, ShieldAlert, HeartPulse, Save, Edit3, Sparkles, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { useSettingsStore } from "@/store/settingsStore";

interface ProfileData {
  age: number | null;
  sex: string | null;
  weight: string | null;
  chronic_conditions: string[];
  allergies: string[];
}

export const Profile = () => {
  const { toggleToolsDrawer } = useSettingsStore();
  const [profile, setProfile] = useState<ProfileData>({
    age: null,
    sex: "",
    weight: "",
    chronic_conditions: [],
    allergies: []
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const API_BASE_URL = "/api";
        const response = await fetch(`${API_BASE_URL}/profile`);
        const data = await response.json();
        setProfile({
          age: data.age,
          sex: data.sex || "",
          weight: data.weight || "",
          chronic_conditions: data.chronic_conditions || [],
          allergies: data.allergies || []
        });
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const API_BASE_URL = "/api";
      await fetch(`${API_BASE_URL}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save profile", err);
    } finally {
      setSaving(false);
    }
  };

  const handleArrayChange = (field: "chronic_conditions" | "allergies", value: string) => {
    const array = value.split(",").map(item => item.trim()).filter(Boolean);
    setProfile({ ...profile, [field]: array });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <HeartPulse className="animate-pulse text-primary w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 overflow-x-hidden selection:bg-primary/20">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-4 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center gap-3">
          <button onClick={() => toggleToolsDrawer(true)} className="p-2 -ml-2 text-foreground hover:bg-muted rounded-xl transition-colors">
            <Menu size={24} />
          </button>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
             <User className="text-primary w-5 h-5" />
             <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent pointer-events-none" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">Your Health Profile</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Sparkles size={10} className="text-accent" />
              AI syncs automatically from chats
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <button 
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25 disabled:opacity-50"
            >
              <Save size={16} /> {saving ? "Saving..." : "Save"}
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium hover:bg-secondary/80 transition-colors"
            >
              <Edit3 size={16} /> Edit
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-4xl mx-auto mt-4">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Biometrics Bento */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-2 bg-card rounded-3xl p-6 border border-border shadow-sm group hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Activity className="text-primary w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Core Biometrics</h2>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {/* Age */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Age</label>
                {isEditing ? (
                  <input 
                    type="number"
                    value={profile.age || ""}
                    onChange={(e) => setProfile({...profile, age: e.target.value ? parseInt(e.target.value) : null})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 25"
                  />
                ) : (
                  <div className="text-2xl font-bold">{profile.age || "--"} <span className="text-base font-normal text-muted-foreground">yrs</span></div>
                )}
              </div>

              {/* Sex */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Biological Sex</label>
                {isEditing ? (
                  <select 
                    value={profile.sex || ""}
                    onChange={(e) => setProfile({...profile, sex: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                ) : (
                  <div className="text-2xl font-bold">{profile.sex || "--"}</div>
                )}
              </div>

              {/* Weight */}
              <div className="space-y-1">
                <label className="text-sm text-muted-foreground font-medium">Weight</label>
                {isEditing ? (
                  <input 
                    type="text"
                    value={profile.weight || ""}
                    onChange={(e) => setProfile({...profile, weight: e.target.value})}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="e.g. 70kg"
                  />
                ) : (
                  <div className="text-2xl font-bold">{profile.weight || "--"}</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Conditions Bento */}
          <motion.div variants={itemVariants} className="col-span-1 bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden group hover:border-accent/20 transition-colors">
            <div className="absolute -right-6 -top-6 text-accent/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <HeartPulse w-32 h-32 strokeWidth={1} />
            </div>
            
            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2.5 bg-accent/10 rounded-xl">
                <HeartPulse className="text-accent w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Conditions</h2>
            </div>
            
            <div className="relative z-10 h-full">
              {isEditing ? (
                <textarea 
                  value={profile.chronic_conditions.join(", ")}
                  onChange={(e) => handleArrayChange("chronic_conditions", e.target.value)}
                  className="w-full h-24 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                  placeholder="e.g. Asthma, Hypertension (comma separated)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.chronic_conditions.length > 0 ? (
                    profile.chronic_conditions.map((c, i) => (
                      <span key={i} className="px-3 py-1 bg-accent/10 text-accent rounded-full text-sm font-medium border border-accent/20">
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm italic">No known conditions. Let the AI know if this changes.</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* Allergies Bento */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-3 bg-card rounded-3xl p-6 border border-border shadow-sm relative overflow-hidden group hover:border-destructive/20 transition-colors">
             <div className="absolute -right-6 -bottom-6 text-destructive/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
              <ShieldAlert w-32 h-32 strokeWidth={1} />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2.5 bg-destructive/10 rounded-xl">
                <ShieldAlert className="text-destructive w-6 h-6" />
              </div>
              <h2 className="text-xl font-semibold">Allergies & Contraindications</h2>
            </div>
            
            <div className="relative z-10">
              {isEditing ? (
                <textarea 
                  value={profile.allergies.join(", ")}
                  onChange={(e) => handleArrayChange("allergies", e.target.value)}
                  className="w-full h-20 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50 resize-none"
                  placeholder="e.g. Penicillin, Peanuts (comma separated)"
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.allergies.length > 0 ? (
                    profile.allergies.map((a, i) => (
                      <span key={i} className="px-3 py-1 bg-destructive/10 text-destructive rounded-full text-sm font-medium border border-destructive/20">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-sm italic flex items-center gap-2">
                      <Sparkles size={14} className="text-primary/50" />
                      The AI will automatically update this if you mention an allergy in your chats.
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>

      <BottomMenu />
    </div>
  );
}

export default Profile;
