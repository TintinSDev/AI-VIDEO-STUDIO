import fetch from "node-fetch";
import fs from "fs";
import path from "path";

const API_BASE = "https://api.krea.ai";
const API_TOKEN = process.env.KREA_API_KEY!;

export async function generateImageKrea(
  sceneIndex: number,
  prompt: string
): Promise<string> {
  console.log(`🖼️ Krea generating image ${sceneIndex}`);

  const res = await fetch(`${API_BASE}/generate/image/bfl/flux-1-dev`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt, // 🔥 frontend prompt
      width: 1024,
      height: 576,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Krea API failed: ${text}`);
  }

  const job = await res.json();

  if (!job?.job_id) {
    throw new Error("Krea did not return job_id");
  }

  // ⚠️ Krea is async — poll result
  return await pollKreaJob(job.job_id, sceneIndex);
}

async function pollKreaJob(jobId: string, sceneIndex: number) {
  const outDir = "media/images";
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));

    const res = await fetch(`${API_BASE}/job/${jobId}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });

    const data = await res.json();

    if (data.status === "completed" && data.image_url) {
      const imgRes = await fetch(data.image_url);
      const buffer = Buffer.from(await imgRes.arrayBuffer());

      const file = path.join(outDir, `scene_${sceneIndex}.png`);
      fs.writeFileSync(file, buffer);

      console.log(`✅ Krea image saved: ${file}`);
      return file;
    }

    if (data.status === "failed") {
      throw new Error("Krea image generation failed");
    }
  }

  throw new Error("Krea image generation timeout");
}
