import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  User as UserIcon, 
  ArrowRight,
  Activity,
  Layers,
  Stethoscope,
  ClipboardList,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hospital } from '../App';
import CameraScanner from './CameraScanner';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: Hospital;
  onStartTreatment: (modality: string, patient: any) => void;
}

const MODALITIES = [
  { id: 'Hemodialysis', icon: <Activity />, color: 'text-blue-600 bg-blue-50' },
  { id: 'PD', icon: <Layers />, color: 'text-indigo-600 bg-indigo-50' },
  { id: 'Apheresis', icon: <Stethoscope />, color: 'text-emerald-600 bg-emerald-50' },
  { id: 'Non-Treatment Services', icon: <ClipboardList />, color: 'text-slate-600 bg-slate-50' },
];

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, hospital, onStartTreatment }) => {
  const [step, setStep] = useState<'info' | 'modality'>('info');
  const [patientData, setPatientData] = useState({ 
    mrn: '', 
    firstName: '', 
    lastName: '', 
    csn: '',
    dob: '',
    gender: '',
    allergies: '',
    attending: '',
    codeStatus: ''
  });

  const handleNext = () => {
    if (patientData.mrn && patientData.firstName && patientData.lastName) {
      setStep('modality');
    }
  };

  const handleStart = (modality: string) => {
    onStartTreatment(modality, { ...patientData, hospitalId: hospital.id });
    onClose();
  };

  const onDataExtracted = (data: any) => {
    if (data.patient) {
      setPatientData({
        ...patientData,
        ...data.patient,
        csn: data.csn || patientData.csn,
        // Carry over other extracted data parts if needed for pre-filling
        vitals: data.vitals,
        dialysisOrder: data.dialysisOrder,
        labResults: data.labResults
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                {step === 'info' ? <UserIcon className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
             </div>
             <h3 className="font-extrabold text-xl text-slate-800">{step === 'info' ? 'Patient Information' : 'Select Procedure'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-8">
          <AnimatePresence mode="wait">
            {step === 'info' ? (
              <motion.div 
                key="info"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">AI Assistant</h4>
                  </div>
                  <CameraScanner modality="hemodialysis" onDataExtracted={onDataExtracted} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">MRN</label>
                    <input 
                      value={patientData.mrn}
                      onChange={(e) => setPatientData({...patientData, mrn: e.target.value})}
                      className="input-field py-3 text-lg font-mono font-bold" 
                      placeholder="e.g. 123456" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">First Name</label>
                    <input 
                      value={patientData.firstName}
                      onChange={(e) => setPatientData({...patientData, firstName: e.target.value})}
                      className="input-field py-3" 
                      placeholder="John" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Last Name</label>
                    <input 
                      value={patientData.lastName}
                      onChange={(e) => setPatientData({...patientData, lastName: e.target.value})}
                      className="input-field py-3" 
                      placeholder="Doe" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">DOB</label>
                    <input 
                      value={patientData.dob}
                      onChange={(e) => setPatientData({...patientData, dob: e.target.value})}
                      className="input-field py-3" 
                      placeholder="MM/DD/YYYY" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Gender</label>
                    <input 
                      value={patientData.gender}
                      onChange={(e) => setPatientData({...patientData, gender: e.target.value})}
                      className="input-field py-3" 
                      placeholder="Male/Female" 
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Allergies</label>
                    <input 
                      value={patientData.allergies}
                      onChange={(e) => setPatientData({...patientData, allergies: e.target.value})}
                      className="input-field py-3 text-red-600 font-bold" 
                      placeholder="None" 
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 italic">(Optional) CSN / Adm No.</label>
                    <input 
                      value={patientData.csn}
                      onChange={(e) => setPatientData({...patientData, csn: e.target.value})}
                      className="input-field py-3 italic" 
                      placeholder="e.g. 987654321" 
                    />
                  </div>
                </div>

                <button 
                  onClick={handleNext}
                  disabled={!patientData.mrn || !patientData.firstName || !patientData.lastName}
                  className="w-full btn-primary py-4 rounded-2xl text-lg font-bold disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  Confirm Details <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="modality"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid gap-4"
              >
                {MODALITIES.map((m) => (
                  <button 
                    key={m.id} 
                    onClick={() => handleStart(m.id)}
                    className="w-full p-6 bg-slate-50/50 border-2 border-transparent hover:border-brand-primary hover:bg-white transition-all rounded-3xl flex items-center gap-6 group"
                  >
                    <div className={`p-4 rounded-2xl ${m.color} group-hover:scale-110 transition-transform`}>
                      {React.cloneElement(m.icon as React.ReactElement, { className: 'w-8 h-8' })}
                    </div>
                    <div className="text-left">
                      <h4 className="font-black text-lg text-slate-800 tracking-tight">{m.id}</h4>
                      <p className="text-xs text-slate-500 font-medium">Document active procedure</p>
                    </div>
                    <ChevronRight className="w-6 h-6 ml-auto text-slate-200 group-hover:text-brand-primary" />
                  </button>
                ))}
                
                <button 
                  onClick={() => setStep('info')}
                  className="mt-4 text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest text-center"
                >
                  ← Back to Patient Info
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default AddPatientModal;
