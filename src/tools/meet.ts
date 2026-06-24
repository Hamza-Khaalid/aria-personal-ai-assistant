import { google } from "googleapis";
import { getAuthClient } from "../auth";
import { CalendarEvent } from "../extract";

export async function createMeetEvent(event: CalendarEvent) {
  const auth = await getAuthClient();
  const calendar = google.calendar({ version: "v3", auth });

  const startDateTime = `${event.date}T${event.time}:00`;
  const endHour = parseInt(event.time.split(":")[0]) + 1;
  const endMin = event.time.split(":")[1];
  const endTime = `${String(endHour).padStart(2, "0")}:${endMin}`;
  const endDateTime = `${event.date}T${endTime}:00`;

  const titlePrefix = event.priority === "high" ? "🔴 " : event.priority === "medium" ? "🟡 " : "";
  const summary = `${titlePrefix}${event.title}`;

  const requestBody: any = {
    summary,
    start: { dateTime: startDateTime, timeZone: "Asia/Karachi" },
    end: { dateTime: endDateTime, timeZone: "Asia/Karachi" },
    // This is what generates the Google Meet link
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  if (event.location) requestBody.location = event.location;

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody,
    // Must be 1 to generate Meet link
    conferenceDataVersion: 1,
  });

  const meetLink = response.data.conferenceData?.entryPoints?.[0]?.uri || "No link generated";

  console.log("✅ Google Meet created!");
  console.log("   Meet Link :", meetLink);
  console.log("   Event Link:", response.data.htmlLink);

  return {
    eventLink: response.data.htmlLink,
    meetLink,
  };
}
