import * as readline from "readline";
import { extractEvent } from "./extract";
import { createCalendarEvent } from "./calendar";

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function run() {
  console.log("=================================");
  console.log("   AI Calendar Agent");
  console.log("=================================\n");

  const userText = await askQuestion("Describe your meeting or event:\n> ");

  if (!userText) {
    console.log("No input provided. Exiting.");
    return;
  }

  console.log("\n⏳ Extracting event details with Gemma...\n");
  const event = await extractEvent(userText);

  if (!event || !event.title || !event.date || !event.time) {
    console.log("❌ Could not extract enough details from your text.");
    console.log("   Try being more specific, e.g. 'Meeting with Ali on Friday at 3 PM'");
    return;
  }

  // Show what was extracted
  console.log("📋 Found event:");
  console.log(`   Title    : ${event.title}`);
  console.log(`   Date     : ${event.date}`);
  console.log(`   Time     : ${event.time}`);
  console.log(`   Location : ${event.location || "Not specified"}`);
  console.log(`   Priority : ${event.priority || "low"}`);
  console.log();

  const confirm = await askQuestion("Add this to Google Calendar? (y/n): ");

  if (confirm === "y" || confirm === "yes") {
    console.log("\n⏳ Creating calendar event...\n");
    await createCalendarEvent(event);
  } else {
    console.log("\nCancelled. Event was not created.");
  }
}

run();
