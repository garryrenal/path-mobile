import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractClinicalData, ScanType } from '../services/geminiService';

interface CameraScannerProps {
  modality: 'hemodialysis' | 'apheresis' | 'nts';
  scanType?: ScanType;
  onDataExtracted: (data: any) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({ modality, scanType = 'all', onDataExtracted }: CameraScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<{ base64: string, previewUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 900; 
          const MAX_HEIGHT = 900;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const previewUrl = canvas.toDataURL('image/jpeg', 0.85);
          const base64 = previewUrl.split(',')[1];
          resolve({ base64, previewUrl });
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    try {
      const { base64, previewUrl } = await compressImage(file);
      setPreview(previewUrl);
      
      const extractedData = await extractClinicalData(base64, modality, scanType as ScanType);
      onDataExtracted(extractedData);
      setPreview(null);
    } catch (error) {
      console.error("Scanner Error:", error);
      
      let errorMessage = "Failed to extract data.";
      if (error instanceof Error) {
        // If it's a JSON string error from Gemini, try to make it readable
        if (error.message.includes('{"error"')) {
           try {
             const parsed = JSON.parse(error.message);
             errorMessage = parsed.error?.message || error.message;
           } catch (e) {
             errorMessage = error.message;
           }
        } else if (error.message.includes("Unterminated string") || error.message.includes("too complex")) {
          errorMessage = "The image is too complex. Try a clearer photo or focus on specific sections.";
        } else {
          errorMessage = error.message;
        }
      }
      alert(errorMessage);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button 
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex-1 p-4 bg-indigo-50 border-2 border-indigo-100 border-dashed rounded-2xl flex flex-col items-center gap-2 text-indigo-600 hover:bg-indigo-100 transition-colors group"
        >
          <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-center">Camera</span>
        </button>
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 border-dashed rounded-2xl flex flex-col items-center gap-2 text-slate-600 hover:bg-slate-100 transition-colors group"
        >
          <div className="p-3 bg-white rounded-full shadow-sm group-hover:scale-110 transition-transform">
            <Upload className="w-6 h-6" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-center">Upload Photo</span>
        </button>
        
        <input 
          type="file" 
          ref={cameraInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          capture="environment"
          className="hidden" 
        />
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-sm"
          >
            <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center space-y-6 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-primary overflow-hidden">
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  className="w-1/2 h-full bg-blue-300"
                />
              </div>

              <div className="relative">
                {preview && (
                  <img src={preview} className="w-full h-48 object-cover rounded-2xl opacity-50 grayscale" alt="Scanning" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-100">
                    <Sparkles className="w-8 h-8 text-brand-primary animate-pulse" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
                  Analyzing Image
                </h4>
                <p className="text-slate-500 text-sm">
                  Gemini AI is extracting metadata for your {modality} treatment.
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                 <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
                 <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">Processing...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CameraScanner;
