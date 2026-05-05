import React from 'react';
import { 
  ChevronRight, 
  Activity, 
  Layers, 
  ClipboardList, 
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  onStartTreatment: (modality: 'hemodialysis' | 'apheresis' | 'nts') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onStartTreatment }) => {
  return (
    <div className="space-y-8 py-4">
      {/* Welcome & Stats */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 px-1">Welcome back, Teammate</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg shadow-blue-200">
            <Clock className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">4</p>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Active Tx</p>
          </div>
          <div className="bg-emerald-500 p-4 rounded-3xl text-white shadow-lg shadow-emerald-200">
            <CheckCircle2 className="w-6 h-6 mb-2 opacity-80" />
            <p className="text-2xl font-bold">12</p>
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Submitted</p>
          </div>
        </div>
      </section>

      {/* Modalities */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest">Select Modality</h3>
        </div>
        
        <div className="space-y-3">
          <ModalityCard 
            title="Hemodialysis"
            description="Full treatment documentation & billing"
            icon={<Activity className="w-6 h-6" />}
            color="bg-blue-50 text-blue-600"
            onClick={() => onStartTreatment('hemodialysis')}
          />
          <ModalityCard 
            title="Apheresis"
            description="Cell exchange & depletion services"
            icon={<Layers className="w-6 h-6" />}
            color="bg-indigo-50 text-indigo-600"
            onClick={() => onStartTreatment('apheresis')}
          />
          <ModalityCard 
            title="Non-Treatment Service"
            description="Clerical, consults & support"
            icon={<ClipboardList className="w-6 h-6" />}
            color="bg-slate-100 text-slate-600"
            onClick={() => onStartTreatment('nts')}
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <h3 className="font-bold text-slate-700 uppercase text-xs tracking-widest px-1 text-center italic opacity-50">Experimental AI Data Entry Enabled</h3>
        <div className="p-6 bg-brand-primary text-white rounded-3xl shadow-xl space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 space-y-3">
                <AlertCircle className="w-8 h-8 text-blue-200" />
                <h4 className="text-lg font-bold">New: Scan & Populate</h4>
                <p className="text-sm text-blue-100 leading-relaxed">
                    Point your camera at a patient bracelet or monitor to instantly populate form fields using AI.
                </p>
            </div>
        </div>
      </section>
    </div>
  );
};

interface ModalityCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}

const ModalityCard: React.FC<ModalityCardProps> = ({ title, description, icon, color, onClick }) => (
  <motion.button
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full p-5 bg-white border border-slate-100 rounded-3xl flex items-center gap-4 shadow-sm hover:shadow-md transition-all text-left group"
  >
    <div className={`p-4 rounded-2xl ${color} group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{title}</h4>
      <p className="text-xs text-slate-500 font-medium">{description}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-brand-primary transition-colors" />
  </motion.button>
);

export default Dashboard;
