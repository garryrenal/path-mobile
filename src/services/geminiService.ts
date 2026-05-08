import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export type ScanType = 'patient' | 'order' | 'monitoring' | 'all';

export async function extractClinicalData(
  imageBase64: string, 
  modality: 'hemodialysis' | 'apheresis' | 'nts', 
  scanType: ScanType = 'all',
  retryCount = 0
): Promise<any> {
  const model = "gemini-3-flash-preview";

  let specificInstruction = "";
  if (scanType === 'monitoring') {
    specificInstruction = `FOCUS: Vital Monitoring Flowsheet (Clinical Observations).
    EHR flowsheets often show times as column headers and variables (BP, HR, SpO2) as rows. 
    OR they show times as rows and variables as columns.
    
    CRITICAL: 
    1. Extract EACH unique time point as one object in the "monitoringEntries" array.
    2. Look for the treatment date header (often located just above the time columns, e.g., "4/16/2026") and include it in the 'date' field for each entry.
    3. Map clinical variables accurately:
       - Date (e.g. 4/16/2026) -> date (Format: "YYYY-MM-DD")
       - Time (08:00, 09:30, etc.) -> time
       - Blood Pressure -> bp
       - MAP -> map
       - Heart Rate / Puls / P -> pulse
       - SpO2 / SaO2 -> sao2
       - Temperature / Temp / T -> temp
       - Respiration / Resp / RR -> resp
       - Blood Flow / BFR -> bfr
       - Ultrafiltration / UFR -> ufr
    4. If a value for a specific time is missing or unreadable, do NOT include that key or use null.
    5. Only extract ACTUAL data points. Skip empty columns/rows.`;
  } else if (scanType === 'order') {
    specificInstruction = `FOCUS: Dialysis Order. 
    Extract values: duration (format HH:mm), treatmentDate (YYYY-MM-DD), dialyzer, accessType, bloodFlowRate, dialysateFlowRate, ufGoal, potassium, calcium, sodium, bicarb, dialysateTemp, minBP, ufProfile.`;
  } else if (scanType === 'patient') {
    specificInstruction = `FOCUS: Patient identity & Hepatitis stats.
    Extract: MRN, CSN, Name, DOB (YYYY-MM-DD), Gender, Allergies.
    Hepatitis Labs: HBsAg, HBsAb, HBcAb (result & date).`;
  } else if (scanType === 'all') {
    specificInstruction = `Comprehensive extraction of Patient Identity, Dialysis Orders, and Vital Signs Flowsheets.`;
  }

  const systemInstructions = `
    You are a medical data extraction specialist. OCR the clinical data from the EHR image and return structured JSON.
    ${specificInstruction}
    Return ONLY strict JSON.
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
        date: { type: Type.STRING },
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
        date: { type: Type.STRING },
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
