import React, { useState } from 'react';
import { Calculator, ChevronRight } from 'lucide-react';

type CalcType = 'bmi' | 'gfr' | 'ascvd' | 'dose' | null;

const BMICalculator: React.FC = () => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [result, setResult] = useState<{ bmi: number; category: string } | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100; // cm to m
    if (!w || !h) return;
    const bmi = w / (h * h);
    let category = '';
    if (bmi < 18.5) category = 'Underweight';
    else if (bmi < 25) category = 'Normal';
    else if (bmi < 30) category = 'Overweight';
    else category = 'Obese';
    setResult({ bmi: Math.round(bmi * 10) / 10, category });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Weight (kg)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Height (cm)</label>
        <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="175" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <button onClick={calculate} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all">Calculate BMI</button>
      {result && (
        <div className="p-4 bg-primary/10 rounded-xl text-center">
          <p className="text-3xl font-black text-foreground">{result.bmi}</p>
          <p className="text-sm font-bold text-primary mt-1">{result.category}</p>
        </div>
      )}
    </div>
  );
};

const GFRCalculator: React.FC = () => {
  const [creatinine, setCreatinine] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<'male' | 'female'>('male');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const cr = parseFloat(creatinine);
    const a = parseInt(age);
    if (!cr || !a) return;
    // CKD-EPI simplified
    let gfr: number;
    if (sex === 'female') {
      if (cr <= 0.7) gfr = 144 * Math.pow(cr / 0.7, -0.329) * Math.pow(0.993, a);
      else gfr = 144 * Math.pow(cr / 0.7, -1.209) * Math.pow(0.993, a);
    } else {
      if (cr <= 0.9) gfr = 141 * Math.pow(cr / 0.9, -0.411) * Math.pow(0.993, a);
      else gfr = 141 * Math.pow(cr / 0.9, -1.209) * Math.pow(0.993, a);
    }
    setResult(Math.round(gfr));
  };

  const getStage = (gfr: number) => {
    if (gfr >= 90) return { stage: 'G1 — Normal', color: 'text-green-600' };
    if (gfr >= 60) return { stage: 'G2 — Mild ↓', color: 'text-yellow-600' };
    if (gfr >= 45) return { stage: 'G3a — Mild-Mod ↓', color: 'text-orange-500' };
    if (gfr >= 30) return { stage: 'G3b — Mod-Severe ↓', color: 'text-orange-600' };
    if (gfr >= 15) return { stage: 'G4 — Severe ↓', color: 'text-red-500' };
    return { stage: 'G5 — Kidney Failure', color: 'text-red-700' };
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Serum Creatinine (mg/dL)</label>
        <input type="number" step="0.1" value={creatinine} onChange={e => setCreatinine(e.target.value)} placeholder="1.0" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Age</label>
        <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="45" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sex</label>
        <div className="flex gap-3">
          {(['male', 'female'] as const).map(s => (
            <button key={s} onClick={() => setSex(s)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${sex === s ? 'bg-primary text-white border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/50'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <button onClick={calculate} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all">Calculate eGFR</button>
      {result !== null && (
        <div className="p-4 bg-primary/10 rounded-xl text-center">
          <p className="text-3xl font-black text-foreground">{result} <span className="text-sm font-medium">mL/min/1.73m²</span></p>
          <p className={`text-sm font-bold mt-1 ${getStage(result).color}`}>{getStage(result).stage}</p>
        </div>
      )}
    </div>
  );
};

const DoseConverter: React.FC = () => {
  const [weight, setWeight] = useState('');
  const [dosePerKg, setDosePerKg] = useState('');
  const [result, setResult] = useState<number | null>(null);

  const calculate = () => {
    const w = parseFloat(weight);
    const d = parseFloat(dosePerKg);
    if (!w || !d) return;
    setResult(Math.round(w * d * 100) / 100);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Patient Weight (kg)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="70" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <div>
        <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Dose per kg (mg/kg)</label>
        <input type="number" step="0.01" value={dosePerKg} onChange={e => setDosePerKg(e.target.value)} placeholder="5" className="w-full bg-muted border border-border rounded-xl py-2.5 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground" />
      </div>
      <button onClick={calculate} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all">Calculate Dose</button>
      {result !== null && (
        <div className="p-4 bg-primary/10 rounded-xl text-center">
          <p className="text-3xl font-black text-foreground">{result} <span className="text-sm font-medium">mg total</span></p>
        </div>
      )}
    </div>
  );
};

const CALCULATORS = [
  { id: 'bmi' as CalcType, name: 'BMI Calculator', desc: 'Body Mass Index' },
  { id: 'gfr' as CalcType, name: 'eGFR (CKD-EPI)', desc: 'Kidney function estimate' },
  { id: 'dose' as CalcType, name: 'Dose Converter', desc: 'Weight-based dosing' },
];

export const MedicalCalculators: React.FC = () => {
  const [activeCalc, setActiveCalc] = useState<CalcType>(null);

  if (activeCalc === 'bmi') return <div className="p-4"><button onClick={() => setActiveCalc(null)} className="text-sm text-primary font-bold mb-4">← Back to Calculators</button><BMICalculator /></div>;
  if (activeCalc === 'gfr') return <div className="p-4"><button onClick={() => setActiveCalc(null)} className="text-sm text-primary font-bold mb-4">← Back to Calculators</button><GFRCalculator /></div>;
  if (activeCalc === 'dose') return <div className="p-4"><button onClick={() => setActiveCalc(null)} className="text-sm text-primary font-bold mb-4">← Back to Calculators</button><DoseConverter /></div>;

  return (
    <div className="p-4 space-y-3">
      {CALCULATORS.map(calc => (
        <button key={calc.id} onClick={() => setActiveCalc(calc.id)} className="w-full flex items-center justify-between p-4 bg-muted rounded-xl border border-border hover:border-primary/50 transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><Calculator size={18} /></div>
            <div className="text-left">
              <p className="font-bold text-foreground text-sm">{calc.name}</p>
              <p className="text-xs text-muted-foreground">{calc.desc}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      ))}
    </div>
  );
};
