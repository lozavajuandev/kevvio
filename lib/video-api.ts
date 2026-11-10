import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { db, transaction } from "./db";
import { AppError } from "./domain";
import { readPhoto } from "./photos";
import { videoModels, videoInput } from "./video-models";
import { cacheVideo, assembleVideo, readVideo } from "./video-storage";
const json = (v: unknown) =>
  NextResponse.json(v, { headers: { "Cache-Control": "no-store" } });
const enabled = () => !!process.env.KIE_API_KEY?.trim();
const studio = () =>
  !process.env.RAIZ_PLAN || process.env.RAIZ_PLAN === "studio";
function cap() {
  const n = Number(process.env.VIDEO_DAILY_BUDGET_USD || 5);
  return Number.isFinite(n) && n > 0 ? n : 5;
}
// Overrides exist only for isolated integration tests; production never accepts client-supplied URLs.
function base(upload = false) {
  return process.env.VIDEO_TEST_MODE === "1" && process.env.KIE_TEST_BASE_URL
    ? process.env.KIE_TEST_BASE_URL
    : upload
      ? "https://kieai.redpandaai.co"
      : "https://api.kie.ai";
}
class ProviderRejected extends Error {}
async function provider(path: string, body?: unknown, upload = false) {
  const r = await fetch(base(upload) + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + process.env.KIE_API_KEY,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
    redirect: "error",
  });
  const data = await r.json();
  if (!r.ok || data.code !== 200 || data.success === false)
    throw new ProviderRejected(
      "El proveedor no aceptó la solicitud. Revisa la credencial, el saldo y la disponibilidad del modelo.",
    );
  return data.data;
}
async function projects(propertyId: string) {
  const p = (
    await db.query(
      "SELECT id,model_key,aspect_ratio,motion,estimated_usd,created_at,output_key IS NOT NULL AS has_file FROM property_video_projects WHERE property_id=$1 ORDER BY created_at DESC",
      [propertyId],
    )
  ).rows;
  const clips = (
    await db.query(
      "SELECT c.id,c.project_id,c.photo_id,c.position,c.status,c.error,c.provider_task_id,c.credits_consumed,c.storage_key IS NOT NULL AS has_file FROM property_video_clips c JOIN property_video_projects p ON p.id=c.project_id WHERE p.property_id=$1 ORDER BY c.position",
      [propertyId],
    )
  ).rows;
  return p.map((p) => ({
    ...p,
    clips: clips.filter((c) => c.project_id === p.id),
  }));
}
async function project(id: string) {
  const p = (
    await db.query("SELECT * FROM property_video_projects WHERE id=$1", [
      z.uuid().parse(id),
    ])
  ).rows[0];
  if (!p) throw new AppError(404, "El proyecto de video no existe.");
  return p;
}
const locks = new Set<string>();
export async function videoApi(
  req: NextRequest,
  parts: string[],
  userId: string,
) {
  if (parts[0] !== "videos") return;
  const id = parts[1],
    action = parts[2];
  if (id === "catalog" && req.method === "GET")
    return json({
      enabled: enabled(),
      studio: studio(),
      models: videoModels,
      daily_budget_usd: cap(),
      provider: "Kie.ai",
      prices_checked_on: "2026-11-10",
    });
  if (action === "file" && req.method === "GET") {
    const p = await project(id);
    const clipId = req.nextUrl.searchParams.get("clip");
    let key = p.output_key;
    if (clipId) {
      key = (
        await db.query(
          "SELECT storage_key FROM property_video_clips WHERE id=$1 AND project_id=$2",
          [z.uuid().parse(clipId), p.id],
        )
      ).rows[0]?.storage_key;
    }
    if (!key) throw new AppError(404, "El video todavía no está listo.");
    const bytes = await readVideo(key),
      headers: Record<string, string> = {
        "Content-Type": "video/mp4",
        "Cache-Control": "private, no-store",
        "Accept-Ranges": "bytes",
        "Content-Disposition": `${req.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="inmueble-${p.id}.mp4"`,
      };
    const range = req.headers.get("range");
    if (range) {
      const m = /^bytes=(\d+)-(\d*)$/.exec(range);
      if (!m)
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${bytes.length}` },
        });
      const start = Number(m[1]),
        end = m[2]
          ? Math.min(Number(m[2]), bytes.length - 1)
          : bytes.length - 1;
      if (start > end || start >= bytes.length)
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${bytes.length}` },
        });
      return new NextResponse(new Uint8Array(bytes.subarray(start, end + 1)), {
        status: 206,
        headers: {
          ...headers,
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
          "Content-Length": String(end - start + 1),
        },
      });
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Length": String(bytes.length) },
    });
  }
  if (action === "sync" && req.method === "POST") {
    const p = await project(id);
    if (!enabled())
      throw new AppError(503, "El servicio de video aún no está activo.");
    if (locks.has(p.id)) return json({ busy: true });
    locks.add(p.id);
    try {
      const clips = (
        await db.query(
          "SELECT * FROM property_video_clips WHERE project_id=$1 ORDER BY position",
          [p.id],
        )
      ).rows;
      for (const c of clips) {
        if (
          c.status === "preparing" &&
          Date.now() - new Date(c.updated_at).getTime() > 180000
        ) {
          await db.query(
            "UPDATE property_video_clips SET status='unknown',error='La preparación fue interrumpida. Revisa el historial del proveedor antes de volver a generar.' WHERE id=$1 AND status='preparing'",
            [c.id],
          );
          continue;
        }
        if (
          !c.provider_task_id ||
          !["queued", "processing"].includes(c.status) ||
          (c.checked_at && Date.now() - new Date(c.checked_at).getTime() < 8000)
        )
          continue;
        await db.query(
          "UPDATE property_video_clips SET checked_at=now() WHERE id=$1",
          [c.id],
        );
        try {
          const r = await provider(
            "/api/v1/jobs/recordInfo?taskId=" +
              encodeURIComponent(c.provider_task_id),
          );
          if (r.taskId !== c.provider_task_id) throw new Error("task mismatch");
          if (r.state === "success") {
            const urls = z
              .object({ resultUrls: z.array(z.url()).min(1) })
              .parse(JSON.parse(r.resultJson));
            const key = await cacheVideo(urls.resultUrls[0]);
            await db.query(
              "UPDATE property_video_clips SET status='ready',storage_key=$2,error='',credits_consumed=$3,updated_at=now() WHERE id=$1",
              [
                c.id,
                key,
                typeof r.creditsConsumed === "number"
                  ? r.creditsConsumed
                  : null,
              ],
            );
          } else if (r.state === "fail")
            await db.query(
              "UPDATE property_video_clips SET status='failed',error='El proveedor no pudo generar este clip. Puedes iniciar otro proyecto con otra foto o modelo.',updated_at=now() WHERE id=$1",
              [c.id],
            );
          else
            await db.query(
              "UPDATE property_video_clips SET status=$2,error='',updated_at=now() WHERE id=$1",
              [c.id, r.state === "generating" ? "processing" : "queued"],
            );
        } catch {
          await db.query(
            "UPDATE property_video_clips SET error='No pudimos recuperar el resultado. Vuelve a consultar; no se enviará otra generación.' WHERE id=$1",
            [c.id],
          );
        }
      }
      return json({ projects: await projects(p.property_id) });
    } finally {
      locks.delete(p.id);
    }
  }
  if (action === "assemble" && req.method === "POST") {
    const p = await project(id);
    if (p.output_key) return json({ projects: await projects(p.property_id) });
    if (locks.has(p.id))
      throw new AppError(409, "Este video ya se está procesando.");
    locks.add(p.id);
    try {
      const clips = (
        await db.query(
          "SELECT storage_key,status FROM property_video_clips WHERE project_id=$1 ORDER BY position",
          [p.id],
        )
      ).rows;
      if (
        !clips.length ||
        clips.some((c) => c.status !== "ready" || !c.storage_key)
      )
        throw new AppError(400, "Espera a que estén listos todos los clips.");
      const key = await assembleVideo(
        clips.map((c) => c.storage_key),
        p.aspect_ratio,
      );
      await db.query(
        "UPDATE property_video_projects SET output_key=$2 WHERE id=$1",
        [p.id, key],
      );
      return json({ projects: await projects(p.property_id) });
    } finally {
      locks.delete(p.id);
    }
  }
  if (!id || action) throw new AppError(404, "Esta operación no existe.");
  const propertyId = z.uuid().parse(id),
    property = (
      await db.query("SELECT id,archived_at FROM properties WHERE id=$1", [
        propertyId,
      ])
    ).rows[0];
  if (!property) throw new AppError(404, "El inmueble no existe.");
  if (req.method === "GET")
    return json({ projects: await projects(propertyId) });
  if (req.method !== "POST")
    throw new AppError(404, "Esta operación no existe.");
  if (!studio())
    throw new AppError(403, "La creación de videos está disponible en Studio.");
  if (!enabled())
    throw new AppError(503, "El servicio de video aún no está activo.");
  if (property.archived_at)
    throw new AppError(409, "Activa el inmueble para crear videos.");
  const raw = await req.text();
  if (raw.length > 10000)
    throw new AppError(413, "La solicitud es demasiado extensa.");
  const v = z
    .object({
      creation_key: z.uuid(),
      photo_ids: z
        .array(z.uuid())
        .min(1)
        .max(6)
        .refine((a) => new Set(a).size === a.length),
      model_key: z.string(),
      motion: z.enum(["push", "pan", "steady"]),
      aspect_ratio: z.enum(["16:9", "9:16"]),
      accepted_estimate: z.number().nonnegative(),
    })
    .parse(JSON.parse(raw));
  const model = videoModels.find((m) => m.key === v.model_key);
  if (!model) throw new AppError(400, "Selecciona un modelo disponible.");
  const estimate = Number((model.usd * v.photo_ids.length).toFixed(4));
  if (v.accepted_estimate + 0.00001 < estimate)
    throw new AppError(
      409,
      "El costo estimado cambió. Revisa el total antes de generar.",
    );
  const reserved = await transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(871952)");
    const old = (
      await c.query(
        "SELECT * FROM property_video_projects WHERE creation_key=$1",
        [v.creation_key],
      )
    ).rows[0];
    if (old) {
      if (old.property_id !== propertyId)
        throw new AppError(409, "Esta solicitud corresponde a otro inmueble.");
      return { id: old.id, existing: true, photos: [] };
    }
    const photos = (
      await c.query(
        "SELECT id,storage_key FROM property_photos WHERE property_id=$1 AND id=ANY($2::uuid[]) AND archived_at IS NULL AND inventory_item_id IS NULL",
        [propertyId, v.photo_ids],
      )
    ).rows;
    if (photos.length !== v.photo_ids.length)
      throw new AppError(
        400,
        "Selecciona fotos generales y activas de este inmueble.",
      );
    const used = Number(
      (
        await c.query(
          "SELECT COALESCE(sum(estimated_usd),0) AS total FROM property_video_projects WHERE created_at >= date_trunc('day',now())",
        )
      ).rows[0].total,
    );
    if (used + estimate > cap())
      throw new AppError(
        429,
        "Llegaste al presupuesto diario de video. Puedes continuar mañana o ajustar el límite del servicio.",
      );
    const active = Number(
      (
        await c.query(
          "SELECT count(*) AS total FROM property_video_clips WHERE status IN ('preparing','queued','processing')",
        )
      ).rows[0].total,
    );
    if (active >= 12)
      throw new AppError(
        429,
        "Ya tienes videos en proceso. Espera a que terminen y consulta sus resultados.",
      );
    const p = (
      await c.query(
        "INSERT INTO property_video_projects(property_id,created_by,creation_key,model_key,aspect_ratio,motion,estimated_usd) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [
          propertyId,
          userId,
          v.creation_key,
          v.model_key,
          v.aspect_ratio,
          v.motion,
          estimate,
        ],
      )
    ).rows[0];
    for (const [i, photoId] of v.photo_ids.entries())
      await c.query(
        "INSERT INTO property_video_clips(project_id,photo_id,position) VALUES($1,$2,$3)",
        [p.id, photoId, i],
      );
    return { id: p.id, existing: false, photos };
  });
  if (!reserved.existing) {
    const clips = (
      await db.query(
        "SELECT * FROM property_video_clips WHERE project_id=$1 ORDER BY position",
        [reserved.id],
      )
    ).rows;
    // Each clip is submitted once. Ambiguous transport failures are never automatically retried.
    for (const clip of clips) {
      let submitted = false;
      try {
        const photo = reserved.photos.find((p) => p.id === clip.photo_id)!;
        const input = await sharp(await readPhoto(photo.storage_key))
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 90 })
          .toBuffer();
        const uploaded = await provider(
          "/api/file-base64-upload",
          {
            base64Data: "data:image/jpeg;base64," + input.toString("base64"),
            uploadPath: "raiz/property-videos",
            fileName: randomUUID() + ".jpg",
          },
          true,
        );
        const url = z.url().parse(uploaded.downloadUrl);
        if (!url.startsWith("https://") && process.env.VIDEO_TEST_MODE !== "1")
          throw new Error("upload url");
        submitted = true;
        const task = await provider("/api/v1/jobs/createTask", {
          model: model.providerModel,
          input: videoInput(model, url, v.motion),
        });
        const taskId = z.string().min(1).max(200).parse(task.taskId);
        await db.query(
          "UPDATE property_video_clips SET status='queued',provider_task_id=$2,updated_at=now() WHERE id=$1",
          [clip.id, taskId],
        );
      } catch (e) {
        const uncertain = submitted && !(e instanceof ProviderRejected);
        await db.query(
          "UPDATE property_video_clips SET status=$2,error=$3,updated_at=now() WHERE id=$1",
          [
            clip.id,
            uncertain ? "unknown" : "failed",
            uncertain
              ? "No se pudo confirmar el envío. Revisa el historial de Kie.ai antes de generar otra vez para evitar un doble cobro."
              : "No se pudo enviar este clip. Revisa la credencial, el saldo y la disponibilidad del modelo.",
          ],
        );
      }
    }
  }
  return json({ projects: await projects(propertyId), id: reserved.id });
}
