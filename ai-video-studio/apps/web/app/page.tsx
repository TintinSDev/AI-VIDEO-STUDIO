"use client";

import { useState, useEffect } from "react";
import RenderProgress from "../components/RenderProgress";
import { escape } from "node:querystring";

type RenderStatus =
  | "idle"
  | "queued"
  | "rendering"
  | "assembling"
  | "complete"
  | "failed";
type RenderMode = "full" | "image" | "video" | "audio";

interface HistoryItem {
  id: string;
  url: string;
  thumbnail: string;
  createdAt: string;
  size: string;
}

export default function Page() {
  const [activeMode, setActiveMode] = useState<RenderMode>("full");
  const [script, setScript] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<RenderStatus>("idle");
  const [scenes, setScenes] = useState<any[]>([]);
  const [style, setStyle] = useState("cinematic");
  const [usage, setUsage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [videoTitle, setVideoTitle] = useState("New AI Story");
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState({
    sizeMB: 0,
    formatted: "0 MB",
  });
  const [isApiOnline, setIsApiOnline] = useState<boolean | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // API HEALTH CHECK STATUS MAAATE
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // We point to your health check or just the base API URL
        const res = await fetch("http://localhost:3001/api/health");
        setIsApiOnline(res.ok);
      } catch {
        setIsApiOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // CLIPBOARD COPY UTIL
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast("📋 ID copied to clipboard!"); // Reusing the toast we just built!
    } catch (err) {
      showToast("❌ Failed to copy", "error");
    }
  };
  // LOAD VIDEO SETTINGS UTIL
  // const loadVideoSettings = async (id: string) => {
  //   const res = await fetch(`http://localhost:3001/api/video/${id}`);
  //   const data = await res.json();

  //   setMainPrompt(data.prompt);
  //   setStylePreset(data.style);

  //   // If you add a "Seed" input to your UI:
  //   setManualSeed(data.seed);

  //   showToast(`🔄 Loaded settings! Seed: ${data.seed || "Auto"}`);
  // };
  // FETCH HISTORY
  const fetchHistory = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch history", err);
    }
  };
  useEffect(() => {
    fetchHistory();
  }, [status]);

  const resetState = () => {
    setJobId(null);
    setCurrentJobId(null);
    setStatus("idle");
    setScenes([]);
  };
  // POLLING LOGIC
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/render/${jobId}`);
        if (res.status === 404) {
          setStatus("failed");
          clearInterval(interval);
          return;
        }
        const data = await res.json();
        setStatus(data.status);
        setScenes(data.scenes ?? []);
        if (data.status === "complete" || data.status === "error")
          clearInterval(interval);
      } catch (err) {
        console.warn("Polling error, retrying...");
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  // RENDER FUNCTION
  async function renderVideo(mode: RenderMode = "full") {
    if (!script.trim()) return;
    setActiveMode(mode);
    setStatus("queued");
    setScenes([]);

    try {
      const res = await fetch("http://localhost:3001/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script, style, mode }),
      });
      const data = await res.json();
      if (!data.jobId) {
        setStatus("failed");
        return;
      }
      setJobId(data.jobId);
      setCurrentJobId(data.jobId);
      setStatus("rendering");

      const suggestedTitle = script.split("\n")[0].replace(/[#*]/g, "").trim();
      setVideoTitle(suggestedTitle.substring(0, 95) || "New AI Story");
    } catch (error) {
      console.error("Render initiation failed:", error);
      setStatus("failed");
    }
  }
  // YOUTUBE UPLOAD HANDLER
  const handleUpload = async () => {
    if (!window.confirm("Publish to YouTube?")) return;
    setLoading(true);
    try {
      const response = await fetch("http://localhost:3001/api/upload-youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: currentJobId,
          title: videoTitle,
          description: "Generated by AI Video Studio",
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert("🚀 Published!");
        window.open(`https://youtu.be/${data.videoId}`, "_blank");
      }
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setLoading(false);
    }
  };
  // DELETE HANDLER
  const handleDelete = async (jobId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this video? This cannot be undone."
      )
    )
      return;
    setIsDeleting(jobId);
    try {
      const res = await fetch(`http://localhost:3001/api/history/${jobId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== jobId));
      } else {
        alert("Server couldn't delete the files.");
      }
    } catch (err) {
      alert("Delete failed.");
    } finally {
      setIsDeleting(null);
    }
  };
  // STORAGE STATS FETCH
  const fetchStorageStats = async () => {
    const res = await fetch("http://localhost:3001/api/storage-stats");
    if (res.ok) {
      const data = await res.json();
      setStorageStats(data);
    }
  };

  // Storage stats fetching oon server start or vid deletion
  useEffect(() => {
    fetchStorageStats();
  }, [history]);

  // TOAST AUTO DISMISS
  const showToast = (
    message: string,
    type: "success" | "error" = "success"
  ) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000); // Hide after 5 seconds
  };

  // TOAST ON STATUS CHANGE
  useEffect(() => {
    if (status === "complete") {
      showToast("🎬 Video Rendered Successfully!");
      // These ensure your history and storage bar update immediately
      fetchHistory?.();
      fetchStorageStats?.();
    } else if (status === "failed") {
      showToast("❌ Render Failed. Check server logs.", "error");
    }
  }, [status]);

  {
    /*MAIN RETUUUUUUURN*/
  }
  return (
    <main
      style={{
        padding: 40,
        maxWidth: 900,
        margin: "0 auto",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          zIndex: 1000,
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        <span
          className={isApiOnline ? "status-pulse" : ""}
          style={{
            height: "10px",
            width: "10px",
            backgroundColor:
              isApiOnline === null
                ? "#aaa"
                : isApiOnline
                ? "#52c41a"
                : "#ff4d4f",
            borderRadius: "50%",
            display: "inline-block",
            boxShadow: isApiOnline ? "0 0 8px #52c41a" : "none",
          }}
        />
        {isApiOnline === null
          ? "CONNECTING..."
          : isApiOnline
          ? "SYSTEM ONLINE"
          : "SYSTEM OFFLINE"}
      </div>
      <h1 className="text-4xl font-bold text-gray-600">AI Video Studio</h1>

      <textarea
        rows={10}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 12,
          borderRadius: 8,
          border: "1px solid #ccc",
        }}
        placeholder="Paste script here..."
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />

      <select
        value={style}
        onChange={(e) => setStyle(e.target.value)}
        style={{
          marginTop: 16,
          display: "block",
          padding: "8px",
          borderRadius: 4,
          border: "1px solid #ccc",
          maxWidth: 200,
        }}
      >
        <option value="cinematic">Cinematic</option>
        <option value="documentary">Documentary</option>
        <option value="animation">Animation</option>
        <option value="horror">News</option>
        <option value="bright">Fantasy</option>
        <option value="minimal">Minimal</option>
        <option value="anime_ghibli">Anime Ghibli</option>
        <option value="noir">Noir</option>
        <option value="cyberpunk">Cyberpunk</option>
        <option value="fine_art">Fine Art</option>
      </select>

      <div style={{ marginTop: 24, display: "flex", gap: 12 }}>
        <button
          onClick={() => renderVideo("full")}
          disabled={status === "rendering" || status === "assembling"}
          style={{
            padding: "12px 24px",
            fontWeight: "bold",
            cursor: "pointer",
            background:
              status === "rendering" || status === "assembling"
                ? "#ccc"
                : "#627388",
            borderRadius: 30,
          }}
        >
          {status === "rendering" || status === "assembling"
            ? "🎬 Rendering..."
            : "🎬 One-Click Render"}
        </button>

        {(status === "complete" || status === "failed") && (
          <button onClick={resetState} style={{ padding: "12px 24px" }}>
            🔄 New Project
          </button>
        )}
      </div>

      {/*ADVANCED OPTIONS */}
      <details style={{ marginTop: 16 }} open={status === "idle"}>
        <summary style={{ cursor: "pointer" }}>Advanced options</summary>
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button
            disabled={status !== "idle"}
            onClick={() => renderVideo("image")}
          >
            🖼 Image only
          </button>
          {/* <button
            disabled={status !== "idle"}
            onClick={() => renderVideo("video")}
          >
            🎥 Video only
          </button> */}
          <button
            disabled={status !== "idle"}
            onClick={() => renderVideo("audio")}
          >
            🎙 Audio only
          </button>
        </div>
      </details>

      <hr style={{ margin: "40px 0", opacity: 0.2 }} />

      <RenderProgress
        status={status}
        scene={scenes.filter((s) => s.status === "complete").length}
        total={scenes.length}
      />

      {status === "complete" && (
        <div style={{ marginTop: 32 }}>
          <h3>Final Result:</h3>
          {/* VIDEO VIEW */}
          {(activeMode === "full" || activeMode === "video") && (
            <div key={jobId}>
              <video style={{ width: "100%", borderRadius: 8 }} controls>
                <source
                  src={`http://localhost:3001/media/output/final_${jobId}.mp4?t=${Date.now()}`}
                  type="video/mp4"
                />
              </video>
            </div>
          )}

          {/* AUDIO VIEW */}
          {activeMode === "audio" && (
            <div
              style={{
                padding: 20,
                background: "#f0f0f0",
                borderRadius: 8,
              }}
            >
              <audio controls style={{ width: "100%" }}>
                <source
                  src={`http://localhost:3001/media/output/final_${jobId}.mp3?t=${Date.now()}`}
                  type="audio/mpeg"
                />
              </audio>
              <p style={{ textAlign: "center", marginTop: 10 }}>
                🎙 Narration Audio Generated
              </p>
            </div>
          )}

          {/* IMAGE VIEW */}
          {activeMode === "image" && (
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: 16,
                }}
              >
                {scenes.map((scene, idx) => {
                  const imgUrl = `http://localhost:3001/media/images/scene_${idx}_${jobId}.png?t=${Date.now()}`;
                  return (
                    <div
                      key={idx}
                      style={{
                        border: "1px solid #eee",
                        padding: 8,
                        borderRadius: 8,
                        background: "#fff",
                      }}
                    >
                      <img
                        src={imgUrl}
                        style={{
                          width: "100%",
                          borderRadius: 4,
                          aspectRatio: "16/9",
                          objectFit: "cover",
                        }}
                        alt={`Scene ${idx}`}
                      />
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 12, color: "#666" }}>
                          Scene {idx}
                        </span>
                        <a
                          href={imgUrl}
                          download={`scene_${idx}.png`}
                          style={{ textDecoration: "none" }}
                        >
                          <button
                            style={{
                              padding: "4px 8px",
                              fontSize: 11,
                              cursor: "pointer",
                              background: "#eee",
                              border: "none",
                              borderRadius: 4,
                            }}
                          >
                            ⬇️ Save
                          </button>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div
            style={{
              background: "#f9f9f9",
              padding: 16,
              borderRadius: 8,
              marginTop: 16,
            }}
          >
            <label style={{ fontSize: 12, fontWeight: "bold" }}>
              YouTube Title
            </label>
            <input
              type="text"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              style={{
                width: "100%",
                padding: 8,
                margin: "8px 0 16px 0",
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <a
                href={`http://localhost:3001/media/output/final_${jobId}.mp4?t=${Date.now()}`}
                download
                style={{ textDecoration: "none" }}
              >
                <button
                  style={{ height: 36, padding: "0 16px", cursor: "pointer" }}
                >
                  ⬇️ Download MP4
                </button>
              </a>
              {/* {activeMode === "image" && (
            <button
              onClick={() => {
                scenes.forEach((_, idx) => {
                  const link = document.createElement("a");
                  link.href = `http://localhost:3001/media/images/scene_${idx}_${jobId}.png`;
                  link.download = `scene_${idx}.png`;
                  link.click();
                });
              }}
              style={{
                marginBottom: 16,
                padding: "8px 16px",
                cursor: "pointer",
              }}
            >
              📥 Download All Scenes
            </button>
          )} */}

              <button
                onClick={handleUpload}
                disabled={loading || !currentJobId}
                style={{
                  height: 36,
                  padding: "0 20px",
                  borderRadius: 4,
                  background: loading || !currentJobId ? "#ccc" : "#FF0000",
                  color: "white",
                  fontWeight: "bold",
                  border: "none",
                  cursor: loading || !currentJobId ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Uploading..." : "🚀 Publish to YouTube"}
              </button>
            </div>
          </div>
        </div>
      )}
      <hr
        style={{ margin: "60px 0", border: "0", borderTop: "1px solid #eee" }}
      />
      {/* 📊 STORAGE MONITORING INNIT */}
      <div
        style={{
          background: "#f0f2f5",
          padding: "15px 20px",
          borderRadius: "12px",
          marginBottom: "30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          border: "1px solid #e1e4e8",
        }}
      >
        <div>
          <h4 style={{ margin: 0, color: "#444" }}>Disk Usage</h4>
          <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666" }}>
            Your current media library is using{" "}
            <strong>{storageStats.formatted}</strong>
          </p>
        </div>

        <div style={{ width: "200px" }}>
          <div
            style={{
              height: "8px",
              width: "100%",
              background: "#ddd",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min((storageStats.sizeMB / 2000) * 100, 100)}%`,
                background: storageStats.sizeMB > 1500 ? "#ff4d4f" : "#52c41a",
              }}
            />
          </div>
          <p
            style={{
              fontSize: "11px",
              textAlign: "right",
              marginTop: "4px",
              color: "#999",
            }}
          >
            Target Limit: 2 GB
          </p>
        </div>
      </div>
      {/* <div className="flex gap-2 mb-4">
        <input
          value={lookupId}
          onChange={(e) => setLookupId(e.target.value)}
          placeholder="Paste Video ID to clone settings..."
          className="border p-2 rounded flex-1"
        />
        <button onClick={() => loadVideoSettings(lookupId)}>Load</button>
      </div> */}
      {/* 🎬 HISTORY YY */}
      <section>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>🎥 Production History</h2>
          <button
            onClick={fetchHistory}
            style={{
              background: "none",
              border: "1px solid #ccc",
              borderRadius: 4,
              cursor: "pointer",
              padding: "4px 8px",
            }}
          >
            Refresh
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 20,
            marginTop: 20,
          }}
        >
          {history.length === 0 && (
            <p style={{ color: "#888" }}>No videos found in library.</p>
          )}

          {history.map((video) => (
            <div
              key={video.id}
              style={{
                background: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* ID COPYING HEHE */}
              <div className="flex items-center justify-between">
                {/* <span className="text-xs font-mono text-gray-400">
                  ID: {video.id.slice(0, 8)}...
                </span> */}

                <button
                  onClick={() => copyToClipboard(video.id)}
                  className="copy-btn"
                  title="Copy Full ID"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect
                      x="9"
                      y="9"
                      width="13"
                      height="13"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              {/* Thumbnail Preview */}
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  background: "#222",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={`http://localhost:3001${video.thumbnail}`}
                  alt="Preview"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    position: "absolute",
                    zIndex: 2,
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
                {/* This text/icon shows if the image above fails or is hidden */}
                <span
                  style={{
                    color: "#555",
                    fontSize: "12px",
                    fontWeight: "bold",
                  }}
                >
                  🎬 NO PREVIEW
                </span>
              </div>

              <div style={{ padding: 15 }}>
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    margin: "0 0 4px 0",
                    color: "#333",
                  }}
                >
                  Project {video.id.substring(0, 8)}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    margin: "0 0 10px 0",
                  }}
                >
                  {new Date(video.createdAt).toLocaleString()} • {video.size}
                </p>

                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href={`http://localhost:3001${video.url}`}
                    target="_blank"
                    style={{
                      flex: 1,
                      textAlign: "center",
                      background: "#f0f0f0",
                      color: "#333",
                      padding: "8px",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: "13px",
                    }}
                  >
                    Watch
                  </a>
                  <a
                    href={`http://localhost:3001${video.url}?download=true`}
                    download
                    style={{
                      flex: 1,
                      textAlign: "center",
                      background: "#007bff",
                      color: "#fff",
                      padding: "8px",
                      borderRadius: 6,
                      textDecoration: "none",
                      fontSize: "13px",
                    }}
                  >
                    Download
                  </a>
                  <button
                    onClick={() => handleDelete(video.id)}
                    style={{
                      background: "#fff",
                      color: "#ff4d4f",
                      border: "1px solid #ff4d4f",
                      padding: "8px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: "13px",
                      flex: 0.5,
                    }}
                    title="🗑️ DELETE 🗑️"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            padding: "16px 24px",
            background: toast.type === "success" ? "#1a1a1a" : "#ff4d4f",
            color: "white",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            zIndex: 9999,
            animation: "slideIn 0.3s ease-out",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span style={{ fontSize: "20px" }}>
            {toast.type === "success" ? "✅" : "⚠️"}
          </span>
          <div>
            <div style={{ fontWeight: "bold", fontSize: "14px" }}>
              {toast.type === "success"
                ? "System Notification"
                : "System Error"}
            </div>
            <div style={{ fontSize: "13px", opacity: 0.9 }}>
              {toast.message}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "none",
              border: "none",
              color: "white",
              cursor: "pointer",
              fontSize: "18px",
              marginLeft: "10px",
              opacity: 0.5,
            }}
          >
            ×
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <style jsx>{`
        .copy-btn {
          opacity: 0.5;
          transition: all 0.2s ease;
          padding: 4px;
          border-radius: 6px;
          border: 1px solid transparent;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: inherit;
        }

        .copy-btn:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }

        .copy-btn:active {
          transform: translateY(0);
          background: rgba(0, 0, 0, 0.1);
        }

        /* Optional: Pulsing effect for the Online Status we built earlier */
        .status-pulse {
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </main>
  );
}
