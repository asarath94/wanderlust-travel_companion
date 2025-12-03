const API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY;
const MODEL = (process.env.EXPO_PUBLIC_AI_MODEL || 'gemini-1.5-flash').trim();
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

console.log('AI Service Initialized:', { MODEL, API_URL });

export interface Activity {
  time: string;
  title: string;
  description: string;
  location: string;
}

export interface DayPlan {
  day: number;
  date: string;
  activities: Activity[];
}

export interface Itinerary {
  days: DayPlan[];
}

export const generateItinerary = async (tripDetails: any): Promise<Itinerary> => {
  if (!API_KEY) throw new Error('API Key is missing');

  const prompt = `
    You are a professional travel agent. Plan a detailed itinerary for a trip to ${tripDetails.destinations.join(', ')} 
    from ${tripDetails.startDate} to ${tripDetails.endDate}.
    The starting point is ${tripDetails.startingPoint}.
    
    Return ONLY a valid JSON object with the following structure (no markdown, no code blocks):
    {
      "days": [
        {
          "day": 1,
          "date": "DD-MM-YYYY",
          "activities": [
            {
              "time": "HH:MM",
              "title": "Activity Name",
              "description": "Brief description",
              "location": "Location Name"
            }
          ]
        }
      ]
    }
  `;

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.candidates[0].content.parts[0].text;
    // Clean up markdown if present
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
};

export const sendChatMessage = async (history: any[], newMessage: string, tripContext: any) => {
  if (!API_KEY) throw new Error('API Key is missing');

  const contextPrompt = `
    You are a helpful travel assistant for a trip to ${tripContext.destinations.join(', ')}.
    Dates: ${tripContext.startDate} to ${tripContext.endDate}.
    Current context: User is asking about this trip.
  `;

  // Convert history to Gemini format if needed, or just append to prompt for simplicity in this stateless version
  // For better chat, we should maintain history. Here we'll just do a simple turn.
  
  const prompt = `${contextPrompt}\n\nUser: ${newMessage}\nAssistant:`;

  try {
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Chat Service Error:', error);
    throw error;
  }
};
