import { Server } from "socket.io";

let io: Server;

export function initSocket(httpServer: any) {
  io = new Server(httpServer, {
    cors: { origin: "*" }
  });
}

export function emitProgress(
  jobId: string,
  payload: {
    status: string;
    scene?: number;
    totalScenes?: number;
  }
) {
  if (!io) return;
  io.emit(`render:${jobId}`, payload);
}
