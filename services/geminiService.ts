import { GoogleGenAI, Type } from "@google/genai";
import { NewsItem, GroundingSource, AnalysisData, GeminiModel } from "../types";

/**
 * Extracts a JSON string from a markdown code block.
 * If no markdown block is found, returns null.
 */
function extractJsonFromMarkdown(text: string): string | null {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    return match[1];
  }
  return null; // Return null if no markdown block is found
}

export const fetchTechNews = async (
  category: string = 'Technology', 
  subCategory: string = 'All',
  preferredSources: string[] = [],
  modelName: GeminiModel = 'gemini-flash-latest'
): Promise<{ items: NewsItem[], sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const now = new Date();
  const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  const dateStringNow = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const dateStringYesterday = yesterday.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  let categoryInstruction = "";
  const subCatText = subCategory !== 'All' ? `Specifically focusing on the sub-topic: ${subCategory}.` : "";
  
  const sourceText = preferredSources.length > 0 
    ? `CRITICAL: You MUST ONLY return news items that originated from or are reported by these specific domains/outlets: ${preferredSources.join(', ')}. If a story is not covered by these specific brands, exclude it.` 
    : "You may use any reputable global news sources.";

  if (category === 'Politics') {
    categoryInstruction = `Focus on high-stakes political news concerning India, the European Union (EU), and the United States (US). ${subCatText}`;
  } else if (category === 'Geo-politics') {
    categoryInstruction = `Focus on strategic international relations, global diplomacy shifts, and major geopolitical conflicts. ${subCatText}`;
  } else if (category === 'Markets') {
    categoryInstruction = `Focus on major stock market movements, global indices (S&P 500, Nifty, etc.), commodities, and market-moving corporate events. ${subCatText}`;
  } else if (category === 'Finance') {
    categoryInstruction = `Focus on systemic banking shifts, macroeconomic policy changes, corporate earnings of giants, and major fintech developments. ${subCatText}`;
  } else if (category === 'Technology') {
    categoryInstruction = `Focus on industry-shaping AI, strategic startup acquisitions, massive hardware/software breakthroughs, and critical cybersecurity events. ${subCatText}`;
  } else {
    categoryInstruction = `Provide only critical headlines for the selected sector. ${subCatText}`;
  }

  const prompt = `Provide a comprehensive list of EXACTLY 50 unique news items from the LAST 24 HOURS (between ${dateStringYesterday} and ${dateStringNow}). 
  
  Category Focus: ${category}
  Instruction: ${categoryInstruction}
  Source Constraint: ${sourceText}
  
  SCORING GUIDELINE (RELEVANCE):
  - Scale: 1 to 10.
  - 10: World-changing/Historical event.
  - 8-9: Major sector-defining news.
  - 5-7: Significant daily news.
  - 1-4: Minor updates or niche news.
  
  CRITICAL: Since this is a "Daily Digest", MOST actual news stories from the last 24 hours should be scored between 5 and 10. Do not be overly conservative with scores; if it is a real story worth reading today, it is at least a 5.
  
  MANDATORY: Provide exactly 50 distinct items.
  
  Structure the response as a JSON array of objects:
  - id: unique string
  - title: clear, impactful headline
  - summary: a concise yet descriptive paragraph (3-5 sentences) providing key details.
  - category: exactly '${category}'
  - subCategory: the specific sub-topic if applicable
  - source: the primary publisher name (MATCH the names provided in source constraint if applicable, e.g. "TechCrunch", "The Verge")
  - relevance: integer 1-10 (ensure high-quality stories are 5+)`;

  try {
    const response = await ai.models.generateContent({
      model: modelName, // Use dynamic modelName
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for consistency
      },
    });

    let items: NewsItem[] = [];
    const rawResponseText = response.text || "";
    const jsonString = extractJsonFromMarkdown(rawResponseText);

    if (!jsonString) {
      console.error("Model response did not contain a JSON markdown block.");
      console.error("Raw model response:", rawResponseText);
      throw new Error("Model returned malformed JSON or an unexpected response format.");
    }

    try {
      items = JSON.parse(jsonString);
    } catch (jsonError) {
      console.error("JSON parsing error in fetchTechNews:", jsonError);
      console.error("Raw model response (attempted parse):", jsonString);
      console.error("Full raw model response:", rawResponseText);
      throw new Error("Failed to parse news items from model response.");
    }
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());
    return { items, sources: uniqueSources };
  } catch (error: any) {
    console.error("Gemini API Error (fetchTechNews):", error);
    if (error.message && error.message.includes("API key not found or invalid")) { 
      throw new Error("API key missing or invalid. Please ensure process.env.API_KEY is set correctly.");
    }
    // For any other error, including JSON parsing issues or model's "I am sorry" response
    // we throw a generic UNAVAILABLE error to trigger the UI error message.
    throw new Error("UNAVAILABLE"); 
  }
};

