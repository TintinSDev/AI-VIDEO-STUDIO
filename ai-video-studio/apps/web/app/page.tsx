"use client";

import { useState, useEffect } from "react";
import RenderProgress from "../components/RenderProgress";
import { HistoryCard } from "../components/HistoryCard";
import { cn } from "../lib/utils";
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
    <div>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(var(--color-neon-purple) 1px, transparent 1px), 
                        linear-gradient(90deg, var(--color-neon-purple) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            maskImage:
              "radial-gradient(ellipse at center, black, transparent 80%)",
          }}
        />
      </div>
      <main
        style={{
          padding: 40,
          maxWidth: 1000,
          margin: "0 auto",
          fontFamily: "sans-serif",
        }}
      >
        <div className="fixed top-6 right-6 z-[1000] flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-950/40 border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] group hover:border-purple-500/50 transition-all duration-500">
          <div className="relative flex h-3 w-3">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isApiOnline === null
                  ? "bg-slate-500"
                  : isApiOnline
                  ? "animate-ping bg-cyan-400"
                  : "bg-pink-600"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${
                isApiOnline === null
                  ? "bg-slate-400"
                  : isApiOnline
                  ? "bg-cyan-500 shadow-[0_0_15px_#22d3ee]"
                  : "bg-pink-500 shadow-[0_0_15px_#ec4899]"
              }`}
            />
          </div>

          <span
            className={`text-[10px] font-black tracking-[0.2em] uppercase font-mono transition-colors duration-500 ${
              isApiOnline === null
                ? "text-slate-500"
                : isApiOnline
                ? "text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]"
                : "text-pink-500 animate-pulse"
            }`}
          >
            {isApiOnline === null
              ? "Establishing_Link..."
              : isApiOnline
              ? "System_Online"
              : "Connection_Lost"}
          </span>

          <div className="absolute bottom-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-purple-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
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

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="h-12 px-4 rounded-full bg-slate-900 border border-purple-500/30 text-purple-100 text-sm font-bold tracking-tight focus:outline-none focus:border-pink-500/50 transition-all cursor-pointer shadow-[0_0_10px_rgba(168,85,247,0.1)]"
          >
            <option value="cinematic">Cinematic</option>
            <option value="documentary">Documentary</option>
            <option value="animation">Animation</option>
            <option value="horror">Horror</option>
            <option value="bright">Fantasy</option>
            <option value="minimal">Minimal</option>
            <option value="anime_ghibli">Anime Ghibli</option>
            <option value="noir">Noir</option>
            <option value="cyberpunk">Cyberpunk</option>
            <option value="fine_art">Fine Art</option>
          </select>

          <button
            onClick={() => renderVideo("full")}
            disabled={status === "rendering" || status === "assembling"}
            className={cn(
              "h-12 px-8 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 active:scale-95 flex items-center gap-2",
              status === "rendering" || status === "assembling"
                ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                : "bg-[#1C0333] text-pink-500 border border-pink-500/50 hover:bg-pink-500/10 hover:shadow-[0_0_20px_rgba(236,72,153,0.3)] shadow-[0_0_10px_rgba(28,3,51,0.5)] cursor-pointer"
            )}
          >
            {status === "rendering" || status === "assembling" ? (
              <>
                <span className="animate-spin text-lg">⏳</span> Rendering...
              </>
            ) : (
              <>
                <span className="text-lg"></span> Generate Prompt
              </>
            )}
          </button>

          {(status === "complete" || status === "failed") && (
            <button
              onClick={resetState}
              className="h-12 px-6 rounded-full bg-slate-950/40 border border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 hover:bg-cyan-500/10 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all active:scale-95 animate-in fade-in zoom-in duration-500"
            >
              <span className="text-sm"></span> Reset Archive
            </button>
          )}
        </div>

        <details style={{ marginTop: 16 }} open={status === "idle"}>
          <summary style={{ cursor: "pointer" }}>Advanced options</summary>
          <div
            style={{
              display: "flex",
              gap: 60,
              marginTop: 12,
              border: "1px solid #444",
              padding: 10,
              width: "fit-content",
              borderRadius: 8,
            }}
          >
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

            {activeMode === "image" && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(200px, 1fr))",
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
                          background: "#1C0333",
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
                                fontSize: 14,
                                cursor: "pointer",
                                background: "#1C0333",
                                border: "none",
                                borderRadius: 4,
                              }}
                            >
                              ⬇ Save
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
                background: "#1C0333",
                padding: 16,
                borderRadius: 8,
                marginTop: 16,
              }}
            >
              <label style={{ fontSize: 18, fontWeight: "bold" }}>
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
                  border: "1px solid #444",
                }}
              />

              <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
                <a
                  href={`http://localhost:3001/media/output/final_${jobId}.mp4?t=${Date.now()}`}
                  download
                  style={{ textDecoration: "none" }}
                >
                  <button
                    style={{
                      height: 36,
                      padding: "0 16px",
                      cursor: "pointer",
                      borderRadius: 4,
                      background: "rgba(12, 9, 10, 0.3)",
                      color: "white",
                      fontWeight: "bold",
                      border: "none",
                    }}
                  >
                    ⬇ Download MP4
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
                    padding: "0 16px",
                    borderRadius: 4,
                    background:
                      loading || !currentJobId
                        ? "#ccc"
                        : "rgba(253, 15, 15, 0.3)",
                    color: "white",
                    fontWeight: "bold",
                    border: "none",
                    cursor:
                      loading || !currentJobId ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Uploading..." : " Publish to YouTube"}
                </button>
              </div>
            </div>
          </div>
        )}
        <hr
          style={{ margin: "60px 0", border: "0", borderTop: "1px solid #eee" }}
        />

        <div
          style={{
            background: "#B7BBC0",
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
            <h4 style={{ margin: 0, color: "#000" }}>Disk Usage</h4>
            <p style={{ margin: "4px 0 0 0", fontSize: "15px", color: "#000" }}>
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
                  width: `${Math.min(
                    (storageStats.sizeMB / 2000) * 100,
                    100
                  )}%`,
                  background:
                    storageStats.sizeMB > 1500 ? "#ff4d4f" : "#4EBB17",
                }}
              />
            </div>
            <p
              style={{
                fontSize: "12px",
                textAlign: "right",
                marginTop: "4px",
                color: "#000",
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

        <section className="mt-12 mb-20">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8 border-b border-purple-500/20 pb-4">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                </span>
                PRODUCTION_ARCHIVE
              </h2>
              <p className="text-[10px] font-mono text-purple-400/60 mt-1 uppercase tracking-[0.2em]">
                System Status: Connected // Data_Retrieve_Active
              </p>
            </div>

            <button
              onClick={fetchHistory}
              className="px-4 py-2 bg-slate-950 border border-cyan-500/50 text-cyan-400 text-xs font-bold uppercase tracking-widest rounded hover:bg-cyan-500/10 hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] transition-all active:scale-95"
            >
              ⟳ Refresh System
            </button>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {history.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
                <p className="text-slate-600 font-mono italic text-sm animate-pulse">
                  &gt; NO_DATA_DETECTED_IN_LOCAL_STORAGE...
                </p>
              </div>
            ) : (
              history.map((video) => (
                <HistoryCard
                  key={video.id}
                  item={video}
                  onDelete={handleDelete}
                />
              ))
            )}
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
    </div>
  );
}
