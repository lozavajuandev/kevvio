import {
  mkdir,
  writeFile,
  readFile,
  rename,
  unlink,
  chmod,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { AppError } from "./domain";
const run = promisify(execFile);
const root = () =>
  resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
    "videos",
  );
export function videoPath(key: string) {
  if (!/^[a-f0-9-]{36}$/.test(key))
    throw new AppError(400, "Referencia de video inválida.");
  return join(/* turbopackIgnore: true */ root(), key + ".mp4");
}
export async function readVideo(key: string) {
  try {
    return await readFile(/* turbopackIgnore: true */ videoPath(key));
  } catch {
    throw new AppError(
      404,
      "No se encuentra el archivo de video. Revisa el respaldo.",
    );
  }
}
function allowed(url: string) {
  const u = new URL(url);
  if (
    process.env.VIDEO_TEST_MODE === "1" &&
    process.env.KIE_TEST_BASE_URL &&
    u.origin === process.env.KIE_TEST_BASE_URL &&
    u.hostname === "127.0.0.1"
  )
    return u;
  const suffixes = ["aiquickdraw.com", "redpandaai.co", "kie.ai"];
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !suffixes.some((d) => u.hostname === d || u.hostname.endsWith("." + d))
  )
    throw new AppError(
      502,
      "El proveedor devolvió un servidor de video no reconocido. Revisa la integración antes de descargar.",
    );
  return u;
}
export async function cacheVideo(url: string) {
  let target = allowed(url),
    response: Response | undefined;
  for (let i = 0; i < 4; i++) {
    response = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(45000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("redirect");
      target = allowed(new URL(location, target).toString());
      continue;
    }
    break;
  }
  if (
    !response?.ok ||
    !response.body ||
    Number(response.headers.get("content-length")) > 100 * 1024 * 1024
  )
    throw new AppError(
      502,
      "No pudimos descargar el video del proveedor. Vuelve a consultar el resultado.",
    );
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > 100 * 1024 * 1024) throw new Error("size");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const buffer = Buffer.concat(chunks);
  if (buffer.length < 12 || buffer.subarray(4, 8).toString() !== "ftyp")
    throw new AppError(502, "El proveedor no devolvió un archivo MP4 válido.");
  const key = randomUUID();
  await mkdir(root(), { recursive: true, mode: 0o700 });
  await writeFile(/* turbopackIgnore: true */ videoPath(key), buffer, {
    flag: "wx",
    mode: 0o600,
  });
  return key;
}
export async function assembleVideo(keys: string[], aspect: string) {
  const output = randomUUID(),
    temporary = videoPath(randomUUID()),
    paths = keys.map(videoPath),
    w = aspect === "9:16" ? 720 : 1280,
    h = aspect === "9:16" ? 1280 : 720;
  await mkdir(root(), { recursive: true, mode: 0o700 });
  const filters =
    paths
      .map(
        (_, i) =>
          `[${i}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x0b2148,setsar=1,fps=24,format=yuv420p,setpts=PTS-STARTPTS[v${i}]`,
      )
      .join(";") +
    ";" +
    paths.map((_, i) => `[v${i}]`).join("") +
    `concat=n=${paths.length}:v=1:a=0[out]`;
  try {
    await run(
      process.env.FFMPEG_PATH || "ffmpeg",
      [
        "-nostdin",
        "-hide_banner",
        "-loglevel",
        "error",
        ...paths.flatMap((p) => ["-protocol_whitelist", "file,pipe", "-i", p]),
        "-filter_complex",
        filters,
        "-map",
        "[out]",
        "-an",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "21",
        "-movflags",
        "+faststart",
        "-threads",
        "2",
        temporary,
      ],
      { timeout: 120000, maxBuffer: 100000 },
    );
    await rename(/* turbopackIgnore: true */ temporary, videoPath(output));
    await chmod(/* turbopackIgnore: true */ videoPath(output), 0o600);
    return output;
  } catch {
    await unlink(/* turbopackIgnore: true */ temporary).catch(() => {});
    throw new AppError(
      503,
      "No se pudo unir el video. Verifica que FFmpeg esté instalado y vuelve a intentarlo; los clips siguen guardados.",
    );
  }
}
