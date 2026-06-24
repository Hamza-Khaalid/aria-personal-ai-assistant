import { google } from "googleapis";
import { getAuthClient } from "../auth";

export interface TaskItem {
  title: string;
  notes?: string;
  due?: string; // YYYY-MM-DD
  priority?: "low" | "medium" | "high";
}

export async function createTask(task: TaskItem) {
  const auth = await getAuthClient();
  const tasksApi = google.tasks({ version: "v1", auth });

  // Get the default task list
  const listsResponse = await tasksApi.tasklists.list();
  const taskListId = listsResponse.data.items?.[0]?.id || "@default";

  const requestBody: any = {
    title: task.title,
  };

  if (task.notes) requestBody.notes = task.notes;

  // Google Tasks API requires RFC 3339 format for due date
  if (task.due) {
    requestBody.due = `${task.due}T00:00:00.000Z`;
  }

  const response = await tasksApi.tasks.insert({
    tasklist: taskListId,
    requestBody,
  });

  console.log("✅ Task created!");
  console.log("   Title:", response.data.title);
  if (task.due) console.log("   Due  :", task.due);

  return response.data;
}

export async function listTasks() {
  const auth = await getAuthClient();
  const tasksApi = google.tasks({ version: "v1", auth });

  const listsResponse = await tasksApi.tasklists.list();
  const taskListId = listsResponse.data.items?.[0]?.id || "@default";

  const response = await tasksApi.tasks.list({
    tasklist: taskListId,
    showCompleted: false,
  });

  const tasks = response.data.items || [];

  if (tasks.length === 0) {
    console.log("📋 No pending tasks.");
    return [];
  }

  console.log("📋 Your pending tasks:");
  tasks.forEach((t, i) => {
    const due = t.due ? ` (due: ${t.due.split("T")[0]})` : "";
    console.log(`   ${i + 1}. ${t.title}${due}`);
  });

  return tasks;
}
