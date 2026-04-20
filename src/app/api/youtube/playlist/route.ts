export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import https from "node:https";

const INVIDIOUS_INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://invidious.jing.rocks",
  "https://inv.tux.pizza",
];

const agent = new https.Agent({ rejectUnauthorized: false });

type InvidiousVideo = {
  videoId: string;
  title: string;
  lengthSeconds: number;
  videoThumbnails?: { url: string; quality: string }[];
  author?: string;
};

type InvidiousPlaylist = {
  title: string;
  author: string;
  videoCount: number;
  videos: InvidiousVideo[];
};

async function fetchPage(instance: string, playlistId: string, page: number): Promise<InvidiousPlaylist | null> {
  try {
    const url = `${instance}/api/v1/playlists/${playlistId}?page=${page}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "IronLog/1.0" },
      // @ts-expect-error -- Node fetch supports agent option
      agent,
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error(`[playlist] ${instance} page ${page} failed:`, (err as Error).message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const playlistId = req.nextUrl.searchParams.get("id");
  if (!playlistId) {
    return NextResponse.json({ error: "Playlist ID is required" }, { status: 400 });
  }

  let playlistData: InvidiousPlaylist | null = null;
  let usedInstance = "";

  for (const instance of INVIDIOUS_INSTANCES) {
    const data = await fetchPage(instance, playlistId, 1);
    if (data) {
      playlistData = data;
      usedInstance = instance;
      if (data.videos?.length > 0) break;
    }
  }

  if (!playlistData) {
    return NextResponse.json({ error: "Could not fetch playlist from any source" }, { status: 502 });
  }

  const allVideos = [...(playlistData.videos || [])];
  const totalCount = playlistData.videoCount || allVideos.length;

  if (totalCount > allVideos.length && usedInstance) {
    const perPage = Math.max(allVideos.length, 1);
    const totalPages = Math.ceil(totalCount / perPage);
    const maxPages = Math.min(totalPages, 20);

    const pagePromises = [];
    for (let page = 2; page <= maxPages; page++) {
      pagePromises.push(fetchPage(usedInstance, playlistId, page));
    }
    const results = await Promise.all(pagePromises);
    for (const pageData of results) {
      if (pageData?.videos?.length) {
        allVideos.push(...pageData.videos);
      }
    }
  }

  const tracks = allVideos
    .filter((v) => v.videoId)
    .map((v) => ({
      videoId: v.videoId,
      title: v.title || "Unknown Track",
      duration: v.lengthSeconds || 0,
      thumbnail:
        v.videoThumbnails?.find((t) => t.quality === "medium")?.url ||
        v.videoThumbnails?.[0]?.url ||
        `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
      author: v.author || "",
    }));

  if (tracks.length === 0) {
    return NextResponse.json(
      { error: "Playlist found but contains no playable tracks" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    title: playlistData.title || "Playlist",
    author: playlistData.author || "",
    trackCount: tracks.length,
    tracks,
  });
}
