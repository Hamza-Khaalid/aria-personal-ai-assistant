import { google } from "googleapis";
import { getAuthClient } from "./auth";
import { CalendarEvent } from "./extract";

export async function createCalendarEvent(event: CalendarEvent) {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  // Build start and end DateTime strings
  const startDateTime = `${event.date}T${event.time}:00`;
  const endHour = parseInt(event.time.split(":")[0]) + 1;
  const endTime = `${String(endHour).padStart(2, "0")}:${event.time.split(":")[1]}`;
  const endDateTime = `${event.date}T${endTime}:00`;

  // Add priority label to title
  const titlePrefix = event.priority === "high" ? "🔴 " : event.priority === "medium" ? "🟡 " : "";
  const summary = `${titlePrefix}${event.title}`;

  const requestBody: any = {
    summary,
    start: { dateTime: startDateTime, timeZone: "Asia/Karachi" },
    end: { dateTime: endDateTime, timeZone: "Asia/Karachi" },
  };

  if (event.location) {
    requestBody.location = event.location;
  }

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody,
    });

    console.log("✅ Event created!");
    console.log("   Link:", response.data.htmlLink);
    return response.data;
  } catch (err) {
    console.error("❌ Failed to create event:", err);
    throw err;
  }
}

// ---- Run directly to test (hardcoded event) ----
// (async () => {
//   const testEvent: CalendarEvent = {
//     title: "Test Meeting from Agent",
//     date: "2026-06-25",
//     time: "15:00",
//     location: "Conference Room B",
//     priority: "high",
//   };

//   console.log("Creating test event...");
//   console.log(JSON.stringify(testEvent, null, 2));

//   await createCalendarEvent(testEvent);
// })();
