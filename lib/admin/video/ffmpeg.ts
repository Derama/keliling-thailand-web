// In-browser video export via ffmpeg.wasm. Uses the single-threaded core from
// a CDN (no COOP/COEP headers required); ~31MB fetched once then cached.
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;

/** Lazy-load and cache the ffmpeg core. Reset on failure so retry works. */
export function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return Promise.resolve(instance);
  loading ??= (async () => {
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    instance = ff;
    return ff;
  })().catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

export type MusicMode = "replace" | "mix";

export interface VideoExportInput {
  video: File;
  /** Transparent PNG data URL at the video's exact pixel dimensions. */
  overlayPng: string;
  /** Caption-only transparent PNG, burned with a fade+slide entrance. */
  captionPng: string | null;
  /** Trim window in seconds. */
  trimStart: number;
  trimEnd: number;
  music: File | null;
  musicMode: MusicMode;
  /** Music loudness relative to original audio, 0..1 (mix mode only). */
  musicVolume: number;
  onProgress?: (ratio: number) => void;
}

/**
 * Burn the overlay and apply trim/audio, returning the MP4 blob. On ffmpeg
 * failure the thrown Error message includes the log tail for diagnosis.
 */
export async function exportBrandedVideo(input: VideoExportInput): Promise<Blob> {
  const ff = await getFFmpeg();
  const logs: string[] = [];
  const onLog = ({ message }: { message: string }) => {
    logs.push(message);
    if (logs.length > 40) logs.shift();
  };
  const onProgress = ({ progress }: { progress: number }) => {
    input.onProgress?.(Math.max(0, Math.min(1, progress)));
  };
  ff.on("log", onLog);
  ff.on("progress", onProgress);

  const musicExt = input.music?.name.split(".").pop() || "mp3";
  const musicName = input.music ? `music.${musicExt}` : null;

  try {
    await ff.writeFile("input.mp4", await fetchFile(input.video));
    await ff.writeFile("overlay.png", await fetchFile(input.overlayPng));
    if (input.captionPng) {
      await ff.writeFile("caption.png", await fetchFile(input.captionPng));
    }
    if (input.music && musicName) {
      await ff.writeFile(musicName, await fetchFile(input.music));
    }

    // amix requires a source audio stream; probe and fall back to replace
    // when the uploaded video is silent (spec: mix must not hard-fail).
    let musicMode = input.musicMode;
    if (musicName && musicMode === "mix") {
      await ff.exec(["-hide_banner", "-i", "input.mp4"]);
      if (!logs.some((l) => l.includes("Audio:"))) musicMode = "replace";
    }

    const duration = Math.max(0.1, input.trimEnd - input.trimStart);
    const args = [
      "-ss", String(input.trimStart),
      "-t", String(duration),
      "-i", "input.mp4",
      "-i", "overlay.png",
    ];
    // Caption must be a looped stream (not a still) so fade can vary over time.
    if (input.captionPng) args.push("-loop", "1", "-i", "caption.png");
    if (musicName) args.push("-i", musicName);

    const musicIdx = input.captionPng ? 3 : 2;
    let filter: string;
    if (input.captionPng) {
      // Fade the caption in over 0.8s while sliding it up 4% of the height.
      filter =
        "[0:v][1:v]overlay=0:0[vb];" +
        "[2:v]format=rgba,fade=t=in:st=0:d=0.8:alpha=1[cap];" +
        "[vb][cap]overlay=x=0:y='(main_h*0.04)*(1-min(t/0.8,1))'[v]";
    } else {
      filter = "[0:v][1:v]overlay=0:0[v]";
    }

    const maps = ["-map", "[v]"];
    if (musicName && musicMode === "replace") {
      maps.push("-map", `${musicIdx}:a`);
    } else if (musicName) {
      // normalize=0 keeps the original audio at full volume with the music
      // gained by the slider value, instead of amix's default attenuation.
      filter += `;[0:a][${musicIdx}:a]amix=inputs=2:duration=first:normalize=0:weights=1 ${input.musicVolume.toFixed(2)}[a]`;
      maps.push("-map", "[a]");
    } else {
      maps.push("-map", "0:a?");
    }

    args.push(
      "-filter_complex", filter,
      ...maps,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "23",
      "-pix_fmt", "yuv420p",
      "-c:a", "aac",
      "-shortest",
      "-movflags", "+faststart",
      "out.mp4"
    );

    const code = await ff.exec(args);
    if (code !== 0) {
      throw new Error(`ffmpeg gagal (kode ${code}):\n${logs.slice(-12).join("\n")}`);
    }
    const data = await ff.readFile("out.mp4");
    return new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });
  } finally {
    ff.off("log", onLog);
    ff.off("progress", onProgress);
    for (const f of ["input.mp4", "overlay.png", input.captionPng ? "caption.png" : null, musicName, "out.mp4"]) {
      if (f) await ff.deleteFile(f).catch(() => {});
    }
  }
}
