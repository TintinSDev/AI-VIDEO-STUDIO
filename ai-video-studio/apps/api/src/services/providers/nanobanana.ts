import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const BASE_URL = "https://api.nanobananaapi.ai/api/v1/nanobanana";
const API_KEY = process.env.NANOBANANA_API_KEY!;

export async function generateImageNanoBanana(
  sceneIndex: number,
  prompt: string
): Promise<string> {
  console.log(`🍌 NanoBanana generating image ${sceneIndex}`);

  // 1️⃣ Start generation
  const startRes = await fetch(`${BASE_URL}/generate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      type: "TEXTTOIMAGE", // Fixed typo from 'IAMGE'
      numImages: 1,
    }),
  });

  const startData: any = await startRes.json();

  if (!startRes.ok || startData.code !== 200) {
    throw new Error(startData.msg || "NanoBanana start failed");
  }

  const taskId = startData.data.taskId;

  // 2️⃣ Poll status
  return await pollNanoBanana(taskId, sceneIndex);
}

async function pollNanoBanana(taskId: string, sceneIndex: number) {
  const outDir = path.resolve(process.cwd(), "media/images");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const start = Date.now();

  while (Date.now() - start < 5 * 60 * 1000) {
    await new Promise((r) => setTimeout(r, 3000));

    const response = await fetch(`${BASE_URL}/record-info?taskId=${taskId}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });

    const statusData: any = await response.json();
    console.log(
      `🔍 Polling NanoBanana (Scene ${sceneIndex}):`,
      statusData.successFlag
    );

    if (statusData.successFlag === 1) {
      const imageUrl = statusData.response?.resultImageUrl;
      if (!imageUrl) throw new Error("NanoBanana returned no image URL");

      const imgRes = await fetch(imageUrl);
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      const outFile = path.join(outDir, `scene_${sceneIndex}.png`);
      fs.writeFileSync(outFile, buffer);

      console.log(`✅ NanoBanana image saved: ${outFile}`);
      return outFile;
    }

    if (statusData.successFlag === 2 || statusData.successFlag === 3) {
      throw new Error(statusData.errorMessage || "NanoBanana failed");
    }
  }

  throw new Error("NanoBanana generation timeout");
} // <-- This was likely the missing brace!
