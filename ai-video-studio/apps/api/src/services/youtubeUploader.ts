import { google } from "googleapis";
import fs from "fs";

const youtube = google.youtube("v3");

export async function uploadToYouTube(
  auth: any,
  videoMetadata: {
    title: string;
    description: string;
    videoPath: string;
    //srtPath: string;
  }
) {
  // 1. Upload the Video
  const videoRes = await youtube.videos.insert({
    auth,
    part: ["snippet", "status"],
    requestBody: {
      snippet: {
        title: videoMetadata.title,
        description: videoMetadata.description,
        categoryId: "22", // People & Blogs
      },
      status: { privacyStatus: "private" }, // Start as private to check quality
    },
    media: { body: fs.createReadStream(videoMetadata.videoPath) },
  });

  const videoId = videoRes.data.id;
  console.log(`✅ Video uploaded! ID: ${videoId}`);

  // 2. Upload the SRT file as a Caption Track
  // if (videoId && fs.existsSync(videoMetadata.srtPath)) {
  //   await youtube.captions.insert({
  //     auth,
  //     part: ["snippet"],
  //     requestBody: {
  //       snippet: {
  //         videoId: videoId,
  //         language: "en",
  //         name: "English Auto-gen",
  //       },
  //     },
  //     media: { body: fs.createReadStream(videoMetadata.srtPath) },
  //   });
  //   console.log(`📜 Captions linked to video.`);
  // }

  return videoId;
}
