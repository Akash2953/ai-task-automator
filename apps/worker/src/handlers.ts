import type { Job } from "@ata/db";

export async function runHandler(job: Job): Promise<{ message: string }> {
  if (job.handler === "reminder") {
    const when = new Date().toLocaleString();
    return {
      message: `Reminder: ${job.title} (fired at ${when})`,
    };
  }
  return { message: `No-op handler for ${job.handler}` };
}
