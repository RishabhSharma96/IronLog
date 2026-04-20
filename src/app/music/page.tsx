"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Music, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX,
  ListMusic, Link as LinkIcon, Loader2, Shuffle, Repeat, ArrowLeft,
  Clock, Disc3, Trash2, Search,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

type Track = {
  videoId: string;
  title: string;
  duration: number;
  thumbnail: string;
  author: string;
};

type Playlist = {
  title: string;
  author: string;
  trackCount: number;
  tracks: Track[];
};

const LS_QUEUE = "ironlog-music-queue-v2";
const LS_PLAYLISTS = "ironlog-music-playlists";

function loadLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveLS(key: string, data: unknown) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* quota */ }
}

function formatDuration(s: number) {
  if (!s || s <= 0) return "--:--";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function parsePlaylistId(input: string): string | null {
  const match = input.trim().match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function MusicPage() {
  const [queue, setQueue] = useState<Track[]>(() => loadLS(LS_QUEUE, []));
  const [savedPlaylists, setSavedPlaylists] = useState<{ id: string; title: string }[]>(() => loadLS(LS_PLAYLISTS, []));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [apiReady, setApiReady] = useState(() => typeof window !== "undefined" && !!window.YT?.Player);

  const playerRef = useRef<YT.Player | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const playAfterLoad = useRef(false);

  useEffect(() => { saveLS(LS_QUEUE, queue); }, [queue]);
  useEffect(() => { saveLS(LS_PLAYLISTS, savedPlaylists); }, [savedPlaylists]);

  useEffect(() => {
    if (typeof window === "undefined" || apiReady) return;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      setApiReady(true);
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  }, [apiReady]);

  const startProgressTracking = useCallback(() => {
    clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      if (!playerRef.current) return;
      try {
        const t = playerRef.current.getCurrentTime?.() ?? 0;
        const d = playerRef.current.getDuration?.() ?? 0;
        setCurrentTime(t);
        setDuration(d);
        setProgress(d > 0 ? (t / d) * 100 : 0);
      } catch { /* not ready */ }
    }, 500);
  }, []);

  const pickNext = useCallback((fromIdx: number) => {
    if (repeatMode === "one") return fromIdx;
    if (shuffle) {
      if (queue.length <= 1) return 0;
      let r = fromIdx;
      while (r === fromIdx) r = Math.floor(Math.random() * queue.length);
      return r;
    }
    if (fromIdx < queue.length - 1) return fromIdx + 1;
    return repeatMode === "all" ? 0 : -1;
  }, [shuffle, repeatMode, queue.length]);

  const loadTrack = useCallback((track: Track, autoplay: boolean) => {
    if (!apiReady) return;
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* ok */ }
      playerRef.current = null;
    }
    const el = document.getElementById("yt-music-frame");
    if (!el) return;

    playerRef.current = new window.YT.Player("yt-music-frame", {
      height: "1",
      width: "1",
      videoId: track.videoId,
      playerVars: { autoplay: autoplay ? 1 : 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, playsinline: 1 },
      events: {
        onReady: (e: YT.PlayerEvent) => {
          e.target.setVolume(volume);
          if (muted) e.target.mute();
          if (autoplay) { e.target.playVideo(); setPlaying(true); }
          startProgressTracking();
        },
        onStateChange: (e: YT.OnStateChangeEvent) => {
          if (e.data === window.YT.PlayerState.ENDED) {
            const next = pickNext(currentIdx);
            if (next >= 0) { setCurrentIdx(next); playAfterLoad.current = true; }
            else { setPlaying(false); setProgress(100); }
          } else if (e.data === window.YT.PlayerState.PLAYING) {
            setPlaying(true);
          } else if (e.data === window.YT.PlayerState.PAUSED) {
            setPlaying(false);
          }
        },
      },
    });
  }, [apiReady, volume, muted, startProgressTracking, pickNext, currentIdx]);

  useEffect(() => {
    if (queue.length > 0 && currentIdx < queue.length && apiReady) {
      const auto = playAfterLoad.current;
      playAfterLoad.current = false;
      loadTrack(queue[currentIdx], auto);
    }
    return () => clearInterval(progressTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, apiReady]);

  const loadPlaylist = useCallback(async (input: string) => {
    const id = parsePlaylistId(input);
    if (!id) { setLoadError("Invalid YouTube playlist URL"); return; }
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch(`/api/youtube/playlist?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch playlist");
      const data: Playlist = await res.json();
      if (!data.tracks?.length) throw new Error("No tracks found");

      setQueue(data.tracks);
      setCurrentIdx(0);
      playAfterLoad.current = true;

      const exists = savedPlaylists.some((p) => p.id === id);
      if (!exists) {
        setSavedPlaylists((prev) => [...prev, { id, title: data.title }]);
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load playlist");
    } finally {
      setLoading(false);
      setUrlInput("");
    }
  }, [savedPlaylists]);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) {
      if (queue.length > 0) { playAfterLoad.current = true; loadTrack(queue[currentIdx], true); }
      return;
    }
    try { playing ? playerRef.current.pauseVideo() : playerRef.current.playVideo(); } catch { /* ok */ }
  }, [playing, queue, currentIdx, loadTrack]);

  const skipNext = useCallback(() => {
    const next = pickNext(currentIdx);
    if (next >= 0 && next !== currentIdx) { setCurrentIdx(next); playAfterLoad.current = true; }
    else if (next === currentIdx && repeatMode === "one") {
      try { playerRef.current?.seekTo(0, true); playerRef.current?.playVideo(); } catch { /* ok */ }
    }
  }, [currentIdx, pickNext, repeatMode]);

  const skipPrev = useCallback(() => {
    if (currentTime > 3) {
      try { playerRef.current?.seekTo(0, true); } catch { /* ok */ }
      return;
    }
    if (currentIdx > 0) { setCurrentIdx(currentIdx - 1); playAfterLoad.current = true; }
  }, [currentIdx, currentTime]);

  const toggleMute = useCallback(() => {
    try { muted ? (playerRef.current?.unMute(), playerRef.current?.setVolume(volume)) : playerRef.current?.mute(); } catch { /* ok */ }
    setMuted(!muted);
  }, [muted, volume]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value);
    setVolume(v);
    try { playerRef.current?.setVolume(v); if (v > 0 && muted) { playerRef.current?.unMute(); setMuted(false); } } catch { /* ok */ }
  }, [muted]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!playerRef.current || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    try { playerRef.current.seekTo(pct * duration, true); } catch { /* ok */ }
  }, [duration]);

  const playTrack = useCallback((idx: number) => {
    setCurrentIdx(idx);
    playAfterLoad.current = true;
  }, []);

  const removeTrack = useCallback((idx: number) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (idx === currentIdx && next.length > 0) setCurrentIdx(Math.min(idx, next.length - 1));
      else if (idx < currentIdx) setCurrentIdx((c) => c - 1);
      return next;
    });
  }, [currentIdx]);

  const clearQueue = useCallback(() => {
    if (playerRef.current) { try { playerRef.current.destroy(); } catch { /* ok */ } playerRef.current = null; }
    setQueue([]);
    setCurrentIdx(0);
    setPlaying(false);
    setProgress(0);
    clearInterval(progressTimer.current);
  }, []);

  const removeSavedPlaylist = useCallback((id: string) => {
    setSavedPlaylists((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const currentTrack = queue[currentIdx];
  const filteredQueue = searchQuery
    ? queue.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.author.toLowerCase().includes(searchQuery.toLowerCase()))
    : queue;

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-40 pt-8">
      {/* Hidden YT player */}
      <div className="fixed -left-[9999px] -top-[9999px] h-px w-px overflow-hidden">
        <div id="yt-music-frame" />
      </div>

      {/* Header */}
      <motion.div className="mb-8" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mb-4 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="sm"><ArrowLeft className="mr-1 h-3 w-3" /> HQ</Button>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-neon/30 bg-neon/10"
            animate={playing ? { boxShadow: ["0 0 10px rgba(0,240,255,0.2)", "0 0 25px rgba(0,240,255,0.4)", "0 0 10px rgba(0,240,255,0.2)"] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {playing ? <Disc3 className="h-5 w-5 text-neon animate-spin" style={{ animationDuration: "3s" }} /> : <Music className="h-5 w-5 text-neon" />}
          </motion.div>
          <div>
            <h1 className="font-mono text-xl font-black tracking-wider text-bright">BATTLE STATION</h1>
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted">MUSIC COMMAND CENTER</p>
          </div>
        </div>
      </motion.div>

      {/* URL Input */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="mb-6 p-4">
          <div className="mb-2 flex items-center gap-2">
            <LinkIcon className="h-3 w-3 text-neon/60" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-neon/60">LOAD PLAYLIST</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && loadPlaylist(urlInput)}
                placeholder="Paste YouTube playlist URL..."
                className="w-full rounded-sm border border-slate-border/50 bg-abyss/80 py-2.5 pl-3 pr-3 font-mono text-xs text-soft placeholder:text-muted/40 focus:border-neon/40 focus:outline-none"
              />
            </div>
            <Button onClick={() => loadPlaylist(urlInput)} disabled={loading || !urlInput.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "DEPLOY"}
            </Button>
          </div>
          <AnimatePresence>
            {loadError && (
              <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 font-mono text-[10px] text-hp">{loadError}</motion.p>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>

      {/* Saved playlists */}
      {savedPlaylists.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="mb-3 flex items-center gap-2">
            <ListMusic className="h-3 w-3 text-plasma/60" />
            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-plasma/60">SAVED PLAYLISTS</span>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            {savedPlaylists.map((pl) => (
              <div key={pl.id} className="group flex items-center gap-1">
                <motion.button
                  type="button"
                  onClick={() => loadPlaylist(`https://www.youtube.com/playlist?list=${pl.id}`)}
                  className="rounded-sm border border-slate-border bg-slate-deep/80 px-3 py-2 font-mono text-[10px] font-semibold tracking-wider text-soft transition-colors hover:border-plasma/40 hover:text-plasma"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {pl.title}
                </motion.button>
                <button type="button" onClick={() => removeSavedPlaylist(pl.id)} className="rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-hp">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Now Playing + Controls */}
      {currentTrack && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="relative mb-6 overflow-hidden p-0">
            {/* Thumbnail background blur */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${currentTrack.thumbnail})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(40px)" }} />
            <div className="relative z-10 p-5">
              {/* Track info */}
              <div className="mb-4 flex items-start gap-4">
                <motion.div
                  className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm border border-slate-border/50"
                  animate={playing ? { rotate: 360 } : { rotate: 0 }}
                  transition={playing ? { repeat: Infinity, duration: 8, ease: "linear" } : { duration: 0.3 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={currentTrack.thumbnail} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-void/40">
                    <Disc3 className="h-6 w-6 text-neon/60" />
                  </div>
                </motion.div>
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-neon/50">NOW PLAYING</p>
                  <p className="mt-0.5 truncate text-sm font-bold text-bright">{currentTrack.title}</p>
                  {currentTrack.author && <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{currentTrack.author}</p>}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="group relative h-1.5 w-full cursor-pointer rounded-full bg-slate-light/50" onClick={handleSeek}>
                  <motion.div className="absolute left-0 top-0 h-full rounded-full bg-neon/80" style={{ width: `${progress}%` }} />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-neon opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ left: `calc(${progress}% - 6px)`, boxShadow: "0 0 8px rgba(0,240,255,0.6)" }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between font-mono text-[9px] text-muted">
                  <span>{formatDuration(currentTime)}</span>
                  <span>{formatDuration(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShuffle(!shuffle)}
                  className={`rounded p-1.5 transition-colors ${shuffle ? "text-neon" : "text-muted hover:text-soft"}`}
                >
                  <Shuffle className="h-4 w-4" />
                </button>
                <button type="button" onClick={skipPrev} className="rounded p-2 text-soft hover:text-neon transition-colors">
                  <SkipBack className="h-5 w-5" />
                </button>
                <motion.button
                  type="button"
                  onClick={togglePlay}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-neon/50 bg-neon/15 text-neon"
                  whileHover={{ scale: 1.1, boxShadow: "0 0 20px rgba(0,240,255,0.3)" }}
                  whileTap={{ scale: 0.9 }}
                >
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </motion.button>
                <button type="button" onClick={skipNext} className="rounded p-2 text-soft hover:text-neon transition-colors">
                  <SkipForward className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setRepeatMode(repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off")}
                  className={`relative rounded p-1.5 transition-colors ${repeatMode !== "off" ? "text-neon" : "text-muted hover:text-soft"}`}
                >
                  <Repeat className="h-4 w-4" />
                  {repeatMode === "one" && <span className="absolute -right-0.5 -top-0.5 font-mono text-[7px] font-black text-neon">1</span>}
                </button>
              </div>

              {/* Volume */}
              <div className="mt-3 flex items-center justify-center gap-2">
                <button type="button" onClick={toggleMute} className="text-muted hover:text-neon transition-colors">
                  {muted || volume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <input
                  type="range" min={0} max={100} value={muted ? 0 : volume} onChange={handleVolume}
                  className="h-1 w-32 cursor-pointer appearance-none rounded-full bg-slate-light accent-neon [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-neon"
                />
                <span className="min-w-[20px] font-mono text-[8px] text-muted">{muted ? 0 : volume}</span>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Queue / Track List */}
      {queue.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListMusic className="h-3 w-3 text-xp/60" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-xp/60">
                TRACKLIST — {queue.length} TRACKS
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={clearQueue} className="font-mono text-[9px] uppercase tracking-wider text-muted hover:text-hp transition-colors">
                CLEAR ALL
              </button>
            </div>
          </div>

          {/* Search */}
          {queue.length > 5 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks..."
                className="w-full rounded-sm border border-slate-border/40 bg-abyss/60 py-2 pl-8 pr-3 font-mono text-[10px] text-soft placeholder:text-muted/40 focus:border-neon/30 focus:outline-none"
              />
            </div>
          )}

          <Card className="overflow-hidden p-0">
            <div className="max-h-[400px] divide-y divide-slate-border/20 overflow-y-auto">
              {filteredQueue.map((track) => {
                const realIdx = queue.indexOf(track);
                const isPlaying = realIdx === currentIdx;
                return (
                  <motion.div
                    key={`${track.videoId}-${realIdx}`}
                    className={`group flex items-center gap-3 px-4 py-3 transition-colors ${isPlaying ? "bg-neon/5" : "hover:bg-slate-light/20"}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    layout
                  >
                    {/* Play indicator / index */}
                    <button type="button" onClick={() => playTrack(realIdx)} className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center">
                      {isPlaying && playing ? (
                        <div className="flex items-end gap-[2px]">
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="w-[2px] rounded-full bg-neon"
                              animate={{ height: [3, 10, 5, 8, 3] }}
                              transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.1, ease: "easeInOut" }}
                            />
                          ))}
                        </div>
                      ) : (
                        <>
                          <span className={`font-mono text-[10px] group-hover:hidden ${isPlaying ? "text-neon" : "text-muted"}`}>
                            {String(realIdx + 1).padStart(2, "0")}
                          </span>
                          <Play className={`hidden h-3.5 w-3.5 group-hover:block ${isPlaying ? "text-neon" : "text-soft"}`} />
                        </>
                      )}
                    </button>

                    {/* Thumbnail */}
                    <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-sm border border-slate-border/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={track.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>

                    {/* Info */}
                    <button type="button" onClick={() => playTrack(realIdx)} className="min-w-0 flex-1 text-left">
                      <p className={`truncate text-xs font-semibold ${isPlaying ? "text-neon" : "text-soft"}`}>{track.title}</p>
                      {track.author && <p className="truncate font-mono text-[9px] text-muted">{track.author}</p>}
                    </button>

                    {/* Duration */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted">
                        <Clock className="mr-1 inline h-2.5 w-2.5" />
                        {formatDuration(track.duration)}
                      </span>
                      <button type="button" onClick={() => removeTrack(realIdx)} className="rounded p-1 text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-hp">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Empty state */}
      {queue.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-12 flex flex-col items-center gap-4 text-center">
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-border bg-slate-deep"
            animate={{ boxShadow: ["0 0 0px rgba(0,240,255,0)", "0 0 30px rgba(0,240,255,0.15)", "0 0 0px rgba(0,240,255,0)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            <Music className="h-8 w-8 text-muted" />
          </motion.div>
          <div>
            <p className="font-mono text-sm font-bold text-soft">NO TRACKS LOADED</p>
            <p className="mt-1 font-mono text-[10px] tracking-wider text-muted">
              PASTE A YOUTUBE PLAYLIST URL ABOVE TO BEGIN
            </p>
          </div>
        </motion.div>
      )}

      {/* Loading overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-4">
              <motion.div
                className="flex h-16 w-16 items-center justify-center rounded-full border border-neon/30 bg-slate-deep"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              >
                <Disc3 className="h-8 w-8 text-neon" />
              </motion.div>
              <div className="text-center">
                <p className="font-mono text-xs font-bold tracking-wider text-neon">LOADING PLAYLIST</p>
                <p className="mt-1 font-mono text-[9px] tracking-wider text-muted">FETCHING TRACK DATA...</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
