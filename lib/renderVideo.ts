import { cueAt, type Cue } from "./subtitles";

// Рендер вертикального відео 1080×1920 у браузері: canvas + Web Audio + MediaRecorder

const W = 1080;
const H = 1920;
const FPS = 30;
const ZOOM = 0.12; // як у прев'ю

// Спершу H.264 — такий MP4 відкривається будь-де, зокрема в «Фото» на iPhone
const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.640028,mp4a.40.2",
  "video/mp4;codecs=avc1.4D0028,mp4a.40.2",
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=avc1,mp4a",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export type RenderResult = { blob: Blob; ext: "mp4" | "webm" };

export function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? null;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  productName: string,
  cue: Cue | null,
  progress: number,
) {
  const scale = 1 + ZOOM * progress;

  ctx.save();
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, W, H);

  // Фон: фото (object-fit: cover) з наближенням від центру
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);
  if (img) {
    const k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = img.naturalWidth * k;
    const dh = img.naturalHeight * k;
    ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#a21caf");
    g.addColorStop(0.5, "#5b21b6");
    g.addColorStop(1, "#312e81");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.9)";
    ctx.font = "800 84px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    wrapLines(ctx, productName, W - 160).forEach((l, i) => ctx.fillText(l, W / 2, H * 0.22 + i * 100));
  }
  ctx.restore();

  // Затемнення знизу
  const shade = ctx.createLinearGradient(0, H / 2, 0, H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,.7)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, H / 2, W, H / 2);

  // Субтитри
  if (cue) {
    ctx.font = "900 78px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const lines = wrapLines(ctx, cue.text.toUpperCase(), W - 120);
    const lineH = 92;
    const bottom = H * 0.86;
    lines.forEach((l, i) => {
      const y = bottom - (lines.length - 1 - i) * lineH;
      ctx.shadowColor = "rgba(0,0,0,.9)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 4;
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(0,0,0,.55)";
      ctx.strokeText(l, W / 2, y);
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#fff";
      ctx.fillText(l, W / 2, y);
    });
  }
}

export async function renderVideo(opts: {
  photoUrl: string | null;
  productName: string;
  audioUrl: string;
  cues: Cue[];
  onProgress: (p: number) => void;
}): Promise<RenderResult> {
  // AudioContext створюємо одразу — iOS дозволяє звук лише в межах натискання
  const audioCtx = new AudioContext();
  await audioCtx.resume();

  try {
    const mimeType = pickMimeType();
    if (!mimeType) throw new Error("MediaRecorder unsupported");

    const [img, audioBuffer] = await Promise.all([
      opts.photoUrl ? loadImage(opts.photoUrl) : Promise.resolve(null),
      fetch(opts.audioUrl)
        .then((r) => r.arrayBuffer())
        .then((b) => audioCtx.decodeAudioData(b)),
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    drawFrame(ctx, img, opts.productName, null, 0);

    // Аудіо йде лише у запис, не в динаміки
    const dest = audioCtx.createMediaStreamDestination();
    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(dest);

    const stream = new MediaStream([
      ...canvas.captureStream(FPS).getVideoTracks(),
      ...dest.stream.getAudioTracks(),
    ]);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 8_000_000,
      audioBitsPerSecond: 128_000,
    });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => (recorder.onstop = () => resolve()));

    const duration = audioBuffer.duration;
    recorder.start(250);
    const startAt = audioCtx.currentTime + 0.1;
    source.start(startAt);

    // Кадри малюємо за часом аудіо — субтитри збігаються з голосом
    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = Math.max(0, audioCtx.currentTime - startAt);
        const progress = Math.min(t / duration, 1);
        drawFrame(ctx, img, opts.productName, cueAt(opts.cues, t), progress);
        opts.onProgress(progress);
        if (t >= duration + 0.3) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    recorder.stop();
    await stopped;
    stream.getTracks().forEach((tr) => tr.stop());

    const ext = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    return { blob: new Blob(chunks, { type: mimeType.split(";")[0] }), ext };
  } finally {
    audioCtx.close();
  }
}
