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
    specificInstruction = `FOCUS: You are scanning a Vital Monitoring / Flowsheet table. 
    Extract each column as a separate row. 
    
    IMPORTANT: 
    - Find the DATE (e.g. "4/16/2026", "04/16/2026") located in the header area, typically centered or left-aligned above the time headers. Extract this into "date".
    - Because the date applies to the columns, ensure EVERY entry object in the "monitoringEntries" array has this "date" property.
    - Time Header (e.g. 0945, 1100) -> time (FORMAT as HH:mm in STRICT 24-HOUR MILITARY TIME, e.g. "13:00", "14:15", "01:00". No AM/PM).
    - Mean Arterial Pressure (Device) -> map
    - MISSING DATA: If a value is missing, return an EMPTY STRING "". NEVER return "null" or null.
    - Fields:
      - Temp -> temp
      - Heart Rate / Pulse -> pulse
      - Resp -> resp
      - BP -> bp
      - SpO2 -> sao2
      - BFR Ordered or Blood Flow Rate Achieved -> bfr
      - Dialysis Venous Pressure -> vp
      - Dialysis Arterial Pressure -> ap
      - Dialysis Transmembrane Pressure -> tmp
      - Ultrafiltration (UFR) -> ufr
      - Dialysate Flow Rate -> dfr
      - Hemodialysis General Comments -> notes
    - PATIENT IDENTITY: Look for the patient name at the very top of the flowsheet/report. Extract this into "patientName".`;
  } else if (scanType === 'order') {
    specificInstruction = `FOCUS: You are scanning a Dialysis Order or Treatment Order Question/Answer table. 
    Extract the following fields precisely:
    - "Duration (Minutes)?" -> duration (CONVERT minutes like 180 to "03:00").
    - "Dialysis Date?" -> treatmentDate (YYYY-MM-DD).
    - "Dialyzer?" -> dialyzer.
    - "Access Method?" -> accessMethod (maps to accessType).
    - "Blood Flow Rate (mL/min)" -> bloodFlowRate.
    - "Dialysis flow?" -> dialysateFlowRate.
    - "Ultrafiltration Goal" -> ufGoal.
    - "Dialysate Potassium (mEq/L)" -> potassium (extract decimal like "2.0").
    - "Dialysate Calcium (mEq/L)" -> calcium (extract decimal like "2.5").
    - "Sodium Bath" -> sodium.
    - "Sodium Modeling" -> sodiumModeling.
    - "Maintain Systolic BP Greater than (mm/Hg)" -> minBP.
    - "Ultrafiltration Profile" -> ufProfile.
    - "Temperature of Dialysate" -> dialysateTemp.
    - "Dialysate HCO3 (mEq/L)" -> bicarb.
    - "Order History" -> scan the first row under this section. Extract "Date/Time" as orderDateTime and the M.D. under "User" as physician.
    - PATIENT IDENTITY: Look for the patient name at the very top of the order report (e.g. "Jennifer Lagman"). Extract this into "patientName".`;
  } else if (scanType === 'patient') {
    specificInstruction = `FOCUS: Extract Patient Identity, Lab Status, and Pre-Treatment/Clinical Assessment data. 
    1. Demographics: MRN, CSN (Contact Serial Number), Name (split if joined), DOB, Age, Gender, Location, Attending.
    2. Laboratory: Look for HEPATITIS section (HBsAg, HBsAb, CoreAb). Map values like "POSITIVE", "NEGATIVE", "REACTIVE" and extract associated dates. Specifically, look diligently in the right upper quadrant of the images for HBsAg and HBsAb results if available.
    3. GI / Abdomen Assessment: Look for Gastrointestinal or Abdominal exams. Extract findings for:
       - giAbdomen (Map to options like: Rounded, Rigid, Firm, Guarded, Right-Upper Quadrant, Right-Lower Quadrant, Left-Upper Quadrant, Left-Lower Quadrant, Palpable masses, Hernia. If multiple, comma-separate them.)
       - giBowelSounds (Map to: Normoactive, Hyperactive, Hypoactive, Absent)
       - giSymptoms (Map to: Constipation, Continent, Cramping, Diarrhea, Difficulty Swallowing, Epigastric Pain, Heartburn, Hemorrhoids, Incontinent, Loss/Decreased Appetite, Nausea, Projectile Vomiting. If multiple, comma-separate them.)
       - giTubesDrains (Map to: Nasogastric Tube, Oro-Gastric Tube, Gastric Tube, Nasojejunal Tube, Gastrojejunostomy Tube, Rectal Tube, Orojejunal Tube, Jejunostomy Tube. If multiple, comma-separate them.)
    Notes: CSN is often near MRN in popups. If name is "Last, First", split accordingly.`;
  }

  const systemInstructions = `
    Identify and extract clinical data from the EHR image.
    ${specificInstruction}
    Output strict JSON. No conversational text.
  `;

  // Base properties
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
    giAbdomen: { type: Type.STRING },
    giBowelSounds: { type: Type.STRING },
    giSymptoms: { type: Type.STRING },
    giTubesDrains: { type: Type.STRING },
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
    patientName: { type: Type.STRING },
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
        vp: { type: Type.STRING },
        ap: { type: Type.STRING },
        tmp: { type: Type.STRING },
        ufr: { type: Type.STRING },
        dfr: { type: Type.STRING },
        notes: { type: Type.STRING },
        patientName: { type: Type.STRING }
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
    console.log(`Extracting data (${scanType}) for ${modality}. Size: ${Math.round(imageBase64.length / 1024)} KB`);
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: "Extract clinical data from this image." },
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
      throw new Error("AI returned an empty response.");
    }

    let text = response.text;
    
    // Clean up markdown block if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.warn("Initial JSON parse failed, attempting repair:", parseError);
      
      // Basic repair for truncated JSON strings
      try {
        let repaired = text.trim();
        
        // Count braces and brackets
        let openBraces = (repaired.match(/\{/g) || []).length;
        let closeBraces = (repaired.match(/\}/g) || []).length;
        let openBrackets = (repaired.match(/\[/g) || []).length;
        let closeBrackets = (repaired.match(/\]/g) || []).length;
        
        // If last char is a comma, remove it
        if (repaired.endsWith(',')) {
          repaired = repaired.slice(0, -1);
        }
        
        // Close strings if unterminated (look for odd number of quotes)
        // This is tricky but we can try to find if the last quote is not followed by closure
        const quotes = repaired.match(/"/g) || [];
        if (quotes.length % 2 !== 0) {
          repaired += '"';
        }

        // Add missing closing brackets/braces
        while (closeBrackets < openBrackets) {
          repaired += ']';
          closeBrackets++;
        }
        while (closeBraces < openBraces) {
          repaired += '}';
          closeBraces++;
        }
        
        return JSON.parse(repaired);
      } catch (repairError) {
        console.error("JSON repair also failed:", repairError);
        throw new Error("The clinical data in this image was too complex for the AI to process in one go. Please try zooming in on a smaller section or retaking the photo.");
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
