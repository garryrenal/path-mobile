import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Save, 
  Clock, 
  Activity, 
  User as UserIcon,
  Stethoscope,
  ClipboardList,
  FileText,
  AlertTriangle,
  Beaker,
  Settings,
  BookOpen,
  ShieldCheck,
  Zap,
  Layout,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Hospital } from '../App';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import CameraScanner from '../components/CameraScanner';
import { logAuditAction, AuditOperation } from '../services/auditService';

interface TreatmentWizardProps {
  treatment: { modality: string; patient: any };
  hospital: Hospital;
  onClose: () => void;
}

// Subtab definitions for each modality
const SUBTABS_CONFIG: any = {
  'Hemodialysis': [
    { title: 'Patient Details', icon: <UserIcon /> },
    { title: 'Order', icon: <FileText /> },
    { title: 'Wait Time', icon: <Clock /> },
    { title: 'Equipment', icon: <Settings /> },
    { title: 'Pre-Treatment', icon: <Layout /> },
    { title: 'Patient Education', icon: <BookOpen /> },
    { title: 'Time Out Safety Check', icon: <ShieldCheck /> },
    { title: 'Tx Monitoring & Administrations', icon: <Zap /> },
    { title: 'Post-Treatment', icon: <Layout /> },
    { title: 'Review & Submit', icon: <CheckCircle2 /> }
  ],
  'PD': [
    { title: 'PD Tx Initiation Visit', icon: <Activity /> },
    { title: 'PD Support Visit', icon: <Stethoscope /> },
    { title: 'Time Out Safety Check', icon: <ShieldCheck /> },
    { title: 'PD Tx Completion Visit', icon: <CheckCircle2 /> },
    { title: 'Review & Submit', icon: <CheckCircle2 /> }
  ],
  'Apheresis': [
    { title: 'Patient Details', icon: <UserIcon /> },
    { title: 'Order', icon: <FileText /> },
    { title: 'Wait Time', icon: <Clock /> },
    { title: 'Machine', icon: <Settings /> },
    { title: 'Pre-Treatment', icon: <Layout /> },
    { title: 'Patient Education', icon: <BookOpen /> },
    { title: 'Time Out Safety Check', icon: <ShieldCheck /> },
    { title: 'Tx Monitoring & Administrations', icon: <Zap /> },
    { title: 'Post-Treatment', icon: <Layout /> },
    { title: 'Review & Submit', icon: <CheckCircle2 /> }
  ],
  'Non-Treatment Services': [
    { title: 'Patient Details', icon: <UserIcon /> },
    { title: 'Order', icon: <FileText /> },
    { title: 'Wait Time', icon: <Clock /> },
    { title: 'Patient Education', icon: <BookOpen /> },
    { title: 'Time Out Safety Check', icon: <ShieldCheck /> },
    { title: 'Non-Treatment Service', icon: <ClipboardList /> },
    { title: 'Review & Submit', icon: <CheckCircle2 /> }
  ]
};

