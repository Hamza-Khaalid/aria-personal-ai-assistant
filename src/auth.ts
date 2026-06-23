import { google } from "googleapis";
import * as fs from "fs";
import * as readline from "readline";
import dotenv from "dotenv";

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const CREDENTIALS_PATH = process.env.GOOGLE_CREDENTIALS_PATH || "./credentials.json";
const TOKEN_PATH = process.env.GOOGLE_TOKEN_PATH || "./token.json";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob";

export async function getAuthClient() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error(`credentials.json not found at ${CREDENTIALS_PATH}`);
  }

  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const { client_secret, client_id } = credentials.installed || credentials.web;

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
  }

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("\nOpen this URL in your browser:\n");
  console.log(authUrl);
  console.log("\nAfter authorizing, Google will show you a code on the page.");
  console.log("Copy that code and paste it here.\n");

  const code = await askQuestion("Paste the code: ");
  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);

  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ Token saved!");

  return oAuth2Client;
}

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