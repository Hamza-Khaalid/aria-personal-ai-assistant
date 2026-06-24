import * as readline from "readline";
import { runAgent } from "./selector";
import { extractEvent, extractTask, extractEmail, extractTravelDetails } from "./extract";
import { createCalendarEvent } from "./tools/calendar";
import { createMeetEvent } from "./tools/meet";
import { createTask, listTasks } from "./tools/tasks";
import { sendEmail, readRecentEmails } from "./tools/gmail";
import { getTravelTime, adjustEventTime } from "./tools/maps";

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
  console.log("╚════════════════════════════════════╝\n");
  console.log("Aria: Hi! I'm Aria, your personal AI assistant.");
  console.log("      I can manage your calendar, tasks, emails,");
  console.log("      meetings, and have a normal conversation.");
  console.log('      Type "exit" to quit.\n');

  while (true) {
    const userText = await askQuestion("You: ");

    if (!userText) continue;
    if (userText.toLowerCase() === "exit") {
      console.log("\nAria: Goodbye! Have a great day. 👋\n");
      break;
    }

    // Add user message to history
    conversationHistory.push({ role: "user", content: userText });

    // Single LLM call — decides tool OR chats directly
    const decision = await runAgent(userText, conversationHistory);

    try {
      switch (decision.tool) {

        // ── Direct Chat Response ────────────────────────
        case "none": {
          console.log(`\nAria: ${decision.reply}\n`);
          conversationHistory.push({ role: "assistant", content: decision.reply || "" });
          break;
        }

        // ── Calendar Event ──────────────────────────────
        case "create_event": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time) {
            console.log("\nAria: I couldn't get enough details. Could you tell me the event title, date, and time?\n");
            break;
          }
          console.log("\nAria: Here's what I found:\n");
          console.log(`   📌 Title    : ${event.title}`);
          console.log(`   📅 Date     : ${event.date}`);
          console.log(`   🕐 Time     : ${event.time}`);
          console.log(`   📍 Location : ${event.location || "Not specified"}`);
          console.log(`   🔺 Priority : ${event.priority || "low"}\n`);

          const confirm = await askQuestion("Aria: Should I add this to your Google Calendar? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createCalendarEvent(event);
            const msg = `Created calendar event: ${event.title} on ${event.date} at ${event.time}`;
            console.log("\nAria: Done! Event added to your calendar. ✅\n");
            conversationHistory.push({ role: "assistant", content: msg });
          } else {
            console.log("\nAria: No problem, cancelled.\n");
          }
          break;
        }

        // ── Event with Travel ───────────────────────────
        case "create_event_with_travel": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time || !event.location) {
            console.log("\nAria: I need the event name, date, time, and location. Can you give me those?\n");
            break;
          }

          const origin = await askQuestion("\nAria: What's your starting location? ");
          console.log(`\n⏳ Calculating travel time...\n`);
          const travel = await getTravelTime(origin, event.location);

          if (!travel) {
            console.log("Aria: Couldn't calculate travel time, adding event at original time.\n");
            await createCalendarEvent(event);
            break;
          }

          const leaveTime = adjustEventTime(event.time, travel.durationMinutes);

          console.log(`\nAria: Here's the plan:\n`);
          console.log(`   📌 Event    : ${event.title}`);
          console.log(`   📅 Date     : ${event.date}`);
          console.log(`   🕐 At       : ${event.time}`);
          console.log(`   🚗 Drive    : ${travel.distanceText} — ${travel.durationText}`);
          console.log(`   ⏰ Leave by : ${leaveTime}\n`);
          console.log(`   I'll create two entries:`);
          console.log(`   1. 🚗 "Leave for ${event.title}" at ${leaveTime}`);
          console.log(`   2. 📍 "${event.title}" at ${event.time}\n`);

          const confirm = await askQuestion("Aria: Add both to your calendar? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createCalendarEvent({
              title: `🚗 Leave for ${event.title}`,
              date: event.date,
              time: leaveTime,
              priority: "high",
            });
            await createCalendarEvent(event);
            const msg = `Created event with travel: ${event.title} at ${event.location}. Leave by ${leaveTime}.`;
            console.log(`\nAria: All set! Don't forget to leave by ${leaveTime}. ✅\n`);
            conversationHistory.push({ role: "assistant", content: msg });
          } else {
            console.log("\nAria: Cancelled.\n");
          }
          break;
        }

        // ── Google Meet ─────────────────────────────────
        case "create_meet": {
          const event = await extractEvent(userText);
          if (!event || !event.title || !event.date || !event.time) {
            console.log("\nAria: I need the meeting title, date, and time. Can you share those?\n");
            break;
          }
          console.log("\nAria: Here's the meeting:\n");
          console.log(`   🎥 Title : ${event.title}`);
          console.log(`   📅 Date  : ${event.date}`);
          console.log(`   🕐 Time  : ${event.time}\n`);

          const confirm = await askQuestion("Aria: Create this Google Meet? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            const result = await createMeetEvent(event);
            const msg = `Created Google Meet: ${event.title} on ${event.date} at ${event.time}. Link: ${result.meetLink}`;
            console.log(`\nAria: Done! Here's the link to share:\n`);
            console.log(`   🔗 ${result.meetLink}\n`);
            conversationHistory.push({ role: "assistant", content: msg });
          } else {
            console.log("\nAria: Cancelled.\n");
          }
          break;
        }

        // ── Create Task ─────────────────────────────────
        case "create_task": {
          const task = await extractTask(userText);
          if (!task || !task.title) {
            console.log("\nAria: What task would you like me to add?\n");
            break;
          }
          console.log("\nAria: Here's the task:\n");
          console.log(`   ✅ Task : ${task.title}`);
          console.log(`   📅 Due  : ${task.due || "No deadline"}`);
          console.log(`   📝 Note : ${task.notes || "None"}\n`);

          const confirm = await askQuestion("Aria: Add to Google Tasks? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await createTask(task);
            console.log("\nAria: Task added! ✅\n");
            conversationHistory.push({ role: "assistant", content: `Added task: ${task.title}` });
          } else {
            console.log("\nAria: Cancelled.\n");
          }
          break;
        }

        // ── List Tasks ──────────────────────────────────
        case "list_tasks": {
          console.log("\nAria: Let me check your tasks...\n");
          await listTasks();
          console.log();
          break;
        }

        // ── Send Email ──────────────────────────────────
        case "send_email": {
          const email = await extractEmail(userText);
          if (!email || !email.to || !email.subject) {
            console.log("\nAria: Who should I email and about what?\n");
            break;
          }
          console.log("\nAria: Here's the email:\n");
          console.log(`   📧 To      : ${email.to}`);
          console.log(`   📌 Subject : ${email.subject}`);
          console.log(`   📝 Body    :\n\n${email.body}\n`);

          const confirm = await askQuestion("Aria: Send this email? (y/n): ");
          if (confirm === "y" || confirm === "yes") {
            await sendEmail(email);
            console.log("\nAria: Email sent! ✅\n");
            conversationHistory.push({ role: "assistant", content: `Sent email to ${email.to}: ${email.subject}` });
          } else {
            console.log("\nAria: Cancelled.\n");
          }
          break;
        }

        // ── Read Emails ─────────────────────────────────
        case "read_emails": {
          console.log("\nAria: Checking your inbox...\n");
          await readRecentEmails(5);
          console.log();
          break;
        }

        // ── Check Distance ──────────────────────────────
        case "check_distance": {
          const travel = await extractTravelDetails(userText);
          if (!travel || !travel.origin || !travel.destination) {
            console.log("\nAria: What are the two locations you want to compare?\n");
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
            console.log("\nAria: Sorry, couldn't find a route between those locations.\n");
          }
          break;
        }
      }
    } catch (err: any) {
      console.error(`\nAria: Something went wrong — ${err.message || err}\n`);
    }
  }
}

run();