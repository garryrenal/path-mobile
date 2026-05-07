/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import LandingPage from './views/LandingPage';
import TreatmentWizard from './views/TreatmentWizard';
import { auth, signInWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Stethoscope, LogOut } from 'lucide-react';

export interface Hospital {
  id: string;
  name: string;
}

export const HOSPITALS: Hospital[] = [
  { id: 'h1', name: 'General Memorial Hospital' },
  { id: 'h2', name: 'University Medical Center' },
  { id: 'h3', name: 'St. Jude Children Hospital' },
];

export default function App() {
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [activeTreatment, setActiveTreatment] = useState<{ modality: string; patient: any } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-pulse text-brand-primary font-bold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center space-y-6">
          <div className="bg-brand-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <Stethoscope className="w-10 h-10 text-brand-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">Dialysis EMR</h1>
            <p className="text-slate-500 mt-2">Please sign in to access patient records.</p>
          </div>
          <button 
            onClick={signInWithGoogle}
            className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (activeTreatment && selectedHospital) {
    return (
      <TreatmentWizard 
        treatment={activeTreatment} 
        hospital={selectedHospital} 
        onClose={() => setActiveTreatment(null)} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-primary font-bold">
          <Stethoscope className="w-5 h-5" />
          <span>Dialysis EMR</span>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <span className="text-slate-500 hidden sm:inline">{user.email}</span>
          <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors" title="Log out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto py-4">
        <LandingPage 
          selectedHospital={selectedHospital}
          onHospitalSelect={setSelectedHospital}
          onStartTreatment={(modality, patient) => setActiveTreatment({ modality, patient })}
        />
      </main>
    </div>
  );
}


