
import { GoogleGenAI } from "@google/genai";

// Fix: Direct initialization from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCombatTip = async (score: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `તમે એક પ્રોફેશનલ ગેમ ગાઈડ છો. ખેલાડીનો સ્કોર ${score} છે. તેને એક નાની અને પ્રેરણાદાયી 'Combat Tip' આપો (ગુજરાતીમાં). Keep it under 15 words.`,
      config: {
        temperature: 0.7,
      },
    });
    // Fix: Access .text property, not a function
    return response.text || "દુશ્મનોથી બચો અને સચોટ નિશાન લગાવો!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "સાવધાન રહો અને દુશ્મનો પર નજર રાખો!";
  }
};

export const getDailyRewardText = async (): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a catchy 1-line 'Daily Earning Bonus' message in Gujarati for an action game.",
      config: { temperature: 0.9 },
    });
    // Fix: Access .text property, not a function
    return response.text || "આજનું ઇનામ મેળવો અને ગેમ રમો!";
  } catch (error) {
    return "તમારું દૈનિક બોનસ અહીં છે!";
  }
};
