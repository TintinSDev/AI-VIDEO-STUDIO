import { google } from "googleapis";

export async function uploadToYouTube(file, title, description) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YT_CLIENT_ID,
    process.env.YT_CLIENT_SECRET,
    process.env.YT_REDIRECT
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YT_REFRESH_TOKEN
  });

  const youtube = google.youtube({ version: "v3", auth: oauth2Client });

  await youtube.videos.insert({
    part: "snippet,status",
    requestBody: {
      snippet: { title, description },
      status: { privacyStatus: "public" }
    },
    media: {
      body: fs.createReadStream(file)
    }
  });
}
