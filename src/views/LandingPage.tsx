import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  ChevronRight, 
  Hospital as HospitalIcon,
  Activity,
  Layers,
  ClipboardList,
  Stethoscope
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { Hospital, HOSPITALS } from '../App';
import AddPatientModal from '../components/AddPatientModal';

interface LandingPageProps {
  selectedHospital: Hospital | null;
  onHospitalSelect: (h: Hospital) => void;
  onStartTreatment: (modality: string, patient: any) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ selectedHospital, onHospitalSelect, onStartTreatment }) => {
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    if (selectedHospital) {
      fetchRecentRecords();
    }
  }, [selectedHospital]);

  const fetchRecentRecords = async () => {
    setLoading(true);
    try {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);
      const q = query(
        collection(db, 'treatments'),
        where('hospitalId', '==', selectedHospital?.id),
        where('createdAt', '>=', seventyTwoHoursAgo),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(r => 
    r.patientDetails?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    r.patientDetails?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    r.patientDetails?.mrn?.includes(search)
  );

  if (!selectedHospital) {
    return (
      <div className="p-8 space-y-8 text-center max-w-md mx-auto mt-12">
        <div className="space-y-4">
          <HospitalIcon className="w-16 h-16 text-brand-primary mx-auto opacity-20" />
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Select Facility</h2>
          <p className="text-slate-500">Please select a hospital to view patient queue and recent records.</p>
        </div>
        <div className="grid gap-3">
          {HOSPITALS.map(h => (
            <button 
              key={h.id} 
              onClick={() => onHospitalSelect(h)}
              className="w-full p-6 bg-white border border-slate-200 rounded-3xl text-left hover:border-brand-primary transition-all shadow-sm hover:shadow-md flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-brand-primary/5 rounded-2xl group-hover:bg-brand-primary group-hover:text-white transition-colors">
                  <HospitalIcon className="w-6 h-6" />
                </div>
                <span className="font-bold text-slate-900 group-hover:text-brand-primary transition-colors">{h.name}</span>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 transition-transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Recent Records <span className="text-sm font-medium text-slate-400 font-mono">(last 72h)</span>
          </h1>
          <button onClick={() => onHospitalSelect(null as any)} className="text-xs font-bold text-brand-primary flex items-center gap-1 hover:underline">
            Switch Hospital
          </button>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>New Patient/Record</span>
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 flex items-center gap-3 px-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name, MRN..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 outline-none text-slate-700 font-medium placeholder:text-slate-300"
          />
        </div>
        <button className="p-2 text-slate-400 hover:bg-slate-50 rounded-xl transition-colors">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 italic">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">MRN/CSN</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Procedure</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Loading patient queue...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No recent records found in this facility.</td>
                </tr>
              ) : (
                filteredRecords.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer group" onClick={() => onStartTreatment(r.modality, r.patientDetails)}>
                    <td className="px-6 py-4">
                      <div className="text-xs font-bold text-slate-900">{new Date(r.createdAt?.toDate()).toLocaleDateString()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(r.createdAt?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-sm font-bold text-brand-primary hover:underline underline-offset-4 decoration-2">
                        {r.patientDetails?.lastName}, {r.patientDetails?.firstName}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs font-mono font-medium text-slate-600">{r.patientDetails?.mrn}</div>
                      <div className="text-[10px] text-slate-400">CSN: {r.csn || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ProcedureIcon type={r.modality} />
                        <span className="text-xs font-bold text-slate-700">{r.modality}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] uppercase tracking-widest font-black px-2 py-0.5 rounded-full ${r.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700 animate-pulse'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-brand-primary group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPatientModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        hospital={selectedHospital}
        onStartTreatment={onStartTreatment}
      />
    </div>
  );
};

const ProcedureIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'Hemodialysis': return <Activity className="w-4 h-4 text-blue-500" />;
    case 'PD': return <Layers className="w-4 h-4 text-indigo-500" />;
    case 'Apheresis': return <Stethoscope className="w-4 h-4 text-emerald-500" />;
    case 'Non-Treatment Services': return <ClipboardList className="w-4 h-4 text-slate-500" />;
    default: return null;
  }
};

export default LandingPage;
