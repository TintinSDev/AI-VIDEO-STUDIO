// import "dotenv/config";
// import fs from "fs";
// import path from "path";
// import { VideoProvider } from "../videoProvider";
// import { VertexAI } from "@google-cloud/vertexai";

// const projectId = process.env.GCP_PROJECT_ID!;
// const location = process.env.GCP_LOCATION!;

// const vertexAI = new VertexAI({
//   project: projectId,
//   location,
// });

// export class Veo3Provider implements VideoProvider {
//   async generateVideo(sceneIndex: number, prompt: string) {
//     const outDir = "media/video/scenes";
//     fs.mkdirSync(outDir, { recursive: true });

//     const outFile = path.join(outDir, `scene_${sceneIndex}.mp4`);

//     console.log(`🎥 Veo 3 generating scene ${sceneIndex}`);
//     console.log("Prompt:", prompt);

//     // ⚠️ Veo is under generative media models
//     const model = vertexAI.getGenerativeModel({
//       model: "veo-3",
//     });

//     // 1️⃣ Submit generation request
//     const response = await model.generateContent({
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: prompt }],
//         },
//       ],
//       generationConfig: {
//         videoDurationSeconds: 5,
//         aspectRatio: "16:9",
//         motionStyle: "cinematic",
//         cameraMotion: "smooth",
//       },
//     });

//     /**
//      * Veo returns a URI to the generated video
//      * (GCS or signed URL)
//      */
//     const videoUri =
//       response.response.candidates?.[0]?.content?.parts?.[0]?.fileUri;

//     if (!videoUri) {
//       throw new Error("Veo3 did not return a video URI");
//     }

//     // 2️⃣ Download video
//     const res = await fetch(videoUri);
//     if (!res.ok) {
//       throw new Error("Failed to download Veo3 video");
//     }

//     const buffer = Buffer.from(await res.arrayBuffer());
//     fs.writeFileSync(outFile, buffer);

//     console.log(`🎞 Veo3 video saved: ${outFile}`);

//     return {
//       file: outFile,
//       duration: 25,
//       requestId: response.response.requestId,
//     };
//   }
// }