export const fetchDeepAnalysis = async (
  item: NewsItem,
  modelName: GeminiModel = 'gemini-flash-latest'
): Promise<AnalysisData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `Perform a strategic deep-dive into the following news item:
  Title: "${item.title}"
  Summary: "${item.summary}"
  
  MANDATORY: Provide a comprehensive analysis in simple, clear English, avoiding unnecessary jargon. Structure the response like a concise blog post, using Markdown for formatting (headings, bullet points, bold text, and clear paragraphs separated by newlines).
  
  Analysis should cover three distinct sections:
  
  1.  **Strategic Impact (marketImpact)**:
      *   Explain the immediate and potential long-term impact on relevant markets, industries, or sectors.
      *   Use clear language, e.g., "This could lead to..." or "Investors might see..."
      *   Approximately 3-5 sentences, using bullet points for key impacts.
  
  2.  **Contextual Drivers (technicalContext)**:
      *   Describe the underlying technical, political, or economic factors that led to this development.
      *   Break down any complex concepts into easily digestible explanations.
      *   Approximately 3-5 sentences, using bullet points for key drivers.
  
  3.  **Risk & Future Outlook (futureOutlook)**:
      *   Discuss potential risks, challenges, or opportunities arising from this news.
      *   Provide a forward-looking perspective for the next 6-12 months.
      *   Approximately 3-5 sentences, using bullet points for outlooks.
  
  CRITICAL: The response MUST be a JSON object with EXACTLY these three top-level keys: "marketImpact", "technicalContext", and "futureOutlook". The values for these keys must be strings containing the markdown-formatted blog post sections.
  
  Example JSON structure:
  {
    "marketImpact": "## Market Impact\\n\\nThis is the impact **written in simple English**.\\n*   Point 1\\n*   Point 2",
    "technicalContext": "## Technical Context\\n\\nExplanation of drivers in simple terms.\\n\\nAnother paragraph.",
    "futureOutlook": "## Future Outlook\\n\\n*   Opportunity A\\n*   Risk B"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: modelName, // Use dynamic modelName
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for consistency
      },
    });

    let analysis: AnalysisData = { marketImpact: "No analysis available.", technicalContext: "No context available.", futureOutlook: "No outlook available.", sources: [] };
    const rawResponseText = response.text || "";
    const jsonString = extractJsonFromMarkdown(rawResponseText);

    if (!jsonString) {
      console.error("Model response for deep analysis did not contain a JSON markdown block.");
      console.error("Raw model response:", rawResponseText);
      throw new Error("Model returned malformed JSON or an unexpected response format for analysis.");
    }

    try {
      const parsedAnalysis = JSON.parse(jsonString);
      
      // Explicitly map to expected keys, providing fallbacks
      analysis.marketImpact = parsedAnalysis.marketImpact || "No strategic impact analysis available.";
      analysis.technicalContext = parsedAnalysis.technicalContext || "No contextual drivers analysis available.";
      analysis.futureOutlook = parsedAnalysis.futureOutlook || "No risk & future outlook analysis available.";

    } catch (jsonError) {
      console.error("JSON parsing error in fetchDeepAnalysis:", jsonError);
      console.error("Raw model response (attempted parse):", jsonString);
      console.error("Full raw model response:", rawResponseText);
      throw new Error("Failed to parse analysis data from model response.");
    }
    
    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web && chunk.web.uri && chunk.web.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

    return {
      marketImpact: analysis.marketImpact,
      technicalContext: analysis.technicalContext,
      futureOutlook: analysis.futureOutlook,
      sources: uniqueSources
    };
  } catch (error: any) {
    console.error("Gemini API Error (fetchDeepAnalysis):", error);
    if (error.message && error.message.includes("API key not found or invalid")) { 
      throw new Error("API key missing or invalid. Please ensure process.env.API_KEY is set correctly.");
    }
    throw new Error("UNAVAILABLE");
  }
};