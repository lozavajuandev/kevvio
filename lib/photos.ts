import sharp from "sharp";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { AppError } from "./domain";
function photoPath(key: string, thumbnail = false) {
  if (!/^[0-9a-f-]{36}$/.test(key))
    throw new AppError(400, "Referencia de foto inválida.");
  const dir = resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
    "photos",
  );
  return join(
    /* turbopackIgnore: true */ dir,
    key + (thumbnail ? "-thumb" : "") + ".webp",
  );
}
export async function normalizePhoto(file: File) {
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new AppError(400, `${file.name}: usa una foto de hasta 10 MB.`);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(buffer, {
      limitInputPixels: 40_000_000,
      failOn: "warning",
    });
    const meta = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(meta.format || "") ||
      (meta.pages || 1) > 1
    )
      throw new Error("format");
    const full = await image
      .rotate()
      .resize({
        width: 2400,
        height: 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    const thumbnail = await sharp(full.data)
      .resize({
        width: 480,
        height: 480,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    return {
      key: randomUUID(),
      full: full.data,
      thumbnail,
      width: full.info.width,
      height: full.info.height,
      filename: file.name.slice(0, 200),
    };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(
      400,
      `${file.name}: no es una foto válida. Usa JPG, PNG o WebP, sin animación y hasta 40 megapíxeles.`,
    );
  }
}
export type NormalizedPhoto = Awaited<ReturnType<typeof normalizePhoto>>;
export async function savePhoto(photo: NormalizedPhoto) {
  await mkdir(
    resolve(
      /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
      "photos",
    ),
    { recursive: true, mode: 0o700 },
  );
  await writeFile(
    /* turbopackIgnore: true */ photoPath(photo.key),
    photo.full,
    { flag: "wx", mode: 0o600 },
  );
  await writeFile(
    /* turbopackIgnore: true */ photoPath(photo.key, true),
    photo.thumbnail,
    { flag: "wx", mode: 0o600 },
  );
}
export async function cleanupPhoto(key: string) {
  await Promise.allSettled([
    unlink(/* turbopackIgnore: true */ photoPath(key)),
    unlink(/* turbopackIgnore: true */ photoPath(key, true)),
  ]);
}
export async function readPhoto(key: string, thumbnail = false) {
  try {
    return await readFile(
      /* turbopackIgnore: true */ photoPath(key, thumbnail),
    );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      throw new AppError(
        404,
        "El archivo de la foto no está disponible. Revisa el respaldo de archivos.",
      );
    throw e;
  }
}
