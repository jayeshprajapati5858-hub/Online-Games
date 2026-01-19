
import { GoogleGenAI } from "@google/genai";

// Prevent crash if API key is not set in Vercel
const apiKey = process.env.API_KEY || "dummy_key_for_init";
const ai = new GoogleGenAI({ apiKey });

export const getCombatTip = async (score: number): Promise<string> => {
  if (apiKey === "dummy_key_for_init") return "દુશ્મનોથી બચો અને સચોટ નિશાન લગાવો!";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a pro game coach. Player score: ${score}. Give a short, punchy combat tip in Gujarati (under 10 words).`,
      config: {
        temperature: 0.7,
      },
    });
    return response.text || "દુશ્મનોથી બચો અને સચોટ નિશાન લગાવો!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "સાવધાન રહો અને દુશ્મનો પર નજર રાખો!";
  }
};

export const getDailyRewardText = async (): Promise<string> => {
  if (apiKey === "dummy_key_for_init") return "આજનું ઇનામ મેળવો!";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate a hype, 1-line 'Daily Earning Bonus' message in Gujarati for an action game.",
      config: { temperature: 0.9 },
    });
    return response.text || "આજનું ઇનામ મેળવો અને ગેમ રમો!";
  } catch (error) {
    return "તમારું દૈનિક બોનસ અહીં છે!";
  }
};
