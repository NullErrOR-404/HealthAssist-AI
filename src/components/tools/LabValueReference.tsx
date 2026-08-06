import React, { useState } from 'react';
import { Search, TestTubes } from 'lucide-react';

interface LabValue {
  test: string;
  unit: string;
  normal: string;
  category: string;
}

const LAB_VALUES: LabValue[] = [
  // CBC
  { test: 'WBC', unit: 'x10⁹/L', normal: '4.5 – 11.0', category: 'CBC' },
  { test: 'RBC (Male)', unit: 'x10¹²/L', normal: '4.5 – 5.9', category: 'CBC' },
  { test: 'RBC (Female)', unit: 'x10¹²/L', normal: '4.0 – 5.2', category: 'CBC' },
  { test: 'Hemoglobin (Male)', unit: 'g/dL', normal: '13.5 – 17.5', category: 'CBC' },
  { test: 'Hemoglobin (Female)', unit: 'g/dL', normal: '12.0 – 16.0', category: 'CBC' },
  { test: 'Hematocrit (Male)', unit: '%', normal: '38.3 – 48.6', category: 'CBC' },
  { test: 'Hematocrit (Female)', unit: '%', normal: '35.5 – 44.9', category: 'CBC' },
  { test: 'Platelets', unit: 'x10⁹/L', normal: '150 – 400', category: 'CBC' },
  { test: 'MCV', unit: 'fL', normal: '80 – 100', category: 'CBC' },
  { test: 'MCH', unit: 'pg', normal: '27 – 33', category: 'CBC' },
  // BMP
  { test: 'Sodium', unit: 'mEq/L', normal: '136 – 145', category: 'BMP' },
  { test: 'Potassium', unit: 'mEq/L', normal: '3.5 – 5.0', category: 'BMP' },
  { test: 'Chloride', unit: 'mEq/L', normal: '98 – 106', category: 'BMP' },
  { test: 'Bicarbonate (CO₂)', unit: 'mEq/L', normal: '23 – 30', category: 'BMP' },
  { test: 'BUN', unit: 'mg/dL', normal: '7 – 20', category: 'BMP' },
  { test: 'Creatinine', unit: 'mg/dL', normal: '0.7 – 1.3', category: 'BMP' },
  { test: 'Glucose (Fasting)', unit: 'mg/dL', normal: '70 – 100', category: 'BMP' },
  { test: 'Calcium', unit: 'mg/dL', normal: '8.5 – 10.5', category: 'BMP' },
  // LFT
  { test: 'ALT (SGPT)', unit: 'U/L', normal: '7 – 56', category: 'LFT' },
  { test: 'AST (SGOT)', unit: 'U/L', normal: '10 – 40', category: 'LFT' },
  { test: 'ALP', unit: 'U/L', normal: '44 – 147', category: 'LFT' },
  { test: 'Total Bilirubin', unit: 'mg/dL', normal: '0.1 – 1.2', category: 'LFT' },
  { test: 'Direct Bilirubin', unit: 'mg/dL', normal: '0.0 – 0.3', category: 'LFT' },
  { test: 'Albumin', unit: 'g/dL', normal: '3.4 – 5.4', category: 'LFT' },
  { test: 'Total Protein', unit: 'g/dL', normal: '6.0 – 8.3', category: 'LFT' },
  // Coag
  { test: 'PT', unit: 'seconds', normal: '11 – 13.5', category: 'Coagulation' },
  { test: 'INR', unit: 'ratio', normal: '0.8 – 1.1', category: 'Coagulation' },
  { test: 'aPTT', unit: 'seconds', normal: '25 – 35', category: 'Coagulation' },
  // Lipid
  { test: 'Total Cholesterol', unit: 'mg/dL', normal: '< 200', category: 'Lipid Panel' },
  { test: 'LDL', unit: 'mg/dL', normal: '< 100', category: 'Lipid Panel' },
  { test: 'HDL (Male)', unit: 'mg/dL', normal: '> 40', category: 'Lipid Panel' },
  { test: 'HDL (Female)', unit: 'mg/dL', normal: '> 50', category: 'Lipid Panel' },
  { test: 'Triglycerides', unit: 'mg/dL', normal: '< 150', category: 'Lipid Panel' },
  // Thyroid
  { test: 'TSH', unit: 'mIU/L', normal: '0.4 – 4.0', category: 'Thyroid' },
  { test: 'Free T4', unit: 'ng/dL', normal: '0.8 – 1.8', category: 'Thyroid' },
  { test: 'Free T3', unit: 'pg/mL', normal: '2.3 – 4.2', category: 'Thyroid' },
  // Cardiac
  { test: 'Troponin I', unit: 'ng/mL', normal: '< 0.04', category: 'Cardiac' },
  { test: 'BNP', unit: 'pg/mL', normal: '< 100', category: 'Cardiac' },
  { test: 'CK-MB', unit: 'ng/mL', normal: '0 – 5', category: 'Cardiac' },
  // Iron
  { test: 'Serum Iron', unit: 'μg/dL', normal: '60 – 170', category: 'Iron Studies' },
  { test: 'Ferritin (Male)', unit: 'ng/mL', normal: '12 – 300', category: 'Iron Studies' },
  { test: 'Ferritin (Female)', unit: 'ng/mL', normal: '12 – 150', category: 'Iron Studies' },
  { test: 'TIBC', unit: 'μg/dL', normal: '250 – 370', category: 'Iron Studies' },
];

export const LabValueReference: React.FC = () => {
  const [search, setSearch] = useState('');

  const filtered = LAB_VALUES.filter(v =>
    v.test.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filtered.map(v => v.category))];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 pb-2 shrink-0">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search labs (e.g. Hemoglobin, LFT, Sodium...)"
            className="w-full bg-muted border border-border rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-4">
        {categories.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2 opacity-50">
            <TestTubes size={32} /><p className="text-sm">No matching lab values found.</p>
          </div>
        )}
        {categories.map(cat => (
          <div key={cat}>
            <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-2">{cat}</h3>
            <div className="bg-muted rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-2.5 text-xs font-bold text-muted-foreground uppercase">Test</th>
                    <th className="text-left p-2.5 text-xs font-bold text-muted-foreground uppercase">Normal</th>
                    <th className="text-left p-2.5 text-xs font-bold text-muted-foreground uppercase">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(v => v.category === cat).map(v => (
                    <tr key={v.test} className="border-b border-border/50 last:border-0">
                      <td className="p-2.5 font-medium text-foreground">{v.test}</td>
                      <td className="p-2.5 font-bold text-green-600">{v.normal}</td>
                      <td className="p-2.5 text-muted-foreground">{v.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
