import * as readline from "readline";
import { decideTool, chatWithAria } from "./selector";
import { extractEvent, extractTask, extractEmail, extractTravelDetails } from "./extract";
import { createCalendarEvent } from "./tools/calendar";
import { createMeetEvent } from "./tools/meet";
import { createTask, listTasks } from "./tools/tasks";
import { sendEmail, readRecentEmails } from "./tools/gmail";
import { getTravelTime, adjustEventTime } from "./tools/maps";

// Conversation history for context-aware chat
const conversationHistory: { role: string; content: string }[] = [];

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function run() {
  console.log("\n╔════════════════════════════════════╗");
  console.log("║         Aria — AI Assistant         ║");
  console.log("╚════════════════════════════════════╝");
  console.log("\nHi! I'm Aria, your personal AI assistant.");
  console.log("I can manage your calendar, tasks, emails, meetings,");
  console.log("calculate travel time, and have a normal conversation.");
  console.log('Type "exit" to quit.\n');

  while (true) {
    const userText = await askQuestion("You: ");

    if (!userText) continue;
    if (userText.toLowerCase() === "exit") {
      console.log("\nAria: Goodbye! Have a great day. 👋\n");
      break;
    }

    // Add to history
    conversationHistory.push({ role: "user", content: userText });

    console.log("\n⏳ Thinking...");
    const decision = await decideTool(userText);
    console.log(`[Tool: ${decision.tool}]\n`);

    try {
      switch (decision.tool) {

        // ── Calendar Event ──────────────────────────────
        case "create_event": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time) {
            console.log("Aria: I couldn't extract enough details. Could you tell me the event title, date, and time?\n");
            break;
          }
          console.log("Aria: Here's what I found:\n");
          console.log(`   📌 Title    : ${event.title}`);
          console.log(`   📅 Date     : ${event.date}`);
          console.log(`   🕐 Time     : ${event.time}`);
          console.log(`   📍 Location : ${event.location || "Not specified"}`);
          console.log(`   🔴 Priority : ${event.priority || "low"}\n`);

          const confirm = await askQuestion("Aria: Should I add this to your Google Calendar? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createCalendarEvent(event);
            console.log("Aria: Done! Event has been added to your calendar. ✅\n");
            conversationHistory.push({ role: "assistant", content: `Created calendar event: ${event.title} on ${event.date} at ${event.time}` });
          } else {
            console.log("Aria: No problem, I've cancelled that.\n");
          }
          break;
        }

        // ── Event with Travel ───────────────────────────
        case "create_event_with_travel": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time || !event.location) {
            console.log("Aria: I need a bit more detail — what's the event, when is it, and where exactly?\n");
            break;
          }

          const origin = await askQuestion("Aria: What's your starting location (home/office address)? ");

          console.log(`\n⏳ Calculating travel time from ${origin} to ${event.location}...\n`);
          const travel = await getTravelTime(origin, event.location);

          if (!travel) {
            console.log("Aria: I couldn't calculate travel time, but I'll still add the event.\n");
            await createCalendarEvent(event);
            break;
          }

          const leaveTime = adjustEventTime(event.time, travel.durationMinutes);

          console.log(`Aria: Got it! Here's the plan:\n`);
          console.log(`   📍 Event    : ${event.title}`);
          console.log(`   📅 Date     : ${event.date}`);
          console.log(`   🕐 Event at : ${event.time}`);
          console.log(`   🚗 Distance : ${travel.distanceText} (${travel.durationText})`);
          console.log(`   ⏰ Leave by : ${leaveTime}\n`);
          console.log(`   I'll create two entries:`);
          console.log(`   1. 🚗 "Leave for ${event.title}" at ${leaveTime}`);
          console.log(`   2. 📍 "${event.title}" at ${event.time}\n`);

          const confirm = await askQuestion("Aria: Should I add both to your calendar? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createCalendarEvent({
              title: `🚗 Leave for ${event.title}`,
              date: event.date,
              time: leaveTime,
              priority: "high",
            });
            await createCalendarEvent(event);
            console.log(`\nAria: All set! Don't forget to leave by ${leaveTime}. ✅\n`);
            conversationHistory.push({ role: "assistant", content: `Created event with travel: ${event.title} at ${event.location}. Leave by ${leaveTime}.` });
          } else {
            console.log("Aria: Cancelled. Let me know if you need anything else.\n");
          }
          break;
        }

        // ── Google Meet ─────────────────────────────────
        case "create_meet": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time) {
            console.log("Aria: I need the meeting title, date, and time to set this up. Can you give me those?\n");
            break;
          }
          console.log("Aria: Here's the meeting I'll create:\n");
          console.log(`   🎥 Title : ${event.title}`);
          console.log(`   📅 Date  : ${event.date}`);
          console.log(`   🕐 Time  : ${event.time}\n`);

          const confirm = await askQuestion("Aria: Should I create this Google Meet? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            const result = await createMeetEvent(event);
            console.log(`\nAria: Meeting created! Here's the link to share:\n`);
            console.log(`   🔗 ${result.meetLink}\n`);
            conversationHistory.push({ role: "assistant", content: `Created Google Meet: ${event.title} on ${event.date} at ${event.time}. Link: ${result.meetLink}` });
          } else {
            console.log("Aria: Got it, cancelled.\n");
          }
          break;
        }

        // ── Create Task ─────────────────────────────────
        case "create_task": {
          const task = await extractTask(userText);
          if (!task || !task.title) {
            console.log("Aria: What's the task you'd like me to add?\n");
            break;
          }
          console.log("Aria: Here's the task:\n");
          console.log(`   ✅ Task : ${task.title}`);
          console.log(`   📅 Due  : ${task.due || "No deadline"}`);
          console.log(`   📝 Note : ${task.notes || "None"}\n`);

          const confirm = await askQuestion("Aria: Add this to Google Tasks? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createTask(task);
            console.log("Aria: Task added! I'll make sure it's on your list. ✅\n");
            conversationHistory.push({ role: "assistant", content: `Added task: ${task.title}` });
          } else {
            console.log("Aria: No problem, cancelled.\n");
          }
          break;
        }

        // ── List Tasks ──────────────────────────────────
        case "list_tasks": {
          console.log("Aria: Let me pull up your tasks...\n");
          await listTasks();
          console.log();
          break;
        }

        // ── Send Email ──────────────────────────────────
        case "send_email": {
          const email = await extractEmail(userText);
          if (!email || !email.to || !email.subject) {
            console.log("Aria: Who should I email and about what?\n");
            break;
          }
          console.log("Aria: Here's the email I'll send:\n");
          console.log(`   📧 To      : ${email.to}`);
          console.log(`   📌 Subject : ${email.subject}`);
          console.log(`   📝 Body    :\n`);
          console.log(`${email.body}\n`);

          const confirm = await askQuestion("Aria: Should I send this email? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await sendEmail(email);
            console.log("Aria: Email sent! ✅\n");
            conversationHistory.push({ role: "assistant", content: `Sent email to ${email.to} with subject: ${email.subject}` });
          } else {
            console.log("Aria: Cancelled. Let me know if you want to change anything.\n");
          }
          break;
        }

        // ── Read Emails ─────────────────────────────────
        case "read_emails": {
          console.log("Aria: Checking your inbox...\n");
          await readRecentEmails(5);
          console.log();
          break;
        }

        // ── Check Distance ──────────────────────────────
        case "check_distance": {
          const travel = await extractTravelDetails(userText);
          if (!travel || !travel.origin || !travel.destination) {
            console.log("Aria: Could you tell me the two locations you want to compare?\n");
            break;
          }

          console.log(`\n⏳ Calculating...\n`);
          const result = await getTravelTime(travel.origin, travel.destination);

          if (result) {
            console.log(`Aria: Here's the travel info:\n`);
            console.log(`   🚗 From     : ${result.origin}`);
            console.log(`   📍 To       : ${result.destination}`);
            console.log(`   📏 Distance : ${result.distanceText}`);
            console.log(`   ⏱️  Duration : ${result.durationText}\n`);
            conversationHistory.push({ role: "assistant", content: `Travel from ${result.origin} to ${result.destination}: ${result.distanceText}, ${result.durationText}` });
          } else {
            console.log("Aria: Sorry, I couldn't find a route between those locations.\n");
          }
          break;
        }

        // ── General Conversation ────────────────────────
        default: {
          const reply = await chatWithAria(userText, conversationHistory.slice(-10));
          console.log(`\nAria: ${reply}\n`);
          conversationHistory.push({ role: "assistant", content: reply });
        }
      }
    } catch (err: any) {
      console.error(`\nAria: Something went wrong — ${err.message || err}\n`);
    }
  }
}

run();