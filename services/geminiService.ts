import { GoogleGenAI } from "@google/genai";
import { SimulationParams, Vector3 } from "../types";

// Helper to format vector for prompt
const fmtVec = (v: Vector3) => `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`;

export const analyzePhysics = async (params: SimulationParams): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return "שגיאה: מפתח API לא נמצא. אנא וודא שמשתנה הסביבה מוגדר.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    // Calculate some basic physics values to help the model verify
    const vMag = Math.sqrt(params.velocity.x**2 + params.velocity.y**2 + params.velocity.z**2);
    const bMag = Math.sqrt(params.bField.x**2 + params.bField.y**2 + params.bField.z**2);
    
    // Cross product direction (v x B)
    const forceDir = {
      x: params.velocity.y * params.bField.z - params.velocity.z * params.bField.y,
      y: params.velocity.z * params.bField.x - params.velocity.x * params.bField.z,
      z: params.velocity.x * params.bField.y - params.velocity.y * params.bField.x
    };

    const prompt = `
      פעל כפיזיקאי מומחה המסביר מושגים לתלמידי פיזיקה.
      נתונה סימולציה של חלקיק טעון בשדה מגנטי עם הפרמטרים הבאים:
      
      מסה (m): ${params.mass} יחידות
      מטען (q): ${params.charge} יחידות
      וקטור מהירות (v): ${fmtVec(params.velocity)} (גודל: ${vMag.toFixed(2)})
      וקטור שדה מגנטי (B): ${fmtVec(params.bField)} (גודל: ${bMag.toFixed(2)})
      
      אנא נתח את התנועה הצפויה:
      1. תאר את סוג המסלול (למשל: מעגלי, בורגי/ספירלי, ישר).
      2. אם המסלול מעגלי או בורגי, חשב והצג את רדיוס הציקלוטרון (R = mv/qB עבור הרכיב המאונך) ואת זמן המחזור.
      3. הסבר בקצרה את כיוון הכוח המגנטי (כוח לורנץ) ביחס למהירות ולשדה.
      4. הסבר פיזיקלי קצר ואינטואיטיבי בעברית.

      שמור על תשובה תמציתית וברורה, מעוצבת ב-Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Fast response preferred for UI
      }
    });

    return response.text || "לא התקבל הסבר.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return "שגיאה בתקשורת עם ה-AI. אנא נסה שוב מאוחר יותר.";
  }
};
