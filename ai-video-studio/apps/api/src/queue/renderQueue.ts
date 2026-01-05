import { Queue, Worker } from "bullmq";
import { renderPipeline } from "../renderPipeline";

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

export const renderQueue = new Queue("render", {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  },
});

let workerStarted = false;

if (!workerStarted) {
  workerStarted = true;

  new Worker(
    "render",
    async (job) => {
      await renderPipeline(job.id as string, job.data.script, {
        planLimitUSD: 10,
      });
    },
    {
      connection: { host: REDIS_HOST, port: REDIS_PORT },
    }
  );
}
