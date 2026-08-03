import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, X, Heart, Activity, Sparkles, Plus, Trash2 } from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: () => void;
}

const STEPS = ['basics', 'health', 'done'] as const;
type Step = typeof STEPS[number];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('basics');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [conditionInput, setConditionInput] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const stepIndex = STEPS.indexOf(step);

  const addCondition = () => {
    if (conditionInput.trim() && !conditions.includes(conditionInput.trim())) {
      setConditions(prev => [...prev, conditionInput.trim()]);
      setConditionInput('');
    }
  };

  const addAllergy = () => {
    if (allergyInput.trim() && !allergies.includes(allergyInput.trim())) {
      setAllergies(prev => [...prev, allergyInput.trim()]);
      setAllergyInput('');
    }
  };

  const handleSkip = async () => {
    try {
      await fetch('http://127.0.0.1:8000/profile/complete-onboarding', { method: 'POST' });
    } catch (e) {
      // Silently fail
    }
    onComplete();
  };

  const handleNext = () => {
    if (step === 'basics') setStep('health');
    else if (step === 'health') setStep('done');
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Save profile data
      const profilePayload: any = {};
      if (age) profilePayload.age = parseInt(age);
      if (sex) profilePayload.sex = sex;
      if (conditions.length > 0) profilePayload.chronic_conditions = conditions;
      if (allergies.length > 0) profilePayload.allergies = allergies;

      if (Object.keys(profilePayload).length > 0) {
        await fetch('http://127.0.0.1:8000/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profilePayload)
        });
      }

      // Mark onboarding complete
      await fetch('http://127.0.0.1:8000/profile/complete-onboarding', { method: 'POST' });
      onComplete();
    } catch (e) {
      console.error('Onboarding save error:', e);
      onComplete(); // Still close even on error
    } finally {
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: { x: 80, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -80, opacity: 0 }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="w-full max-w-md bg-background border border-border rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Progress Bar */}
        <div className="h-1.5 bg-muted">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>

        {/* Content Area */}
        <div className="p-8 min-h-[420px] flex flex-col">
          <AnimatePresence mode="wait">
            {/* Step 1: Basics */}
            {step === 'basics' && (
              <motion.div
                key="basics"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <Heart className="text-primary" size={28} />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-1">Welcome to HealthAssist</h2>
                <p className="text-sm text-muted-foreground mb-8">Let's set up your health profile in under a minute.</p>

                <div className="space-y-5 flex-1">
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Biological Sex</label>
                    <div className="flex gap-3">
                      {['Male', 'Female', 'Other'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setSex(option)}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all duration-200 ${
                            sex === option
                              ? 'bg-primary text-white border-primary shadow-md'
                              : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Health Context */}
            {step === 'health' && (
              <motion.div
                key="health"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col"
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-5">
                  <Activity className="text-blue-500" size={28} />
                </div>
                <h2 className="text-2xl font-black text-foreground mb-1">Health Context</h2>
                <p className="text-sm text-muted-foreground mb-6">This helps the AI give you more accurate, personalized advice.</p>

                <div className="space-y-5 flex-1">
                  {/* Conditions */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Chronic Conditions</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={conditionInput}
                        onChange={(e) => setConditionInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCondition())}
                        placeholder="e.g. Asthma, Diabetes..."
                        className="flex-1 bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                      <button onClick={addCondition} className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>
                    {conditions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {conditions.map((c) => (
                          <span key={c} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary text-xs font-bold rounded-full">
                            {c}
                            <button onClick={() => setConditions(prev => prev.filter(x => x !== c))}>
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Allergies */}
                  <div>
                    <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Allergies</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={allergyInput}
                        onChange={(e) => setAllergyInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                        placeholder="e.g. Penicillin, Peanuts..."
                        className="flex-1 bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                      />
                      <button onClick={addAllergy} className="p-2.5 bg-primary text-white rounded-xl hover:bg-primary/80 transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>
                    {allergies.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {allergies.map((a) => (
                          <span key={a} className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive text-xs font-bold rounded-full">
                            {a}
                            <button onClick={() => setAllergies(prev => prev.filter(x => x !== a))}>
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Done */}
            {step === 'done' && (
              <motion.div
                key="done"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex-1 flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1, damping: 12 }}
                  className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mb-6"
                >
                  <Sparkles className="text-green-500" size={36} />
                </motion.div>
                <h2 className="text-2xl font-black text-foreground mb-2">You're All Set!</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs">
                  Your health profile is ready. The AI will use this data to give you personalized, clinically accurate responses.
                </p>

                {/* Summary */}
                <div className="w-full bg-muted rounded-2xl p-4 text-left space-y-2 text-sm mb-4">
                  {age && <div><span className="font-bold text-foreground">Age:</span> <span className="text-muted-foreground">{age}</span></div>}
                  {sex && <div><span className="font-bold text-foreground">Sex:</span> <span className="text-muted-foreground">{sex}</span></div>}
                  {conditions.length > 0 && <div><span className="font-bold text-foreground">Conditions:</span> <span className="text-muted-foreground">{conditions.join(', ')}</span></div>}
                  {allergies.length > 0 && <div><span className="font-bold text-foreground">Allergies:</span> <span className="text-muted-foreground">{allergies.join(', ')}</span></div>}
                  {!age && !sex && conditions.length === 0 && allergies.length === 0 && (
                    <div className="text-muted-foreground italic">No data entered yet. You can update your profile anytime.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground font-medium transition-colors"
            >
              Skip for now
            </button>

            {step !== 'done' ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-md hover:shadow-lg"
              >
                Next <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Get Started'} <Sparkles size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
