/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogOut, 
  Activity, 
  User as UserIcon,
  ChevronLeft
} from 'lucide-react';
import LandingPage from './views/LandingPage';
import TreatmentWizard from './views/TreatmentWizard';

export type Hospital = { id: string; name: string };
export const HOSPITALS: Hospital[] = [
  { id: 'kfh-sj', name: 'KFH San Jose' },
  { id: 'kfh-sc', name: 'KFH Santa Clara' }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [activeTreatment, setActiveTreatment] = useState<any | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Activity className="w-12 h-12 text-brand-primary animate-bounce" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6">
          <Activity className="w-12 h-12 text-brand-primary mx-auto" />
          <h1 className="text-2xl font-bold">PATH Mobile</h1>
          <button onClick={signInWithGoogle} className="w-full btn-primary py-4 rounded-2xl font-bold">Sign In with DaVita SSO</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
            {activeTreatment && (
                <button onClick={() => setActiveTreatment(null)} className="p-1 hover:bg-slate-100 rounded">
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
            )}
            <Activity className="w-6 h-6 text-brand-primary" />
            <span className="font-bold text-lg tracking-tight text-brand-primary">PATH</span>
            {selectedHospital && !activeTreatment && (
                <span className="text-[10px] font-bold text-white bg-brand-primary px-2 py-0.5 rounded-full ml-2">
                    {selectedHospital.name}
                </span>
            )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold text-slate-500 uppercase">{user.displayName?.split(' ')[0]}</span>
          <button onClick={logout} className="p-1.5 text-slate-400 hover:text-red-500"><LogOut className="w-4 h-4" /></button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {activeTreatment ? (
            <TreatmentWizard 
              treatment={activeTreatment} 
              hospital={selectedHospital!}
              onClose={() => setActiveTreatment(null)} 
            />
          ) : (
            <LandingPage 
              onHospitalSelect={setSelectedHospital}
              selectedHospital={selectedHospital}
              onStartTreatment={(modality, patient) => setActiveTreatment({ modality, patient })}
            />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
