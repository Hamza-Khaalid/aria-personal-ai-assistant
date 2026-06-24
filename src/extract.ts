import ollama from "ollama";

export interface CalendarEvent {
  title: string;
  date: string;
  time: string;
  location?: string;
  priority?: "low" | "medium" | "high";
}

export interface TaskItem {
  title: string;
  notes?: string;
  due?: string;
  priority?: "low" | "medium" | "high";
}

// Extract calendar event or meet details
export async function extractEvent(userText: string): Promise<CalendarEvent | null> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `
Today's date is ${today}.
Time of day references: morning = 09:00, afternoon = 14:00, evening = 18:00, night = 20:00, noon = 12:00, midnight = 00:00.

Important rules:
- If the user gives an explicit time (like "5pm", "3:30pm"), ALWAYS use that exact time. Never override it.
- Only use time-of-day defaults when NO explicit time is given.
- Calculate relative dates correctly: "tomorrow" = ${today} + 1 day, "next Friday" = upcoming Friday from today.

Extract meeting/event details from the text below.
Return ONLY a valid JSON object. No explanation. No markdown. No backticks.

Format:
{
  "title": "event title",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "location": "place or null",
  "priority": "low or medium or high"
}

Text: "${userText}"
`;

  try {
    const response = await ollama.chat({
      model: "gemma3",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content.trim();
    console.log("\n--- Gemma Raw Output ---");
    console.log(raw);
    console.log("------------------------\n");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Extract task details
export async function extractTask(userText: string): Promise<TaskItem | null> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `
Today's date is ${today}.

Extract task/todo details from the text below.
Return ONLY a valid JSON object. No explanation. No markdown. No backticks.

Format:
{
  "title": "what needs to be done",
  "notes": "any extra details or null",
  "due": "YYYY-MM-DD or null",
  "priority": "low or medium or high"
}

Text: "${userText}"
`;

  try {
    const response = await ollama.chat({
      model: "gemma3",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content.trim();
    console.log("\n--- Gemma Raw Output ---");
    console.log(raw);
    console.log("------------------------\n");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Extract email details
export async function extractEmail(userText: string): Promise<{ to: string; subject: string; body: string } | null> {
  const prompt = `
Extract email details from the text below.
Return ONLY a valid JSON object. No explanation. No markdown. No backticks.

Format:
{
  "to": "recipient email address or their name if no email given",
  "subject": "email subject line",
  "body": "the full email body text, written professionally"
}

Text: "${userText}"
`;

  try {
    const response = await ollama.chat({
      model: "gemma3",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content.trim();
    console.log("\n--- Gemma Raw Output ---");
    console.log(raw);
    console.log("------------------------\n");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

// Extract travel details
export async function extractTravelDetails(userText: string): Promise<{ origin: string; destination: string } | null> {
  const prompt = `
Extract travel/distance details from the text below.
Return ONLY a valid JSON object. No explanation. No markdown. No backticks.

Format:
{
  "origin": "starting location",
  "destination": "ending location"
}

Text: "${userText}"
`;

  try {
    const response = await ollama.chat({
      model: "gemma3",
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.message.content.trim();
    console.log("\n--- Gemma Raw Output ---");
    console.log(raw);
    console.log("------------------------\n");

    const cleaned = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}
