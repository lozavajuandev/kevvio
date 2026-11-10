import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "./db";
import { AppError, propertySchema } from "./domain";
import { listingSchema } from "./listing-domain";
import {
  normalizePhoto,
  savePhoto,
  cleanupPhoto,
  type NormalizedPhoto,
} from "./photos";
export async function propertyCreationApi(req: NextRequest, parts: string[]) {
  if (parts.join("/") !== "properties/create" || req.method !== "POST") return;
  if (Number(req.headers.get("content-length")) > 55 * 1024 * 1024)
    throw new AppError(413, "Las fotos no pueden superar 50 MB en total.");
  const form = await req.formData(),
    key = z.uuid().parse(form.get("creation_key"));
  const payload = String(form.get("data") || "");
  if (payload.length > 25000)
    throw new AppError(413, "La información es demasiado extensa.");
  const input = JSON.parse(payload),
    p = propertySchema.parse(input),
    draft = listingSchema.parse(input.listing || { title: p.name });
  const previous = (
    await db.query("SELECT * FROM properties WHERE creation_key=$1", [key])
  ).rows[0];
  if (previous)
    return NextResponse.json(previous, {
      headers: { "Cache-Control": "no-store" },
    });
  const files = form.getAll("files");
  if (
    files.length > 12 ||
    files.some((f) => !(f instanceof File)) ||
    (files as File[]).reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024
  )
    throw new AppError(400, "Selecciona hasta 12 fotos y 50 MB en total.");
  const photos: NormalizedPhoto[] = [];
  try {
    for (const file of files as File[]) photos.push(await normalizePhoto(file));
    const property = await transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        key,
      ]);
      const existing = (
        await c.query("SELECT * FROM properties WHERE creation_key=$1", [key])
      ).rows[0];
      if (existing) return existing;
      const row = (
        await c.query(
          "INSERT INTO properties(name,kind,address,city,area,bedrooms,bathrooms,purchase_value,notes,creation_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",
          [
            p.name,
            p.kind,
            p.address,
            p.city,
            p.area,
            p.bedrooms,
            p.bathrooms,
            p.purchase_value,
            p.notes,
            key,
          ],
        )
      ).rows[0];
      const ids: string[] = [];
      for (const [i, photo] of photos.entries()) {
        await savePhoto(photo);
        const image = (
          await c.query(
            "INSERT INTO property_photos(property_id,original_filename,storage_key,width,height,size_bytes,is_cover) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id",
            [
              row.id,
              photo.filename,
              photo.key,
              photo.width,
              photo.height,
              photo.full.length,
              i === 0,
            ],
          )
        ).rows[0];
        ids.push(image.id);
      }
      await c.query(
        "INSERT INTO property_listings(property_id,token,draft) VALUES($1,$2,$3)",
        [
          row.id,
          randomBytes(32).toString("base64url"),
          JSON.stringify({
            ...draft,
            photo_ids: ids,
            title: draft.title || p.name,
          }),
        ],
      );
      return row;
    });
    return NextResponse.json(property, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    await Promise.all(photos.map((p) => cleanupPhoto(p.key)));
    throw e;
  }
}
