import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource, AnalysisData, GeminiModel } from "../types";

/**
 * Robustly extracts a JSON string from model output.
 * Handles markdown blocks, generic blocks, or raw bracketed strings.
 */
function extractJson(text: string): string | null {
  if (!text) return null;

  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  const genericBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const content = genericBlockMatch[1].trim();
    if (content.startsWith('[') || content.startsWith('{')) {
      return content;
    }
  }

  const firstBracket = text.search(/[\[\{]/);
  const lastBracket = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
  
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    return text.substring(firstBracket, lastBracket + 1).trim();
  }

  return null;
}

export const fetchTechNews = async (
  category: string, 
  subCategory: string = 'All',
  preferredSources: string[] = [],
  modelName: GeminiModel = 'gemini-3-flash-preview'
): Promise<{ items: NewsItem[], sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const now = new Date();
  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  const dateStringNow = now.toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  let categoryInstruction = "";
  const subCatText = subCategory !== 'All' ? `Specifically focusing on the sub-topic: ${subCategory}.` : "";
  
  // Enhanced source instruction to use site: operator
  const sourceInstruction = preferredSources.length > 0 
    ? `CRITICAL: You MUST ONLY return news items from these domains: ${preferredSources.join(', ')}. 
       INSTRUCTION: When using the Google Search tool, focus your queries specifically on these sites using the 'site:' operator. 
       For example: 'site:${preferredSources[0]} ${category} ${subCategory}'.`
    : "Use reputable global news sources like Reuters, Bloomberg, TechCrunch, CNBC, and Moneycontrol.";

  if (category === 'Politics') {
    categoryInstruction = `Focus on political news from India, EU, and US. ${subCatText}`;
  } else if (category === 'Geo-politics') {
    categoryInstruction = `Focus on diplomacy and international conflicts. ${subCatText}`;
  } else if (category === 'Markets') {
    categoryInstruction = `Focus on global stock market movements, Nifty/Sensex, indices, and commodities. ${subCatText}`;
  } else if (category === 'Finance') {
    categoryInstruction = `Focus on economy, banking, and fintech. ${subCatText}`;
  } else if (category === 'Technology') {
    categoryInstruction = `Focus on AI, hardware, software, and cybersecurity. ${subCatText}`;
  } else if (category === 'Professional') {
    categoryInstruction = `Focus on professional updates for: ${subCategory}.`;
  }

  const prompt = `YOU ARE A REAL-TIME NEWS AGGREGATOR.
  USE THE GOOGLE SEARCH TOOL TO SCAN THE WEB FOR NEWS PUBLISHED IN THE LAST 24 HOURS.
  CURRENT TIME: ${dateStringNow}
  
  TASK: Synthesize exactly 25 major headlines for the category: ${category}.
  ${categoryInstruction}
  ${sourceInstruction}

  MANDATORY GUIDELINES:
  1. DO NOT MENTION KNOWLEDGE CUTOFFS. Rely SOLELY on results from the Google Search tool.
  2. If preferred sources are specified, DO NOT include any news from other domains.
  3. Provide exactly 25 items (minimum 15).
  4. Respond ONLY with a valid JSON array inside a markdown block.
  5. Each item must have:
     - "id": Unique string
     - "title": Compelling headline
     - "summary": 2-3 sentence strategic summary
     - "category": ${category}
     - "subCategory": The specific sub-topic
     - "source": Name of the publisher
     - "relevance": 1-10 (how critical the news is)
     - "uri": URL to the article
     - "publishedAt": VALID ISO 8601 timestamp (e.g. 2024-05-20T14:30:00Z)
     - "publishedAtDisplay": Human readable relative time (e.g. "2 hours ago", "Today, 9:00 AM")
  
  FORMAT:
  \`\`\`json
  [
    { "id": "...", "title": "...", "publishedAt": "2024-05-20T14:30:00Z", "publishedAtDisplay": "2 hours ago", ... }
  ]
  \`\`\``;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.1
      },
    });

    const jsonString = extractJson(response.text || "");
    if (!jsonString) {
      throw new Error("UNAVAILABLE: The model provided a non-structured response.");
    }

    const items = JSON.parse(jsonString);
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { 
      items: items.map((i: any) => ({ ...i, category })), 
      sources: Array.from(new Map(sources.map(s => [s.uri, s])).values()) 
    };
  } catch (error: any) {
    console.error("fetchTechNews error:", error);
    if (error.message.includes("cutoff") || error.message.includes("fulfill")) {
       throw new Error("UNAVAILABLE: Synthesis engine blocked by internal safety filters for real-time data.");
    }
    throw new Error(error.message || "Failed to load news.");
  }
};

export const fetchDeepAnalysis = async (
  item: NewsItem,
  modelName: GeminiModel = 'gemini-3-flash-preview'
): Promise<AnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Strategic deep-dive for: "${item.title}". Return JSON with keys: marketImpact, technicalContext, futureOutlook. Use Google Search for the latest data.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
    });
    const jsonString = extractJson(response.text || "");
    if (!jsonString) throw new Error("Analysis failed.");
    const parsed = JSON.parse(jsonString);
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      });
    }
    return {
      marketImpact: parsed.marketImpact || "",
      technicalContext: parsed.technicalContext || "",
      futureOutlook: parsed.futureOutlook || "",
      sources: Array.from(new Map(sources.map(s => [s.uri, s])).values())
    };
  } catch (error) {
    throw new Error("UNAVAILABLE");
  }
};