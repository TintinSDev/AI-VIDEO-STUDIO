import fs from "fs";
import { google } from "googleapis";
import readline from "readline";
import http from "http";
import url from "url";

const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const TOKEN_PATH = "token.json";

export async function getAuthClient() {
  const content = fs.readFileSync("client_secret.json", "utf8");
  const { client_secret, client_id, redirect_uris } = JSON.parse(content).web;
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  );

  if (fs.existsSync(TOKEN_PATH)) {
    const token = fs.readFileSync(TOKEN_PATH, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  }

  // If no token exists, we need to generate a new one via the terminal
  return getNewToken(oAuth2Client);
}

async function getNewToken(oAuth2Client: any) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("🚀 Authorize this app by visiting this url:", authUrl);

  // --- AUTOMATED CAPTURE START ---
  const code = await new Promise<string>((resolve) => {
    const server = http
      .createServer(async (req, res) => {
        try {
          if (req.url?.indexOf("/oauth2callback") > -1) {
            const qs = new url.URL(req.url, "http://localhost:3001")
              .searchParams;
            const code = qs.get("code");

            res.writeHead(200, { "Content-Type": "text/html" });
            res.end(`
              <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                <h1 style="color: #2ecc71;">✅ Authentication Successful!</h1>
                <p>You can close this tab and return to your terminal.</p>
              </div>
            `);

            server.close();
            resolve(code as string);
          }
        } catch (e) {
          console.error("Callback error:", e);
        }
      })
      .listen(3001);
  });
  // --- AUTOMATED CAPTURE END ---

  // Exchange the code for a token
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);

  // Save the token for future use
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ Token stored to", TOKEN_PATH);

  return oAuth2Client;
}
