import "dotenv/config";
import fs from "fs";
import path from "path";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY!,
});

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID!;

export async function generateAudio(
  sceneIndex: number,
  text: string,
  jobId: string
) {
  const outDir = "media/audio/narration";
  fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, `scene_${sceneIndex}_${jobId}.mp3`);
  console.log(`🎙 Generating TTS for scene ${sceneIndex}_${jobId}`);

  const { data, rawResponse } = await client.textToSpeech
    .convert(VOICE_ID, {
      text,
      modelId: "eleven_multilingual_v2",
    })
    .withRawResponse();

  // Save audio
  const chunks: Uint8Array[] = [];
  const reader = data.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const buffer = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)));
  fs.writeFileSync(outFile, buffer);

  // Billing + tracing
  const charCost = rawResponse.headers.get("x-character-count");
  const requestId = rawResponse.headers.get("request-id");

  console.log(
    `🔊 Audio saved: ${outFile} | chars: ${charCost} | request: ${requestId}`
  );

  return {
    file: outFile,
    charCost: Number(charCost ?? 0),
    requestId,
  };
}
