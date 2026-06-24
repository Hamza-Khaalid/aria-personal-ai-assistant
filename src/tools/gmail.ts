import { google } from "googleapis";
import { getAuthClient } from "../auth";

export interface EmailDetails {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(email: EmailDetails) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Gmail API requires the email in base64 encoded RFC 2822 format
  const rawEmail = [
    `To: ${email.to}`,
    `Subject: ${email.subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    ``,
    email.body,
  ].join("\n");

  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedEmail },
  });

  console.log("✅ Email sent!");
  console.log(`   To      : ${email.to}`);
  console.log(`   Subject : ${email.subject}`);

  return response.data;
}

export async function readRecentEmails(maxResults: number = 5) {
  const auth = await getAuthClient();
  const gmail = google.gmail({ version: "v1", auth });

  // Get list of recent emails
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults,
    q: "is:unread",
  });

  const messages = listResponse.data.messages || [];

  if (messages.length === 0) {
    console.log("📭 No unread emails.");
    return [];
  }

  console.log(`📬 You have ${messages.length} unread emails:\n`);

  const emailDetails = [];

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: "me",
      id: msg.id!,
      format: "metadata",
      metadataHeaders: ["From", "Subject", "Date"],
    });

    const headers = detail.data.payload?.headers || [];
    const from = headers.find((h) => h.name === "From")?.value || "Unknown";
    const subject = headers.find((h) => h.name === "Subject")?.value || "No subject";
    const date = headers.find((h) => h.name === "Date")?.value || "";

    console.log(`   From    : ${from}`);
    console.log(`   Subject : ${subject}`);
    console.log(`   Date    : ${date}`);
    console.log();

    emailDetails.push({ from, subject, date });
  }

  return emailDetails;
}
