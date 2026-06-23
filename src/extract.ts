import ollama from "ollama";

export interface CalendarEvent {
  title: string;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:MM (24hr)
  location?: string;
  priority?: "low" | "medium" | "high";
}

export async function extractEvent(userText: string): Promise<CalendarEvent | null> {
  const today = new Date().toISOString().split("T")[0];

  const prompt = `
Today's date is ${today}.

Extract meeting/event details from the text below.
Return ONLY a valid JSON object. No explanation. No markdown. No backticks.

If any field is missing, make your best guess or use null.

Required format:
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

    // Clean up in case Gemma adds backticks anyway
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const event: CalendarEvent = JSON.parse(cleaned);
    return event;

  } catch (err) {
    console.error("Failed to extract event:", err);
    return null;
  }
}

// // ---- Run directly to test ----
// (async () => {
//   const testText = "Hey Hamza, project review meeting is on Friday at 3 PM in Conference Room B.";
//   console.log("Input:", testText);

//   const event = await extractEvent(testText);

//   if (event) {
//     console.log("Extracted Event:");
//     console.log(JSON.stringify(event, null, 2));
//   } else {
//     console.log("Could not extract event.");
//   }
// })();
