import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ScanType = 'patient' | 'order' | 'monitoring' | 'all';

export async function extractClinicalData(
  imageBase64: string, 
  modality: 'hemodialysis' | 'apheresis' | 'nts', 
  scanType: ScanType = 'all',
  retryCount = 0
): Promise<any> {
  const model = "gemini-3.1-pro-preview";

  let specificInstruction = "";
  if (scanType === 'monitoring') {
    specificInstruction = `FOCUS: You are scanning a Vital Monitoring / Flowsheet / Flow sheet table from an Electronic Health Record (EHR).
    IMPORTANT: Flowsheets often use columns for Time (e.g., 09:00, 09:15, 09:30) and rows for clinical variables (Blood Pressure, Heart Rate, SpO2, MAP).
    OR, rows represent Time and columns represent variables.
    
    You must intelligently map the table values to the "monitoringEntries" array.
    EACH unique time point MUST be one object in the array.
    
    Mapping Guide (Case-Insensitive):
    - Time/Clock Header -> time (Format: "HH:mm")
    - Blood Pressure / BP / Arterial BP -> bp (e.g., "145/88")
    - MAP / Mean Arterial Pressure -> map
    - Heart Rate / Puls / P / HR -> pulse
    - SpO2 / SaO2 / Saturation -> sao2
    - Temperature / Temp / T -> temp
    - Respiration / Resp / RR -> resp
    - Blood Flow Rate / BFR -> bfr
    - Ultrafiltration Rate / UFR -> ufr
    - Venous Pressure / VP -> vp
    - Arterial Pressure / AP -> ap
    - Transmembrane Pressure / TMP -> tmp
    
    If you see a flowsheet with multiple columns of times, create an entry for EACH column that contains data.`;
  } else if (scanType === 'order') {
    specificInstruction = `FOCUS: You are scanning a Dialysis Order table. 
    Extract values from the "Prescription" or "Order" section:
    - Duration -> duration (Convert minutes to HH:mm, e.g., 210 -> "03:30")
    - Treatment Date -> treatmentDate (YYYY-MM-DD)
    - Dialyzer -> dialyzer
    - Access Method/Type -> accessMethod
    - Blood Flow Rate / BFR -> bloodFlowRate
    - Dialysate Flow Rate / DFR -> dialysateFlowRate
    - UF Goal -> ufGoal
    - Potassium / K+ -> potassium
    - Calcium / Ca++ -> calcium
    - Sodium / Na+ -> sodium
    - Bicarbonate / HCO3 -> bicarb
    - Temperature -> dialysateTemp
    - Minimum BP -> minBP
    - UF Profile -> ufProfile`;
  } else if (scanType === 'patient') {
    specificInstruction = `FOCUS: Extract Patient Demographics and Hepatitis status.
    - MRN, CSN, Name (First/Last), DOB (YYYY-MM-DD), Gender, Allergies.
    - Hepatitis Lab Results: Look for HBsAg, HBsAb, HBcAb. Extract values (Positive/Negative/Reactive) and dates.`;
  } else if (scanType === 'all') {
    specificInstruction = `FOCUS: Comprehensive extraction of Patient Identity, Dialysis Orders, and Vital Signs Flowsheets.
    Extract any identifying information, treatment prescriptions, and historical vital signs sequences found in the document.`;
  }

  const systemInstructions = `
    You are a specialized medical data extraction AI. Your task is to OCR and structure clinical data from EHR system screenshots or photos.
    ${specificInstruction}
    
    CRITICAL RULES:
    1. EXCLUDE all headers or metadata from the extraction unless requested.
    2. If a value is unreadable, use null.
    3. Return ONLY strict JSON.
    4. Ensure numbers are strings to preserve formatting (e.g., "120/80").
  `;

  const patientProps = {
    mrn: { type: Type.STRING },
    csn: { type: Type.STRING },
    firstName: { type: Type.STRING },
    lastName: { type: Type.STRING },
    dob: { type: Type.STRING },
    age: { type: Type.STRING },
    gender: { type: Type.STRING },
    allergies: { type: Type.STRING },
    attending: { type: Type.STRING },
    codeStatus: { type: Type.STRING },
    location: { type: Type.STRING },
    diagnosis: { type: Type.STRING },
    admittedDate: { type: Type.STRING },
    hbsag: { type: Type.STRING },
    hbsagDate: { type: Type.STRING },
    hbsab: { type: Type.STRING },
    hbsabDate: { type: Type.STRING },
  };

  const orderProps = {
    physician: { type: Type.STRING },
    dialyzer: { type: Type.STRING },
    duration: { type: Type.STRING },
    prime: { type: Type.STRING },
    treatmentDate: { type: Type.STRING },
    ufGoal: { type: Type.STRING },
    bloodFlowRate: { type: Type.STRING },
    dialysateFlowRate: { type: Type.STRING },
    potassium: { type: Type.STRING },
    calcium: { type: Type.STRING },
    sodium: { type: Type.STRING },
    heparin: { type: Type.STRING },
    accessMethod: { type: Type.STRING },
    sodiumModeling: { type: Type.STRING },
    bicarb: { type: Type.STRING },
    dialysateTemp: { type: Type.STRING },
    minBP: { type: Type.STRING },
    ufProfile: { type: Type.STRING },
    orderDateTime: { type: Type.STRING },
  };

  const monitoringProps = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        time: { type: Type.STRING },
        pulse: { type: Type.STRING },
        resp: { type: Type.STRING },
        bp: { type: Type.STRING },
        map: { type: Type.STRING },
        sao2: { type: Type.STRING },
        temp: { type: Type.STRING },
        bfr: { type: Type.STRING },
        ufr: { type: Type.STRING },
        vp: { type: Type.STRING },
        ap: { type: Type.STRING },
        tmp: { type: Type.STRING }
      }
    }
  };

  const properties: any = {};
  if (scanType === 'all' || scanType === 'patient') properties.patient = { type: Type.OBJECT, properties: patientProps };
  if (scanType === 'all' || scanType === 'order') properties.dialysisOrder = { type: Type.OBJECT, properties: orderProps };
  if (scanType === 'all' || scanType === 'monitoring') properties.monitoringEntries = monitoringProps;
  if (scanType === 'all') {
    properties.vitals = {
      type: Type.OBJECT,
      properties: {
        bp: { type: Type.STRING },
        pulse: { type: Type.STRING },
        temp: { type: Type.STRING },
        resp: { type: Type.STRING },
        spo2: { type: Type.STRING },
      }
    };
    properties.csn = { type: Type.STRING };
  }

  try {
    console.log(`[AI] Initializing extraction - Model: ${model}, Type: ${scanType}, Modality: ${modality}`);
    console.log(`[AI] Payload size: ${Math.round(imageBase64.length / 1024)} KB`);
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: "Extract the structured clinical data from this EHR flowsheet or order image." },
          { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
        ]
      },
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties
        }
      }
    });

    if (!response.text) {
      throw new Error("AI returned an empty response text.");
    }

    const text = response.text.trim();
    console.log("[AI] Raw Response Received:", text.substring(0, 500) + (text.length > 500 ? '...' : ''));
    
    try {
      const parsed = JSON.parse(text);
      console.log("[AI] JSON Parse Success");
      return parsed;
    } catch (parseError) {
      console.warn("[AI] Parse failed, cleaning string...");
      // Clean up markdown block if present
      let cleaned = text;
      if (cleaned.includes('```json')) {
        const match = cleaned.match(/```json([\s\S]*?)```/);
        if (match) cleaned = match[1];
      } else if (cleaned.includes('```')) {
        const match = cleaned.match(/```([\s\S]*?)```/);
        if (match) cleaned = match[1];
      }
      
      try {
        return JSON.parse(cleaned.trim());
      } catch (e2) {
        console.error("[AI] Final parse attempt failed:", text);
        throw new Error("The data in this image was too complex or truncated. Please try a clearer photo or focus on a smaller area.");
      }
    }
  } catch (error) {
    if (error && typeof error === 'object') {
      let errorObj = error as any;
      
      // If error message is JSON string, parse it (common in some SDK versions)
      if (errorObj.message && typeof errorObj.message === 'string' && errorObj.message.includes('{')) {
        try {
          const inner = JSON.parse(errorObj.message);
          errorObj = { ...errorObj, ...inner };
        } catch (e) { /* ignore */ }
      }

      const status = errorObj.status || (errorObj.error && errorObj.error.status);
      const code = errorObj.code || (errorObj.error && errorObj.error.code);

      // Handle Quota/Rate Limit (429)
      if (status === 'RESOURCE_EXHAUSTED' || code === 429 || (errorObj.message && errorObj.message.includes('429'))) {
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1500; // 1.5s, 3s, 6s
          console.warn(`Quota exceeded. Retrying in ${delay}ms... (Attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return extractClinicalData(imageBase64, modality, scanType, retryCount + 1);
        }
        throw new Error("AI Quota Exceeded. The service is busy or you've scanned many documents. Please wait 60 seconds.");
      }

      // Handle Internal Server Error (500)
      if (status === 'INTERNAL' || code === 500) {
        if (retryCount < 2) {
          console.warn("Retrying due to INTERNAL server error...");
          await new Promise(resolve => setTimeout(resolve, 1000));
          return extractClinicalData(imageBase64, modality, scanType, retryCount + 1);
        }
        throw new Error("AI service is currently experiencing a temporary issue. Please try again in moments.");
      }
    }
    
    console.error("AI Extraction Error:", error);
    throw error;
  }
}
