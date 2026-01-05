import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import RunwayML from "@runwayml/sdk";
import { generateImageKrea } from "./providers/krea";
import { generateImageNanoBanana } from "./providers/nanobanana";

export type ImageProvider = "runway" | "krea" | "nanobanana" | "auto" | "mock";

/**
 * Generates an image and saves it to a unique path using jobId.
 * Ensure the calling function passes: (sceneIndex, jobId, prompt, provider)
 */
export async function generateImage(
  sceneIndex: number,
  jobId: string | number, // Ensure this is a short ID/Timestamp, not the prompt!
  prompt: string,
  provider: ImageProvider = (process.env.IMAGE_PROVIDER as ImageProvider) ||
    "auto"
) {
  const outDir = path.resolve(process.cwd(), "media/images");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // 1. Create a SAFE filename using only Index and JobId
  const outFile = path.join(outDir, `scene_${sceneIndex}_${jobId}.png`);

  console.log(`🎨 Generating image ${sceneIndex} using [${provider}]...`);
  console.log(`📁 Output file: ${outFile}`);

  let imageUrl: string;

  try {
    switch (provider) {
      case "mock":
        imageUrl = `https://placehold.co/1280x720?text=Scene+${sceneIndex}`;
        break;
      case "krea":
        imageUrl = await generateImageKrea(sceneIndex, prompt);
        break;
      case "nanobanana":
        imageUrl = await generateImageNanoBanana(sceneIndex, prompt);
        break;
      case "runway":
        imageUrl = await callRunway(prompt);
        break;
      case "auto":
      default:
        try {
          console.log("尝试 Krea...");
          imageUrl = await generateImageKrea(sceneIndex, prompt);
        } catch (err) {
          try {
            console.warn("⚠️ Krea failed, falling back to NanoBanana");
            imageUrl = await generateImageNanoBanana(sceneIndex, prompt);
          } catch (nanoErr) {
            console.error(
              "🚨 Paid APIs failed. Using Pollinations Public Fallback."
            );

            // 2. CLEAN THE PROMPT: Remove newlines and extra spaces for the URL
            const cleanPrompt = encodeURIComponent(
              prompt.replace(/\n/g, " ").replace(/\s+/g, " ").trim()
            );
            imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1280&height=720&nologo=true&seed=${sceneIndex}`;
          }
        }
        break;
    }

    console.log(`🔗 Downloading image...`);
    const res = await fetch(imageUrl);

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status} when fetching image URL`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Save to the short, clean path
    fs.writeFileSync(outFile, buffer);

    console.log(
      `✅ Image saved successfully: scene_${sceneIndex}_${jobId}.png`
    );
    return outFile;
  } catch (error) {
    console.error(
      `❌ Image Generation Error (Scene ${sceneIndex}):`,
      error.message
    );
    throw error;
  }
}

/**
 * Helper for Runway
 */
async function callRunway(prompt: string): Promise<string> {
  const apiKey = process.env.RUNWAY_API_KEY || process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error("RUNWAY_API_KEY is missing in .env");

  const runway = new RunwayML({ apiKey });

  const task = await runway.textToImage.create({
    model: "gen3a_turbo",
    promptText: prompt,
    ratio: "1280:720",
  });

  let url = null;
  while (!url) {
    const result = await runway.tasks.retrieve(task.id);
    if (result.status === "FAILED") throw new Error("Runway task failed");
    if (result.status === "SUCCEEDED") {
      url = result.output?.[0];
      break;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return url;
}
