import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Activity, 
  User as UserIcon,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import CameraScanner from '../components/CameraScanner';
import { logAuditAction, AuditOperation } from '../services/auditService';

const clinicalSchema = z.object({
  mrn: z.string().min(1, "MRN is required"),
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Last Name is required"),
  dob: z.string().optional(),
  bp: z.string().optional(),
  pulse: z.string().optional(),
  temp: z.string().optional(),
  weight: z.string().optional(),
  notes: z.string().optional(),
  replacementVolume: z.string().optional(), // Apheresis specific
});

type ClinicalData = z.infer<typeof clinicalSchema>;

interface TreatmentFormProps {
  modality: 'hemodialysis' | 'apheresis' | 'nts';
  onBack: () => void;
}

const TreatmentForm: React.FC<TreatmentFormProps> = ({ modality, onBack }) => {
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ClinicalData>({
    resolver: zodResolver(clinicalSchema),
  });

  const watchPulse = watch('pulse');

  const onDataExtracted = (data: any) => {
    if (data.patient) {
      if (data.patient.mrn) setValue('mrn', data.patient.mrn);
      if (data.patient.firstName) setValue('firstName', data.patient.firstName);
      if (data.patient.lastName) setValue('lastName', data.patient.lastName);
      if (data.patient.dob) setValue('dob', data.patient.dob);
    }
    if (data.vitals) {
      if (data.vitals.bp) setValue('bp', data.vitals.bp);
      if (data.vitals.pulse) setValue('pulse', String(data.vitals.pulse));
      if (data.vitals.temp) setValue('temp', String(data.vitals.temp));
      if (data.vitals.weight) setValue('weight', String(data.vitals.weight));
    }
    if (data.apheresisDetails) {
        if (data.apheresisDetails.replacementVolume) setValue('replacementVolume', String(data.apheresisDetails.replacementVolume));
    }
  };

  const onSubmit = async (values: ClinicalData) => {
    let currentPath = 'patients';
    try {
      const patientData = {
        mrn: values.mrn,
        firstName: values.firstName,
        lastName: values.lastName,
        dob: values.dob || null,
      };

      // 1. Create/Update Patient
      const patientRef = await addDoc(collection(db, currentPath), {
          ...patientData,
          updatedAt: serverTimestamp(),
      });

      logAuditAction({
        operation: AuditOperation.CREATE,
        collectionName: currentPath,
        documentId: patientRef.id,
        details: { mrn: values.mrn }
      });

      // 2. Add modality-specific record
      currentPath = `patients/${patientRef.id}/${modality === 'nts' ? 'nts' : modality}`;
      const recordRef = await addDoc(collection(db, currentPath), {
        patientId: patientRef.id,
        teammateId: auth.currentUser?.uid,
        status: modality === 'nts' ? 'submitted' : 'pre',
        vitals: {
          bp: values.bp,
          pulse: values.pulse,
          temp: values.temp,
          weight: values.weight,
        },
        notes: values.notes,
        replacementVolume: values.replacementVolume ? Number(values.replacementVolume) : null,
        visitDate: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });

      logAuditAction({
        operation: AuditOperation.CREATE,
        collectionName: currentPath,
        documentId: recordRef.id,
        details: { patientId: patientRef.id, modality }
      });

      alert('Treatment data saved successfully.');
      onBack();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, currentPath);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-900 capitalize">{modality} Documentation</h2>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">New Encounter</p>
        </div>
      </div>

      {/* AI Assistant */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
            <Activity className="w-4 h-4 text-brand-primary" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">AI Assistant</h3>
        </div>
        <CameraScanner modality={modality} onDataExtracted={onDataExtracted} />
      </section>

      {/* Form Fields */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Patient Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1 border-b border-slate-100 pb-2">
            <UserIcon className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Patient Details</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">MRN</label>
              <input 
                {...register('mrn')} 
                className={`input-field ${errors.mrn ? 'border-red-500' : ''}`} 
                placeholder="e.g. 123456" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">First Name</label>
              <input {...register('firstName')} className="input-field" placeholder="John" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Last Name</label>
              <input {...register('lastName')} className="input-field" placeholder="Doe" />
            </div>
          </div>
        </section>

        {/* Clinical Section */}
        <section className="space-y-4 pt-2">
            <div className="flex items-center gap-2 px-1 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Clinical Intake</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">BP (mmHg)</label>
                    <input {...register('bp')} className="input-field" placeholder="120/80" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Pulse (bpm)</label>
                    <input {...register('pulse')} type="number" className="input-field" placeholder="72" />
                    {watchPulse && Number(watchPulse) > 120 && (
                        <p className="text-[10px] text-slate-500 font-medium ml-1">ⓘ Recommended value is 120 or less</p>
                    )}
                    {watchPulse && Number(watchPulse) > 300 && (
                        <p className="text-[10px] text-red-500 font-bold ml-1">⚠ Value must be 300 or less</p>
                    )}
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Temp (°F)</label>
                    <input {...register('temp')} type="number" step="0.1" className="input-field" placeholder="98.6" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Weight (kg)</label>
                    <input {...register('weight')} type="number" step="0.1" className="input-field" placeholder="70.5" />
                </div>
                
                {modality === 'apheresis' && (
                    <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase ml-1 text-indigo-600">Replacement Volume (mL)</label>
                        <input {...register('replacementVolume')} type="number" className="input-field border-indigo-100 focus:ring-indigo-500" placeholder="500" />
                    </div>
                )}

                <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Notes / Observations</label>
                    <textarea {...register('notes')} className="input-field min-h-[100px] py-3" placeholder="Enter clinical notes..." />
                </div>
            </div>
        </section>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full btn-primary py-4 text-lg font-bold shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? (
              <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Save & Continue
              </>
          )}
        </button>
      </form>
    </div>
  );
};

const Loader2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
);

export default TreatmentForm;