const TreatmentWizard: React.FC<TreatmentWizardProps> = ({ treatment, hospital, onClose }) => {
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [extractionPreview, setExtractionPreview] = useState<any[] | null>(null);
  const [patientMismatch, setPatientMismatch] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({
    mrn: treatment.patient.mrn || '',
    csn: treatment.patient.csn || '',
    firstName: treatment.patient.firstName || '',
    lastName: treatment.patient.lastName || '',
    dob: treatment.patient.dob || '',
    gender: treatment.patient.gender || '',
    allergies: treatment.patient.allergies || '',
    attending: treatment.patient.attending || '',
    codeStatus: treatment.patient.codeStatus || '',
    // Vitals pre-fill
    weight: treatment.patient.vitals?.weight || '',
    bp: treatment.patient.vitals?.bp || '',
    pulse: treatment.patient.vitals?.pulse || '',
    temp: treatment.patient.vitals?.temp || '',
    resp: treatment.patient.vitals?.resp || '',
    sao2: treatment.patient.vitals?.spo2 || '',
    // Order pre-fill
    orderingPhysician: treatment.patient.dialysisOrder?.physician || '',
    priority: treatment.patient.dialysisOrder?.priority || '',
    dialyzer: treatment.patient.dialysisOrder?.dialyzer || '',
    prime: treatment.patient.dialysisOrder?.prime || '',
    duration: treatment.patient.dialysisOrder?.duration || '',
    targetWeight: treatment.patient.dialysisOrder?.targetWeight || '',
    accessType: treatment.patient.dialysisOrder?.accessType || '',
    accessLocation: treatment.patient.dialysisOrder?.accessLocation || '',
    bloodFlowRate: treatment.patient.dialysisOrder?.bloodFlowRate || '',
    dialysateFlowRate: treatment.patient.dialysisOrder?.dialysateFlowRate || '',
    potassium: treatment.patient.dialysisOrder?.potassium || '',
    calcium: treatment.patient.dialysisOrder?.calcium || '',
    sodium: treatment.patient.dialysisOrder?.sodium || '',
    bicarb: treatment.patient.dialysisOrder?.bicarb || '',
    ufGoal: treatment.patient.dialysisOrder?.ufGoal || '',
    minBP: treatment.patient.dialysisOrder?.minBP || '',
    dialysateTemp: treatment.patient.dialysisOrder?.dialysateTemp || '',
    sodiumBath: treatment.patient.dialysisOrder?.sodiumBath || '',
    sodiumModeling: treatment.patient.dialysisOrder?.sodiumModeling || '',
    ufProfile: treatment.patient.dialysisOrder?.ufProfile || '',
    // New Order Metadata
    treatmentDate: treatment.patient.dialysisOrder?.treatmentDate || '',
    orderDateTime: treatment.patient.dialysisOrder?.orderDateTime || '',
    // Labs pre-fill
    hbsag: treatment.patient.labResults?.hbsag || treatment.patient.hbsag || '',
    hbsagDate: treatment.patient.labResults?.hbsagDate || treatment.patient.hbsagDate || '',
    hbsab: treatment.patient.labResults?.hbsab || treatment.patient.hbsab || '',
    hbsabDate: treatment.patient.labResults?.hbsabDate || treatment.patient.hbsabDate || '',
    location: treatment.patient.location || '',
    diagnosis: treatment.patient.diagnosis || '',
    admittedDate: treatment.patient.admittedDate || '',
    // Assessment
    loc: '',
    orientedTo: '',
    neurologySpeech: '',
    respiratoryBreathingPattern: '',
    respiratoryBreathSoundsClear: 'Yes',
    respiratoryChestExpansion: 'Equal',
    respiratoryTubesDrainsAirways: '',
    respiratoryCough: 'None',
    cardiacVasopressors: 'No',
    cardiacHeartSounds: 'Regular',
    cardiacRhythm: 'Regular',
    giAbdomen: treatment.patient.giAbdomen || '',
    giBowelSounds: treatment.patient.giBowelSounds || '',
    giSymptoms: treatment.patient.giSymptoms || '',
    giTubesDrains: treatment.patient.giTubesDrains || '',
    skinStatus: 'Warm, Dry',
    skinFindings: 'None',
    skinFindingsLocation: '',
    edemaStatus: 'None',
    painScore: '0',
    painLocation: '',
    painQuality: '',
    painAction: '',
    breath: 'Clear',
    // Equipment
    roManufacturer: 'Millenium',
    roSerialNumber: '1323546',
    totalChlorinePrimary: 'Yes',
    waterDate: new Date().toISOString().split('T')[0],
    waterTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    machineManufacturer: 'FMC',
    machineSerialNumber: '212515',
    dialysatePH: '7.0',
    machineDialysateTemp: '36.5',
    machineConductivity: '13.8',
    meterConductivity: '14',
    alarmPHTPassed: 'Yes',
    alarmTestDate: new Date().toISOString().split('T')[0],
    alarmTestTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    dialyzerLotNumber: 'C214346',
    dialyzerExpirationDate: '2025-12-31',
    tubingLotNumber: '3157890',
    tubingExpirationDate: '2025-12-31',
    equipmentNote: '',
    // Time Out
    timeOutPatientIdConfirmed: false,
    timeOutProcedureConfirmed: false,
    timeOutSiteConfirmed: false,
    timeOutEquipmentChecked: false,
    timeOutCompletedBy: '',
    timeOutTime: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    // Treatment Monitoring
    monitoringEntries: [
      {
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        bp: '',
        map: '',
        pulse: '',
        resp: '',
        sao2: '',
        temp: '',
        bfr: '',
        dfr: '',
        ap: '',
        vp: '',
        tmp: '',
        ufr: '',
        bvc: '',
        hct: '',
        ufRem: '',
        transducerClear: true,
        accessVisible: true,
        oralIntake: '',
        status: 'Pt Awake & Alert',
        note: ''
      }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to normalize time to 24H HH:mm format for input type="time"
  const normalizeTime = (timeStr: any) => {
    if (!timeStr) return '';
    const clean = String(timeStr).trim().toLowerCase();
    
    // If it's already HH:mm
    if (/^\d{2}:\d{2}$/.test(clean)) return clean;
    // If it's H:mm
    if (/^\d{1}:\d{2}$/.test(clean)) return `0${clean}`;
    // If it's four digits HHmm (e.g. 0945)
    if (/^\d{4}$/.test(clean)) return `${clean.slice(0, 2)}:${clean.slice(2)}`;
    
    try {
      // Try parsing AM/PM or other formats
      if (clean.includes('am') || clean.includes('pm')) {
        const parts = clean.split(/[:\s]/);
        let hours = parseInt(parts[0], 10);
        const minutes = parts[1] || '00';
        if (clean.includes('pm') && hours < 12) hours += 12;
        if (clean.includes('am') && hours === 12) hours = 0;
        return `${hours.toString().padStart(2, '0')}:${minutes.padStart(2, '0')}`;
      }
    } catch (e) {
      console.warn("Time normalization failed for:", timeStr);
    }
    return clean;
  };

  // Helper to normalize date to YYYY-MM-DD
  const normalizeDate = (dateStr: any) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const clean = String(dateStr).trim();
    
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    
    try {
      const d = new Date(clean);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn("Date normalization failed for:", dateStr);
    }
    return clean;
  };

  const tabs = SUBTABS_CONFIG[treatment.modality] || [];

  const validatePatient = (extractedName: any) => {
    if (!extractedName) return;
    const extracted = String(extractedName).toLowerCase().trim();
    const lastName = (treatment.patient?.lastName || '').toLowerCase().trim();
    const firstName = (treatment.patient?.firstName || '').toLowerCase().trim();
    
    // Heuristic check: if extracted doesn't contain first or last name
    if (lastName && firstName && !extracted.includes(lastName) && !extracted.includes(firstName)) {
        setPatientMismatch(extractedName);
    } else if (lastName && !extracted.includes(lastName)) {
        setPatientMismatch(extractedName);
    } else if (firstName && !extracted.includes(firstName)) {
        setPatientMismatch(extractedName);
    } else {
        setPatientMismatch(null);
    }
  };

  const handleExtraction = (data: any) => {
    console.log("Extracted Data Received:", data);
    const updates: any = {};
    
    // Prioritized Tab Switching: Monitoring > Order > Patient
    if (data.monitoringEntries && Array.isArray(data.monitoringEntries) && data.monitoringEntries.length > 0) {
      console.log("Found monitoring entries:", data.monitoringEntries.length);
      
      // Auto-switch to flowsheet tab
      const monitoringTabIdx = tabs.findIndex((t: any) => 
        t.title === 'Tx Monitoring & Administrations' || t.title === 'Treatment'
      );
      if (monitoringTabIdx !== -1) {
        setActiveTabIdx(monitoringTabIdx);
      }

      // Check for patient name mismatch in monitoring entries (assuming it might be duplicated or unique to the scan)
      const monitoringPatientName = data.monitoringEntries.find((e: any) => e.patientName)?.patientName;
      if (monitoringPatientName) {
        validatePatient(monitoringPatientName);
      }
      
      // Filter valid entries
      const entries = data.monitoringEntries.filter((e: any) => 
        e.bp || e.pulse || e.hr || e.temp || e.resp || e.sao2 || e.spo2 || e.bfr || e.ufr
      ).map((e: any) => {
        // Map common aliases
        const normalized: any = { ...e };
        if (e.hr && !e.pulse) normalized.pulse = e.hr;
        if (e.spo2 && !e.sao2) normalized.sao2 = e.spo2;
        if (e.notes && !e.note) normalized.note = e.notes;
        if (e.vp && !normalized.vp) normalized.vp = e.vp;
        if (e.ap && !normalized.ap) normalized.ap = e.ap;
        if (e.tmp && !normalized.tmp) normalized.tmp = e.tmp;
        if (e.dfr && !normalized.dfr) normalized.dfr = e.dfr;
        if (e.map && !normalized.map) normalized.map = e.map;
        
        // Normalize time and date
        normalized.time = normalizeTime(e.time);
        normalized.date = normalizeDate(e.date);
        
        // Apply temperature logic if value was provided - removed unit logic
        normalized.selected = true;
        return normalized;
      });

      // Merge entries with exact same time to avoid duplicates and redundant cards
      const mergedMap = new Map();
      entries.forEach(e => {
        if (!e.time || e.time === 'unknown') return; // Skip entries without valid time
        
        const timeKey = e.time;
        if (mergedMap.has(timeKey)) {
          // Merge data - this combines fields if they were split across multiple extractions for same time
          mergedMap.set(timeKey, { ...mergedMap.get(timeKey), ...e });
        } else {
          mergedMap.set(timeKey, e);
        }
      });
      
      const validEntries = Array.from(mergedMap.values()).sort((a: any, b: any) => {
        // Sort by date first, then by time
        const dateA = String(a.date || '');
        const dateB = String(b.date || '');
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        
        const timeA = String(a.time || '');
        const timeB = String(b.time || '');
        return timeA.localeCompare(timeB);
      });
      
      if (validEntries.length > 0) {
        console.log("Setting extraction preview with valid entries:", validEntries.length);
        setExtractionPreview(validEntries);
      }
    } else if (data.dialysisOrder) {
        // Auto-switch to Order tab
        const orderTabIdx = tabs.findIndex((t: any) => t.title === 'Order');
        if (orderTabIdx !== -1) {
            setActiveTabIdx(orderTabIdx);
        }
    } else if (data.patient) {
        // Auto-switch to Patient Details tab
        const patientTabIdx = tabs.findIndex((t: any) => t.title === 'Patient Details');
        if (patientTabIdx !== -1) {
            setActiveTabIdx(patientTabIdx);
        }

        if (data.patient.name) {
            validatePatient(data.patient.name);
        }
    }

    if (data.patient) {
        Object.entries(data.patient).forEach(([key, val]) => {
            if (val === null || val === undefined || val === 'null' || val === 'N/A' || val === '') return;
            // Map attending/physician variations
            if (key === 'attending' || key === 'physician') updates.attending = val;
            if (key === 'csn') updates.csn = val;
            // Name splitting fallback
            if (key === 'name' && (!updates.firstName || !updates.lastName) && typeof val === 'string') {
                const parts = (val as string).split(/[, ]+/);
                if (parts.length >= 2) {
                    updates.lastName = parts[0];
                    updates.firstName = parts.slice(1).join(' ');
                }
            }
            // Map Hep B markers
            if (key === 'hbsag') {
                if (typeof val === 'string') {
                    const lval = val.toLowerCase();
                    if (lval.includes('negative')) updates.hbsag = 'Negative';
                    else if (lval.includes('positive')) updates.hbsag = 'Positive';
                    else if (lval.includes('unknown')) updates.hbsag = 'Unknown';
                    else updates.hbsag = val;
                } else {
                    updates.hbsag = val;
                }
            }
            if (key === 'hbsagDate') updates.hbsagDate = val;
            if (key === 'hbsab') {
                if (typeof val === 'string') {
                    const lval = val.toLowerCase();
                    if (lval.includes('negative')) updates.hbsab = 'Susceptible <10';
                    else if (lval.includes('positive')) updates.hbsab = 'Immune >10';
                    else if (lval.includes('unknown')) updates.hbsab = 'Unknown';
                    else updates.hbsab = val;
                } else {
                    updates.hbsab = val;
                }
            }
            if (key === 'hbsabDate') updates.hbsabDate = val;
            if (!['hbsag', 'hbsagDate', 'hbsab', 'hbsabDate'].includes(key)) updates[key] = val;
        });

        // Cross-pollinate attending/ordering physician if one is missing
        if (updates.attending && !updates.orderingPhysician) {
            updates.orderingPhysician = updates.attending;
        }
    }
    
    if (data.csn) {
        updates.csn = data.csn;
    }

    if (data.vitals) {
        Object.entries(data.vitals).forEach(([key, val]) => {
            if (val === null || val === undefined || val === 'null' || val === 'N/A' || val === '') return;
            if (key === 'spo2' || key === 'sao2') updates.sao2 = val;
            else updates[key] = val;
        });
    }

    if (data.labResults) {
        Object.entries(data.labResults).forEach(([key, val]) => {
            if (val === null || val === undefined || val === 'null' || val === 'N/A' || val === '') return;
            updates[key] = val;
        });
    }

    if (data.dialysisOrder) {
        const keyMap: any = {
            physician: 'orderingPhysician',
            bloodFlowRate: 'bloodFlowRate',
            bfr: 'bloodFlowRate',
            dialysateFlowRate: 'dialysateFlowRate',
            minBP: 'minBP',
            potassium: 'potassium',
            calcium: 'calcium',
            sodium: 'sodium',
            sodiumBath: 'sodium',
            sodiumModeling: 'sodiumModeling',
            bicarb: 'bicarb',
            ufGoal: 'ufGoal',
            ufProfile: 'ufProfile',
            dialysateTemp: 'dialysateTemp',
            type: 'orderType',
            accessType: 'accessType',
            accessMethod: 'accessType',
            accessLocation: 'accessLocation',
            treatmentDate: 'treatmentDate',
            dialysisDate: 'treatmentDate',
            orderDateTime: 'orderDateTime',
            bath: 'potassium'
        };
        
        Object.entries(data.dialysisOrder).forEach(([key, val]) => {
            if (val === null || val === undefined || val === 'null' || val === 'N/A' || val === '') return;
            updates[keyMap[key] || key] = val;
        });

        // Defaults and specific brand handling
        if (!updates.dialyzer && data.dialysisOrder.dialyzer) updates.dialyzer = data.dialysisOrder.dialyzer;
        if (!updates.dialyzer) updates.dialyzer = 'Optiflux 160 NRE';
        if (!updates.prime) updates.prime = 'Saline';

        // Fallback for PUF order type
        const rawJson = JSON.stringify(data).toLowerCase();
        if (rawJson.includes('puf') && !updates.orderType) {
            updates.orderType = 'PUF';
        }

        // Check for patient name mismatch
        if (data.dialysisOrder.patientName) {
            validatePatient(data.dialysisOrder.patientName);
        }
    }

    if (Object.keys(updates).length > 0) {
        console.log("Applying Updates to Form State:", updates);
        updates._aiExtracted = true;
        setFormData((prev: any) => {
            const next = { ...prev, ...updates };
            // Ensure orderType is synchronized if switching to dialysis tabs
            if (updates.orderType) next.orderType = updates.orderType;
            return next;
        });
    } else {
        console.warn("AI extraction returned no valid updates.");
    }
  };

  const currentTab = tabs[activeTabIdx];

  const handleNext = () => {
    if (activeTabIdx < tabs.length - 1) setActiveTabIdx(prev => prev + 1);
  };

  const handlePrev = () => {
    if (activeTabIdx > 0) setActiveTabIdx(prev => prev - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const path = 'treatments';
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');

      const docRef = await addDoc(collection(db, path), {
        modality: treatment.modality,
        hospitalId: hospital.id,
        teammateId: auth.currentUser.uid,
        status: 'submitted',
        patientDetails: treatment.patient,
        data: formData,
        createdAt: serverTimestamp(),
      });

      logAuditAction({
        operation: AuditOperation.CREATE,
        collectionName: path,
        documentId: docRef.id,
        details: { modality: treatment.modality, hospitalId: hospital.id }
      });

      alert('Documentation submitted successfully!');
      onClose();
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.CREATE, path);
      } catch (err: any) {
        alert("Failed to submit: " + (error instanceof Error ? error.message : "Permissions error"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Tab Navigation (Subtabs) */}
      <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar px-4 pt-4">
          {tabs.map((tab: any, idx: number) => (
            <button
              key={tab.title}
              onClick={() => setActiveTabIdx(idx)}
              className={`flex flex-col items-center gap-2 px-6 pb-3 min-w-[120px] transition-all relative
                ${activeTabIdx === idx ? 'text-brand-primary' : 'text-slate-400 opacity-60'}`}
            >
              <div className={`p-2 rounded-xl transition-colors ${activeTabIdx === idx ? 'bg-brand-primary/10' : ''}`}>
                {React.cloneElement(tab.icon as React.ReactElement<any>, { className: 'w-5 h-5' })}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-center">{tab.title}</span>
              {activeTabIdx === idx && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-brand-primary rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Form Content Area */}
      <div className="flex-1 p-6 sm:p-12 pb-32">
        <div className="max-w-2xl mx-auto space-y-12">
            <header className="flex items-center justify-between border-b border-slate-100 pb-8">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Step {activeTabIdx + 1} of {tabs.length}</p>
                    <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{currentTab?.title}</h2>
                </div>
                <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 hidden sm:block">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 italic">Active Patient</p>
                    <p className="text-sm font-bold text-slate-700">{treatment.patient.lastName}, {treatment.patient.firstName}</p>
                </div>
            </header>

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {currentTab?.title === 'Review & Submit' ? (
                    <div className="space-y-8">
                        <div className="p-8 bg-brand-primary text-white rounded-[2.5rem] shadow-xl relative overflow-hidden">
                            <div className="relative z-10 space-y-4">
                                <CheckCircle2 className="w-12 h-12 text-blue-200" />
                                <h3 className="text-2xl font-bold">Ready for Submission?</h3>
                                <p className="text-blue-100 leading-relaxed text-sm">
                                    Please ensure all data in the report is accurate and complete. This is your last opportunity to make changes.
                                </p>
                            </div>
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                        </div>
                        
                        <div className="grid gap-4">
                            <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 italic">
                                <AlertTriangle className="w-6 h-6 text-amber-500" />
                                <p className="text-xs font-medium text-slate-500">I verify that the documentation provided for this treatment is my true and accurate work.</p>
                            </div>
                            
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full btn-primary py-6 rounded-[2rem] text-xl font-black shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting...' : 'FINALIZE & SUBMIT'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <GenericTabContent 
                        title={currentTab?.title} 
                        modality={treatment.modality}
                        treatment={treatment}
                        formData={formData}
                        setFormData={setFormData}
                        onDataExtracted={handleExtraction}
                        extractionPreview={extractionPreview}
                        setExtractionPreview={setExtractionPreview}
                        patientMismatch={patientMismatch}
                        setPatientMismatch={setPatientMismatch}
                        onChange={(key: string, val: any) => setFormData(prev => ({...prev, [key]: val}))}
                    />
                )}
            </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-200 p-4 sm:p-6 flex items-center justify-between z-40 max-w-5xl mx-auto rounded-t-[3rem] shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.1)]">
        <button 
            onClick={handlePrev}
            disabled={activeTabIdx === 0}
            className="flex items-center gap-2 px-6 py-4 font-bold text-slate-400 hover:text-slate-900 disabled:opacity-20 transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Previous</span>
        </button>

        <div className="flex items-center gap-2">
            {tabs.map((_, i) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i === activeTabIdx ? 'bg-brand-primary w-6' : 'bg-slate-200'}`} />
            ))}
        </div>

        <button 
            onClick={handleNext}
            disabled={activeTabIdx === tabs.length - 1}
            className="btn-primary"
        >
          <span>Next</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};


const PatientMismatchAlert = ({ patientMismatch, setPatientMismatch, treatment }: any) => {
    return (
        <AnimatePresence>
            {patientMismatch && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                >
                    <div className="p-6 bg-red-50 border-2 border-red-200 rounded-3xl flex items-start gap-4 shadow-lg shadow-red-100 mb-6 animate-pulse">
                        <div className="p-3 bg-red-100 rounded-2xl text-red-600">
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm font-black text-red-900 uppercase tracking-tight">Patient Mismatch Detected!</h4>
                            <p className="text-xs text-red-700 font-bold">
                                The scanned documentation belongs to <span className="underline underline-offset-4 decoration-skip-ink-none decoration-2">{patientMismatch}</span>, but the active patient is <span className="underline underline-offset-4 decoration-skip-ink-none decoration-2">{treatment.patient.lastName}, {treatment.patient.firstName}</span>.
                            </p>
                            <p className="text-[10px] text-red-500 font-medium italic mt-2">Please verify you are scanning the correct documentation for the current treatment.</p>
                            <button 
                                onClick={() => setPatientMismatch(null)}
                                className="mt-3 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 transition-colors"
                            >
                                Dismiss Warning
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Simplified dynamic form content generator
const GenericTabContent = ({ title, modality, formData, onChange, setFormData, treatment, onDataExtracted, extractionPreview, setExtractionPreview, patientMismatch, setPatientMismatch }: any) => {
    // Specialized content for certain key tabs
    if (title === 'Patient Details') {
        return (
            <div className="space-y-8 pb-24">
                <PatientMismatchAlert patientMismatch={patientMismatch} setPatientMismatch={setPatientMismatch} treatment={treatment} />
                <div className="flex items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                    <div>
                        <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 mb-1">AI Capture</h4>
                        <p className="text-xs text-slate-500 font-medium">Scan the EHR sidebar or results screen</p>
                    </div>
                    <CameraScanner 
                        modality={(() => {
                            const m = modality.toLowerCase();
                            if (m.includes('hemodialysis')) return 'hemodialysis';
                            if (m.includes('apheresis')) return 'apheresis';
                            if (m.includes('non-treatment')) return 'nts';
                            return 'hemodialysis';
                        })() as any} 
                        scanType="patient"
                        onDataExtracted={onDataExtracted} 
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                    <Field label="Medical Record Number (MRN)" value={formData.mrn} onChange={(v: any) => onChange('mrn', v)} fullWidth />
                    <Field label="Admission / Encounter Number (CSN)" value={formData.csn} onChange={(v: any) => onChange('csn', v)} fullWidth />
                    <Field label="Patient First Name" value={formData.firstName} onChange={(v: any) => onChange('firstName', v)} />
                    <Field label="Patient Last Name" value={formData.lastName} onChange={(v: any) => onChange('lastName', v)} />
                    <Field label="Date of Birth" value={formData.dob} onChange={(v: any) => onChange('dob', v)} fullWidth />
                    <Field label="Gender" value={formData.gender} onChange={(v: any) => onChange('gender', v)} />
                </div>
                <div className="col-span-full pt-4">
                    <Field label="Known Allergies" value={formData.allergies} onChange={(v: any) => onChange('allergies', v)} className="text-red-600 font-bold" fullWidth />
                </div>
                <div className="p-8 bg-slate-50/50 rounded-[2rem] border border-slate-100 space-y-8">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Clinical Intake</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-10">
                        <Field label="Attending Physician" value={formData.attending} onChange={(v: any) => onChange('attending', v)} />
                        <Field label="Code Status" value={formData.codeStatus} onChange={(v: any) => onChange('codeStatus', v)} />
                        <Field label="Admitted Date" value={formData.admittedDate} onChange={(v: any) => onChange('admittedDate', v)} />
                        <Field label="Location / Bed" value={formData.location} onChange={(v: any) => onChange('location', v)} />
                        <div className="col-span-full">
                            <Field label="Diagnosis" value={formData.diagnosis} onChange={(v: any) => onChange('diagnosis', v)} fullWidth />
                        </div>
                        <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10 mt-2">
                            <CheckboxField 
                                label="HBsAg Result" 
                                options={['Negative', 'Positive', 'Unknown']} 
                                value={formData.hbsag} 
                                onChange={(v: any) => onChange('hbsag', v)} 
                                columns="grid-cols-3"
                            />
                            <Field label="HBsAg Date" type="date" value={formData.hbsagDate} onChange={(v: any) => onChange('hbsagDate', v)} />
                            
                            <CheckboxField 
                                label="HBsAb Result" 
                                options={['Susceptible <10', 'Immune >10', 'Unknown']} 
                                value={formData.hbsab} 
                                onChange={(v: any) => onChange('hbsab', v)} 
                                columns="grid-cols-3"
                            />
                            <Field label="HBsAb Date" type="date" value={formData.hbsabDate} onChange={(v: any) => onChange('hbsabDate', v)} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (title === 'Equipment' || title === 'Machine') {
        return (
            <div className="space-y-12 pb-24">
                {/* Water Subsection */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                        <div className="p-2 bg-blue-50 rounded-xl text-blue-600">
                            <Beaker className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Water System (RO)</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <Field label="RO Manufacturer/Model" value={formData.roManufacturer} onChange={(v: any) => onChange('roManufacturer', v)} />
                        <Field label="RO Serial Number*" value={formData.roSerialNumber} onChange={(v: any) => onChange('roSerialNumber', v)} />
                        <Field label="Total Chlorine Primary less than 0.1 ppm*" value={formData.totalChlorinePrimary} onChange={(v: any) => onChange('totalChlorinePrimary', v)} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Date*" type="date" value={formData.waterDate} onChange={(v: any) => onChange('waterDate', v)} />
                            <Field label="Time*" type="time" value={formData.waterTime} onChange={(v: any) => onChange('waterTime', v)} />
                        </div>
                    </div>
                </div>

                {/* Machine Subsection */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                        <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
                            <Settings className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Dialysis Machine</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <Field label="Machine Manufacturer/Model" value={formData.machineManufacturer} onChange={(v: any) => onChange('machineManufacturer', v)} />
                        <Field label="Machine Serial Number*" value={formData.machineSerialNumber} onChange={(v: any) => onChange('machineSerialNumber', v)} />
                        <Field label="Dialysate pH*" value={formData.dialysatePH} onChange={(v: any) => onChange('dialysatePH', v)} />
                        <Field label="Dialysate Temperature*" value={formData.machineDialysateTemp} onChange={(v: any) => onChange('machineDialysateTemp', v)} />
                        <Field label="Machine Dialysate Conductivity Reading*" value={formData.machineConductivity} onChange={(v: any) => onChange('machineConductivity', v)} />
                        <Field label="Conductivity Test Meter Reading*" value={formData.meterConductivity} onChange={(v: any) => onChange('meterConductivity', v)} />
                        <Field label="Alarm/PHT Passed*" value={formData.alarmPHTPassed} onChange={(v: any) => onChange('alarmPHTPassed', v)} />
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Alarm Test Pass Date*" type="date" value={formData.alarmTestDate} onChange={(v: any) => onChange('alarmTestDate', v)} />
                            <Field label="Alarm Test Pass Time*" type="time" value={formData.alarmTestTime} onChange={(v: any) => onChange('alarmTestTime', v)} />
                        </div>
                        <Field label="Dialyzer Lot Number*" value={formData.dialyzerLotNumber} onChange={(v: any) => onChange('dialyzerLotNumber', v)} />
                        <Field label="Dialyzer Expiration Date*" type="date" value={formData.dialyzerExpirationDate} onChange={(v: any) => onChange('dialyzerExpirationDate', v)} />
                        <Field label="Tubing Lot Number*" value={formData.tubingLotNumber} onChange={(v: any) => onChange('tubingLotNumber', v)} />
                        <Field label="Tubing Expiration Date*" type="date" value={formData.tubingExpirationDate} onChange={(v: any) => onChange('tubingExpirationDate', v)} />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                    <Field label="Note" type="textarea" value={formData.equipmentNote} onChange={(v: any) => onChange('equipmentNote', v)} fullWidth />
                </div>
            </div>
        );
    }

    if (title === 'Pre-Treatment' || title === 'Pre-Tx Assessment') {
        return (
            <div className="space-y-12 pb-24">
                <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Vitals</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-slate-900">
                        <Field label="Weight (kg)" type="number" value={formData.weight} onChange={(v: any) => onChange('weight', v)} />
                        <Field label="BP (mmHg)" value={formData.bp} onChange={(v: any) => onChange('bp', v)} />
                        <Field label="Pulse (bpm)" type="number" value={formData.pulse} onChange={(v: any) => onChange('pulse', v)} />
                        <Field label="Temp" type="number" value={formData.temp} onChange={(v: any) => onChange('temp', v)} />
                        <Field label="Respirations" type="number" value={formData.resp} onChange={(v: any) => onChange('resp', v)} />
                        <Field label="SaO2 (%)" type="number" value={formData.sao2} onChange={(v: any) => onChange('sao2', v)} />
                    </div>
                </div>

                <div className="space-y-8 pt-8 border-t border-slate-100">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Pre-Treatment Assessment</h4>
                    
                    {/* Neurology */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Neurology</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="LOC (Level of Consciousness)*" 
                                options={[
                                    'Awake', 'Alert', 'Follows Commands', 
                                    'Lethargic', 'Obtunded', 'Stuporous', 
                                    'Comatose', 'Sleeping but arousable', 'Sedated'
                                ]}
                                value={formData.loc} 
                                onChange={(v: any) => onChange('loc', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                            <CheckboxField 
                                label="Orientation*" 
                                options={[
                                    'Person', 'Place', 'Time', 'Event', 
                                    'Confused', 'Reorients Easily', 'Unable to Assess'
                                ]}
                                value={formData.orientedTo} 
                                onChange={(v: any) => onChange('orientedTo', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-4"
                            />
                            <CheckboxField 
                                label="Speech*" 
                                options={[
                                    'Spontaneous, Well Paced, Logical', 'Clear', 'Slurred', 'Hoarse', 
                                    'Speaking Valve', 'Artificial Airway', 'Rambling', 
                                    'Expressive Aphasia', 'No Verbal Response', 'Unable to Assess'
                                ]}
                                value={formData.neurologySpeech} 
                                onChange={(v: any) => onChange('neurologySpeech', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                        </div>
                    </div>

                    {/* Respiratory */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Respiratory</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="Breathing Pattern*" 
                                options={[
                                    'Regular', 'Irregular', 'Labored', 'Dyspnea', 
                                    'Dyspnea on Exertion', 'Apnea', 'Agonal', 'Deep', 
                                    'Stridor', 'Shallow', 'Orthopnea', 'Tachypnea', 
                                    'Ventilated', 'Bradypnea'
                                ]}
                                value={formData.respiratoryBreathingPattern} 
                                onChange={(v: any) => onChange('respiratoryBreathingPattern', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <CheckboxField 
                                    label="Breath Sounds Clear*" 
                                    options={['Yes', 'No']}
                                    value={formData.respiratoryBreathSoundsClear} 
                                    onChange={(v: any) => onChange('respiratoryBreathSoundsClear', v)} 
                                    columns="grid-cols-2"
                                />
                                <CheckboxField 
                                    label="Chest Expansion*" 
                                    options={['Equal', 'Unequal']}
                                    value={formData.respiratoryChestExpansion} 
                                    onChange={(v: any) => onChange('respiratoryChestExpansion', v)} 
                                    columns="grid-cols-2"
                                />
                            </div>
                            <CheckboxField 
                                label="Cough*" 
                                options={[
                                    'None', 'Non-Productive', 'Productive', 'Strong', 
                                    'Weak', 'Bronchial', 'Deep', 'With Inspiration', 
                                    'Hacking', 'Dry', 'Moist'
                                ]}
                                value={formData.respiratoryCough} 
                                onChange={(v: any) => onChange('respiratoryCough', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                            <CheckboxField 
                                label="Tubes/Drains/Airways*" 
                                options={['Chest Tube', 'Tracheostomy', 'ETT']}
                                value={formData.respiratoryTubesDrainsAirways} 
                                onChange={(v: any) => onChange('respiratoryTubesDrainsAirways', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3"
                            />
                        </div>
                    </div>

                    {/* Cardiovascular */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cardiovascular</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="Heart Sounds*" 
                                options={[
                                    'Regular', 'Irregular', 'Murmur', 'Distant', 
                                    'S1', 'S2', 'Gallop', 'Pericardial Rub'
                                ]}
                                value={formData.cardiacHeartSounds} 
                                onChange={(v: any) => onChange('cardiacHeartSounds', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                            />
                            <CheckboxField 
                                label="Cardiac Rhythm*" 
                                options={[
                                    'Normal Sinus Rhythm', 'Regular', 'Irregular', 'Bradycardia', 
                                    'Tachycardia', 'Sinus Bradycardia', 'Sinus Tachycardia', 
                                    'PACS-Premature Atrial Contractions', 'AF-Atrial Fibrillation', 
                                    'Atrial Flutter', 'Ventricular Arrhythmia', 
                                    'PVCS-Premature Ventricular Contractions', 'Block', 
                                    'Paced', 'Supraventricular Tachycardia'
                                ]}
                                value={formData.cardiacRhythm} 
                                onChange={(v: any) => onChange('cardiacRhythm', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <CheckboxField 
                                    label="Vasopressors*" 
                                    options={['Yes', 'No']}
                                    value={formData.cardiacVasopressors} 
                                    onChange={(v: any) => onChange('cardiacVasopressors', v)} 
                                    columns="grid-cols-2"
                                />
                            </div>
                        </div>
                    </div>

                    {/* GI/Abdomen */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">GI/Abdomen</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="Abdomen*" 
                                options={[
                                    'Rounded', 'Rigid', 'Firm', 'Guarded', 
                                    'Right-Upper Quadrant', 'Right-Lower Quadrant', 
                                    'Left-Upper Quadrant', 'Left-Lower Quadrant', 
                                    'Palpable masses', 'Hernia'
                                ]}
                                value={formData.giAbdomen} 
                                onChange={(v: any) => onChange('giAbdomen', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                            <div className="grid grid-cols-1 gap-6">
                                <CheckboxField 
                                    label="Bowel Sounds*" 
                                    options={['Normoactive', 'Hyperactive', 'Hypoactive', 'Absent']}
                                    value={formData.giBowelSounds} 
                                    onChange={(v: any) => onChange('giBowelSounds', v)} 
                                    fullWidth
                                    columns="grid-cols-2 sm:grid-cols-4"
                                />
                                <CheckboxField 
                                    label="GI Symptoms" 
                                    options={[
                                        'Constipation', 'Continent', 'Cramping', 'Diarrhea', 
                                        'Difficulty Swallowing', 'Epigastric Pain', 'Heartburn', 
                                        'Hemorrhoids', 'Incontinent', 'Loss/Decreased Appetite', 
                                        'Nausea', 'Projectile Vomiting'
                                    ]}
                                    value={formData.giSymptoms} 
                                    onChange={(v: any) => onChange('giSymptoms', v)} 
                                    fullWidth
                                    columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                                />
                                <CheckboxField 
                                    label="Tubes/Drains" 
                                    options={[
                                        'Nasogastric Tube', 'Oro-Gastric Tube', 'Gastric Tube', 
                                        'Nasojejunal Tube', 'Gastrojejunostomy Tube', 'Rectal Tube', 
                                        'Orojejunal Tube', 'Jejunostomy Tube'
                                    ]}
                                    value={formData.giTubesDrains} 
                                    onChange={(v: any) => onChange('giTubesDrains', v)} 
                                    fullWidth
                                    columns="grid-cols-2 sm:grid-cols-4"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Integumentary */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Integumentary</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="Skin Status*" 
                                options={[
                                    'Clammy', 'Dry', 'Diaphoretic', 'Ecchymosis', 
                                    'Erythema', 'Hot', 'Intact', 'Itching', 
                                    'Jaundice', 'Lesions', 'Peeling', 
                                    'Petechiae', 'Piercing', 'Rashes', 'Weeping'
                                ]}
                                value={formData.skinStatus} 
                                onChange={(v: any) => onChange('skinStatus', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                        </div>
                    </div>

                    {/* Edema */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Edema</h5>
                        <div className="grid grid-cols-1 gap-8">
                            <CheckboxField 
                                label="Edema Status*" 
                                options={[
                                    'Generalized', 'Facial', 'Periorbital', 'Scleral', 
                                    'Right Arm', 'Left Arm', 'Right Hand', 'Left Hand', 
                                    'Genital', 'Right Leg', 'Left Leg', 
                                    'Right Pedal Ankle', 'Left Pedal Ankle'
                                ]}
                                value={formData.edemaStatus} 
                                onChange={(v: any) => onChange('edemaStatus', v)} 
                                fullWidth
                                columns="grid-cols-2 sm:grid-cols-3 md:grid-cols-5"
                            />
                        </div>
                    </div>

                    {/* Pain */}
                    <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-200/60 space-y-6">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Pain</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <Field label="Pain*" value={formData.painScore} onChange={(v: any) => onChange('painScore', v)} />
                            <Field label="Location" value={formData.painLocation} onChange={(v: any) => onChange('painLocation', v)} />
                            <Field label="Quality" value={formData.painQuality} onChange={(v: any) => onChange('painQuality', v)} />
                            <Field label="Action" value={formData.painAction} onChange={(v: any) => onChange('painAction', v)} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (title === 'Tx Monitoring & Administrations' || title === 'Treatment') {
        const entries = formData.monitoringEntries || [];
        
        const updateEntry = (idx: number, field: string, val: any) => {
            const newEntries = [...entries];
            newEntries[idx] = { ...newEntries[idx], [field]: val };
            onChange('monitoringEntries', newEntries);
        };

        const addEntry = () => {
            const lastEntry = entries[entries.length - 1] || {};
            const newEntry = {
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
                bp: '',
                map: '',
                pulse: '',
                resp: '',
                sao2: '',
                temp: '',
                bfr: lastEntry.bfr || '',
                dfr: lastEntry.dfr || '',
                ap: '',
                vp: '',
                tmp: '',
                ufr: '',
                bvc: '',
                hct: '',
                ufRem: '',
                transducerClear: true,
                accessVisible: true,
                oralIntake: '',
                status: 'Pt Awake & Alert',
                note: ''
            };
            onChange('monitoringEntries', [...entries, newEntry]);
        };

        const removeEntry = (idx: number) => {
            if (entries.length <= 1) return;
            const newEntries = entries.filter((_: any, i: number) => i !== idx);
            onChange('monitoringEntries', newEntries);
        };

        const handlePreviewSave = () => {
            if (!extractionPreview) return;
            const selectedItems = extractionPreview.filter(i => i.selected).map(({ selected, ...rest }) => ({
                ...rest,
                transducerClear: true,
                accessVisible: true,
                status: 'Pt Awake & Alert'
            }));
            
            if (selectedItems.length > 0) {
                // If the first entry is empty, remove it
                const currentEntries = entries.length === 1 && !entries[0].bp && !entries[0].pulse ? [] : entries;
                const mergedEntries = [...currentEntries, ...selectedItems];
                
                // Sort by date and time ascending
                mergedEntries.sort((a: any, b: any) => {
                    const dateA = a.date || '';
                    const dateB = b.date || '';
                    if (dateA !== dateB) return dateA.localeCompare(dateB);
                    
                    const timeA = a.time || '';
                    const timeB = b.time || '';
                    return timeA.localeCompare(timeB);
                });
                
                onChange('monitoringEntries', mergedEntries);
            }
            setExtractionPreview(null);
        };

        return (
            <div className="space-y-8 pb-24 w-full">
                <PatientMismatchAlert patientMismatch={patientMismatch} setPatientMismatch={setPatientMismatch} treatment={treatment} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary">
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Vital Signs Monitoring</h4>
                            <p className="text-xs text-slate-500 font-medium">Capture flowsheet observations via AI scanner or manual entry</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <CameraScanner 
                            modality={(() => {
                                const m = modality.toLowerCase();
                                if (m.includes('hemodialysis')) return 'hemodialysis';
                                if (m.includes('apheresis')) return 'apheresis';
                                if (m.includes('non-treatment')) return 'nts';
                                return 'hemodialysis';
                            })() as any} 
                            scanType="monitoring"
                            onDataExtracted={onDataExtracted} 
                        />
                        <button 
                            onClick={addEntry}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl transition-all"
                        >
                            <Zap className="w-4 h-4" />
                            Add Observation
                        </button>
                    </div>
                </div>

                {/* AI Extraction Preview */}
                <AnimatePresence>
                    {extractionPreview && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Sparkles className="w-6 h-6 text-indigo-500" />
                                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900">Extracted Observations</h3>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setExtractionPreview(null)}
                                        className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handlePreviewSave}
                                        className="px-8 py-3 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg hover:bg-indigo-700 transition-all"
                                    >
                                        Save Selected
                                    </button>
                                </div>
                            </div>
                            
                            <div className="overflow-x-auto no-scrollbar">
                                <div className="flex gap-4 min-w-max pb-2 px-1">
                                    {extractionPreview.map((item: any, idx: number) => (
                                        <div 
                                            key={idx}
                                            onClick={() => {
                                                const newItems = [...extractionPreview];
                                                newItems[idx].selected = !newItems[idx].selected;
                                                setExtractionPreview(newItems);
                                            }}
                                            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer min-w-[200px] ${item.selected ? 'bg-white border-indigo-500 shadow-xl scale-105 z-10' : 'bg-slate-50 border-slate-200 opacity-60'}`}
                                        >
                                            <div className="flex items-center justify-between mb-4">
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${item.selected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                                                    {item.selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[7px] font-black text-slate-300 uppercase tracking-tighter">{item.date}</span>
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[9px] font-black text-slate-300 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter block mb-1">Time</span>
                                                            <span className="text-xs font-black text-slate-700">{item.time}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                                <div className="space-y-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BP/MAP</span>
                                                    <p className="text-[11px] font-bold text-slate-800">{(item.bp || '--')} ({item.map || '--'})</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">HR</span>
                                                    <p className="text-[11px] font-bold text-slate-800">{item.pulse || '--'}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">BFR/UFR</span>
                                                    <p className="text-[11px] font-bold text-slate-800">{(item.bfr || '--')}/{(item.ufr || '--')}</p>
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">AP/VP</span>
                                                    <p className="text-[11px] font-bold text-slate-800">{(item.ap || '--')}/{(item.vp || '--')}</p>
                                                </div>
                                                {item.note && (
                                                    <div className="col-span-2 mt-2 pt-2 border-t border-slate-100">
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Note</span>
                                                        <p className="text-[9px] font-medium text-slate-500 italic line-clamp-2">{item.note}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="overflow-x-auto rounded-[2rem] border border-slate-100 bg-white shadow-sm no-scrollbar">
                    <table className="w-full border-collapse min-w-[2200px]">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left sticky left-0 bg-slate-50 z-10 w-[140px]">Date</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[110px]">Time</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[130px]">BP</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[80px]">MAP</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[80px]">P</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[80px]">RR</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[80px]">SaO2</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">Temp</th>

                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">BFR</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">DFR</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">AP</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">VP</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[90px]">TMP</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[90px]">UFR</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[90px]">BVC</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[90px]">Hct</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[110px]">UF Rem</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">Transd</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">Access</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[100px]">Oral</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[200px]">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-left w-[250px]">Note</th>
                                <th className="p-4 w-[60px]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry: any, idx: number) => (
                                <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors">
                                    <td className="p-2 sticky left-0 bg-white z-10">
                                        <input type="date" value={entry.date || ''} onChange={(e) => updateEntry(idx, 'date', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary" />
                                    </td>
                                    <td className="p-2">
                                        <input type="time" value={entry.time || ''} step="60" onChange={(e) => updateEntry(idx, 'time', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.bp || ''} onChange={(e) => updateEntry(idx, 'bp', e.target.value)} placeholder="120/80" className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-brand-primary" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.map || ''} onChange={(e) => updateEntry(idx, 'map', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.pulse || ''} onChange={(e) => updateEntry(idx, 'pulse', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.resp || ''} onChange={(e) => updateEntry(idx, 'resp', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.sao2 || ''} onChange={(e) => updateEntry(idx, 'sao2', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" step="0.1" value={entry.temp || ''} onChange={(e) => updateEntry(idx, 'temp', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>

                                    <td className="p-2">
                                        <input type="number" value={entry.bfr || ''} onChange={(e) => updateEntry(idx, 'bfr', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.dfr || ''} onChange={(e) => updateEntry(idx, 'dfr', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.ap || ''} onChange={(e) => updateEntry(idx, 'ap', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.vp || ''} onChange={(e) => updateEntry(idx, 'vp', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.tmp || ''} onChange={(e) => updateEntry(idx, 'tmp', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.ufr || ''} onChange={(e) => updateEntry(idx, 'ufr', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.bvc || ''} onChange={(e) => updateEntry(idx, 'bvc', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.hct || ''} onChange={(e) => updateEntry(idx, 'hct', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.ufRem || ''} onChange={(e) => updateEntry(idx, 'ufRem', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <button 
                                            onClick={() => updateEntry(idx, 'transducerClear', !entry.transducerClear)}
                                            className={`w-full p-2 rounded-xl text-[10px] font-black uppercase transition-all ${entry.transducerClear ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {entry.transducerClear ? 'Clear' : 'Check'}
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <button 
                                            onClick={() => updateEntry(idx, 'accessVisible', !entry.accessVisible)}
                                            className={`w-full p-2 rounded-xl text-[10px] font-black uppercase transition-all ${entry.accessVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                                        >
                                            {entry.accessVisible ? 'Visible' : 'Check'}
                                        </button>
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={entry.oralIntake || ''} onChange={(e) => updateEntry(idx, 'oralIntake', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" />
                                    </td>
                                    <td className="p-2">
                                        <select value={entry.status || 'Pt Awake & Alert'} onChange={(e) => updateEntry(idx, 'status', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl">
                                            <option>Pt Awake & Alert</option>
                                            <option>Pt Sleeping</option>
                                            <option>Pt in Distress</option>
                                            <option>Pt Off Unit</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="text" value={entry.note || ''} onChange={(e) => updateEntry(idx, 'note', e.target.value)} className="w-full text-xs font-bold p-3 bg-slate-50 border-none rounded-xl" placeholder="Quick note..." />
                                    </td>
                                    <td className="p-2">
                                        <button 
                                            disabled={entries.length <= 1}
                                            onClick={() => removeEntry(idx)}
                                            className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-30"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (title === 'Time Out Safety Check') {
        return (
            <div className="space-y-8 pb-24">
                <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] space-y-4">
                    <div className="flex items-center gap-3 text-emerald-700">
                        <ShieldCheck className="w-8 h-8" />
                        <h3 className="text-xl font-bold uppercase tracking-tight">Procedure Time Out</h3>
                    </div>
                    <p className="text-xs text-emerald-600 font-medium leading-relaxed italic">
                        Universal Protocol: Verification must be completed by the clinical team prior to initiation of any invasive procedure or treatment.
                    </p>
                </div>

                <div className="grid gap-6">
                    <SafetyToggle 
                        label="Patient Identification Confirmed" 
                        description="Two patient identifiers verified (e.g. Name, MRN, DOB)"
                        value={formData.timeOutPatientIdConfirmed} 
                        onChange={(v: boolean) => onChange('timeOutPatientIdConfirmed', v)} 
                    />
                    <SafetyToggle 
                        label="Procedure Confirmed" 
                        description="Verified order/consent for the correct procedure"
                        value={formData.timeOutProcedureConfirmed} 
                        onChange={(v: boolean) => onChange('timeOutProcedureConfirmed', v)} 
                    />
                    <SafetyToggle 
                        label="Site / Access Confirmed" 
                        description="Verified correct site, access location, or side (if applicable)"
                        value={formData.timeOutSiteConfirmed} 
                        onChange={(v: boolean) => onChange('timeOutSiteConfirmed', v)} 
                    />
                    <SafetyToggle 
                        label="Equipment & Settings Checked" 
                        description="Machine setup, dialyzer, bath, and clinical parameters verified"
                        value={formData.timeOutEquipmentChecked} 
                        onChange={(v: boolean) => onChange('timeOutEquipmentChecked', v)} 
                    />
                </div>

                <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-slate-100">
                    <Field label="Time Out Completed By" value={formData.timeOutCompletedBy} onChange={(v: any) => onChange('timeOutCompletedBy', v)} />
                    <Field label="Observation Time" type="time" value={formData.timeOutTime} onChange={(v: any) => onChange('timeOutTime', v)} />
                </div>
            </div>
        );
    }

    if (title === 'Order') {
        return (
            <div className="space-y-8 pb-24">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex bg-slate-100 p-1.5 rounded-[1.25rem] w-fit shadow-inner">
                        <button 
                            onClick={() => onChange('orderType', 'HD')}
                            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black tracking-widest transition-all ${formData.orderType !== 'PUF' ? 'bg-white text-brand-primary shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
                        >
                            HEMODIALYSIS (HD)
                        </button>
                        <button 
                            onClick={() => onChange('orderType', 'PUF')}
                            className={`px-8 py-2.5 rounded-2xl text-[10px] font-black tracking-widest transition-all ${formData.orderType === 'PUF' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-500'}`}
                        >
                            PURE UF (PUF)
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 ml-1">AI Extraction</h4>
                      <div className="flex items-center gap-4">
                        <CameraScanner 
                            modality={(() => {
                                const m = modality.toLowerCase();
                                if (m.includes('hemodialysis')) return 'hemodialysis';
                                if (m.includes('apheresis')) return 'apheresis';
                                if (m.includes('non-treatment')) return 'nts';
                                return 'hemodialysis';
                            })() as any} 
                            scanType="order"
                            onDataExtracted={onDataExtracted} 
                        />
                        {formData._aiExtracted && (
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border animate-in fade-in zoom-in ${formData.orderType === 'PUF' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                <Sparkles className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    AI: {formData.orderType} Order Reconciled
                                </span>
                            </div>
                        )}
                      </div>
                    </div>
                </div>

                <PatientMismatchAlert patientMismatch={patientMismatch} setPatientMismatch={setPatientMismatch} treatment={treatment} />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <Field label="Ordering Physician" value={formData.orderingPhysician} onChange={(v: any) => onChange('orderingPhysician', v)} />
                    <Field label="Treatment Priority" value={formData.priority} onChange={(v: any) => onChange('priority', v)} />
                    <Field label={formData.orderType === 'PUF' ? "PUF Date" : "HD Date"} type="date" value={formData.treatmentDate} onChange={(v: any) => onChange('treatmentDate', v)} />
                    <Field label="Order Date/Time" value={formData.orderDateTime} onChange={(v: any) => onChange('orderDateTime', v)} />
                    <Field label="Dialyzer" value={formData.dialyzer} onChange={(v: any) => onChange('dialyzer', v)} />
                    <Field label="Prime" value={formData.prime} onChange={(v: any) => onChange('prime', v)} />
                    <Field label="Duration (hh:mm)" value={formData.duration} onChange={(v: any) => onChange('duration', v)} />
                    <Field label="Target Weight (kg)" type="number" value={formData.targetWeight} onChange={(v: any) => onChange('targetWeight', v)} />
                    <Field label="Access Type" value={formData.accessType} onChange={(v: any) => onChange('accessType', v)} />
                    <Field label="Access Location" value={formData.accessLocation} onChange={(v: any) => onChange('accessLocation', v)} />
                    
                    <div className="col-span-full pt-8 pb-4 border-b border-slate-100 flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {formData.orderType === 'PUF' ? 'Ultrafiltration Parameters' : 'Dialysate & Flow Parameters'}
                        </h4>
                        {formData.orderType === 'PUF' && (
                            <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">Pure UF Mode</span>
                        )}
                    </div>
                    
                    <Field label="Blood Flow Rate (mL/min)" value={formData.bloodFlowRate} onChange={(v: any) => onChange('bloodFlowRate', v)} />
                    {formData.orderType !== 'PUF' && (
                        <Field label="Dialysate Flow (mL/min)" value={formData.dialysateFlowRate} onChange={(v: any) => onChange('dialysateFlowRate', v)} />
                    )}
                    <Field label={formData.orderType === 'PUF' ? "PUF Goal" : "UF Goal"} value={formData.ufGoal} onChange={(v: any) => onChange('ufGoal', v)} />
                    <Field label=" Maintain SBP > (mmHg)" value={formData.minBP} onChange={(v: any) => onChange('minBP', v)} />
                    
                    {formData.orderType !== 'PUF' ? (
                        <>
                            <Field label="Potassium (K+)" value={formData.potassium} onChange={(v: any) => onChange('potassium', v)} />
                            <Field label="Calcium (Ca++)" value={formData.calcium} onChange={(v: any) => onChange('calcium', v)} />
                            <Field label="Sodium (Na+)" value={formData.sodium} onChange={(v: any) => onChange('sodium', v)} />
                            <Field label="Sodium Modeling" value={formData.sodiumModeling} onChange={(v: any) => onChange('sodiumModeling', v)} />
                            <Field label="Bicarbonate (HCO3-)" value={formData.bicarb} onChange={(v: any) => onChange('bicarb', v)} />
                            <Field label="UF Profile" value={formData.ufProfile} onChange={(v: any) => onChange('ufProfile', v)} />
                            <Field label="Dialysate Temp (°C)" value={formData.dialysateTemp} onChange={(v: any) => onChange('dialysateTemp', v)} />
                        </>
                    ) : (
                        <div className="col-span-full p-6 bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-center">
                            <p className="text-xs text-slate-400 font-medium italic">Dialysate and Electrolyte parameters are omitted in Pure Ultrafiltration mode.</p>
                        </div>
                    )}
                </div>

                {/* Discrepancy Analytics */}
                {(formData.weight || formData.targetWeight) && (
                    <div className="p-6 bg-amber-50/50 border border-amber-100 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2 text-amber-700">
                             <div className="p-1 bg-amber-100 rounded-lg">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">AI Discrepancy Check</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.weight && formData.targetWeight && Number(formData.weight) < Number(formData.targetWeight) && (
                                <div className="text-sm text-amber-900 bg-white p-4 rounded-xl border border-amber-200">
                                    <span className="font-bold">Weight Alert:</span> Patient current weight ({formData.weight}kg) is already below target weight ({formData.targetWeight}kg). Verify UF goals.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-24">
            <p className="text-xs font-medium text-slate-400 italic">Documentation fields for "{title}" follow the PATH Workbook standard.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Field label={`${title} Note`} type="textarea" fullWidth />
                <Field label="Secondary Verifier" />
                <Field label="Clinical Action" />
                <Field label="Observation Timestamp" type="time" />
            </div>
        </div>
    );
};

const CheckboxField = ({ label, options, value, onChange, fullWidth = false, columns = 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' }: any) => {
    const selectedOptions = Array.isArray(value) ? value : (value && typeof value === 'string' ? value.split(', ') : []);
    
    const toggleOption = (option: string) => {
        let newSelection;
        if (selectedOptions.includes(option)) {
            newSelection = selectedOptions.filter((o: string) => o !== option);
        } else {
            newSelection = [...selectedOptions, option];
        }
        onChange(newSelection.join(', '));
    };

    return (
        <div className={`flex flex-col gap-3 ${fullWidth ? 'col-span-full' : ''}`}>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 block">{label}</label>
            <div className={`grid gap-2 ${columns}`}>
                {options.map((option: string) => (
                    <button
                        key={option}
                        type="button"
                        onClick={() => toggleOption(option)}
                        className={`px-3 py-2.5 rounded-xl border text-[11px] font-bold transition-all text-left flex items-center justify-between gap-2 group
                            ${selectedOptions.includes(option) 
                                ? 'bg-brand-primary/10 border-brand-primary/30 text-brand-primary shadow-sm' 
                                : 'bg-slate-50/50 border-slate-100 text-slate-500 hover:bg-slate-100/50'}`}
                    >
                        <span className="leading-tight">{option}</span>
                        <div className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center transition-all shrink-0
                            ${selectedOptions.includes(option) ? 'bg-brand-primary border-brand-primary text-white' : 'bg-white border-slate-200'}`}>
                            {selectedOptions.includes(option) && <CheckCircle2 className="w-2.5 h-2.5" />}
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

const Field = ({ label, type = 'text', fullWidth = false, value, onChange, className = '' }: any) => (
    <div className={`flex flex-col gap-2.5 w-full ${fullWidth ? 'col-span-full' : ''}`}>
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 block w-full">{label}</label>
        {type === 'textarea' ? (
            <textarea 
                value={value || ''}
                onChange={(e) => onChange && onChange(e.target.value)}
                className={`w-full min-h-[120px] py-4 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 outline-none transition-all block ${className}`} 
            />
        ) : (
            <input 
                type={type} 
                value={value || ''}
                onChange={(e) => onChange && onChange(e.target.value)}
                className={`w-full py-4 px-6 bg-slate-50/50 border border-slate-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary/30 outline-none transition-all block ${className}`} 
                placeholder={`Enter ${label}...`} 
            />
        )}
    </div>
);

const SafetyToggle = ({ label, description, value, onChange }: { label: string, description: string, value: boolean, onChange: (v: boolean) => void }) => (
    <button 
        onClick={() => onChange(!value)}
        className={`w-full p-6 text-left rounded-3xl border-2 transition-all flex items-center justify-between gap-6 group hover:shadow-lg
            ${value ? 'bg-emerald-50 border-emerald-500 shadow-emerald-100/50' : 'bg-white border-slate-100 hover:border-slate-300'}`}
    >
        <div className="space-y-1">
            <h4 className={`text-sm font-bold uppercase tracking-tight transition-colors ${value ? 'text-emerald-700' : 'text-slate-700'}`}>{label}</h4>
            <p className={`text-[10px] font-medium italic transition-colors ${value ? 'text-emerald-600/70' : 'text-slate-400'}`}>{description}</p>
        </div>
        <div className={`w-10 h-10 rounded-2xl border-2 flex items-center justify-center transition-all shrink-0
            ${value ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-200 text-slate-200'}`}>
            <CheckCircle2 className={`w-6 h-6 transition-transform ${value ? 'scale-110' : 'scale-90'}`} />
        </div>
    </button>
);

export default TreatmentWizard;
