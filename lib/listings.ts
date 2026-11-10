import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, transaction } from "./db";
import { AppError, today } from "./domain";
import { listingSchema, type PublicListing } from "./listing-domain";
import { readPhoto } from "./photos";
import { z } from "zod";
const token = () => randomBytes(32).toString("base64url");
const json = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
export function listingOrigin(fallback: string) {
  const value = process.env.PUBLIC_APP_URL?.trim();
  if (!value) return fallback;
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("PUBLIC_APP_URL inválida");
  return url.origin;
}
export async function getPublicListing(
  key: string,
): Promise<PublicListing | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(key)) return null;
  const row = (
    await db.query(
      `SELECT l.published,l.property_id FROM property_listings l JOIN properties p ON p.id=l.property_id WHERE l.token=$1 AND l.enabled AND p.archived_at IS NULL AND (l.expires_on IS NULL OR l.expires_on >= $2::date)`,
      [key, today()],
    )
  ).rows[0];
  if (!row) return null;
  const snapshot = row.published as PublicListing;
  const available = (
    await db.query(
      "SELECT id FROM property_photos WHERE property_id=$1 AND inventory_item_id IS NULL AND archived_at IS NULL AND id=ANY($2::uuid[])",
      [row.property_id, snapshot.photos.map((p) => p.id)],
    )
  ).rows;
  const ids = new Set(available.map((p) => p.id));
  return { ...snapshot, photos: snapshot.photos.filter((p) => ids.has(p.id)) };
}
export async function publicListingApi(req: NextRequest, parts: string[]) {
  if (parts[0] !== "public" || !["GET", "HEAD"].includes(req.method)) return;
  const listing = await getPublicListing(parts[1]);
  if (!listing) throw new AppError(404, "Este anuncio ya no está disponible.");
  if (parts.length === 2) return json(listing);
  if (
    parts[2] === "photos" &&
    listing.photos.some((p) => p.id === parts[3]) &&
    ["file", "thumbnail"].includes(parts[4]) &&
    parts.length === 5
  ) {
    const p = (
      await db.query(
        "SELECT storage_key FROM property_photos WHERE id=$1 AND archived_at IS NULL",
        [parts[3]],
      )
    ).rows[0];
    if (!p) throw new AppError(404, "La foto no está disponible.");
    return new NextResponse(
      await readPhoto(p.storage_key, parts[4] === "thumbnail"),
      {
        headers: {
          "Content-Type": "image/webp",
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex, nofollow",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }
  throw new AppError(404, "La foto no está disponible.");
}
export async function listingApi(req: NextRequest, parts: string[]) {
  if (parts[0] !== "listings") return;
  const id = z.uuid().parse(parts[1]),
    action = parts[2];
  const property = (
    await db.query("SELECT * FROM properties WHERE id=$1", [id])
  ).rows[0];
  if (!property) throw new AppError(404, "El inmueble no existe.");
  async function state() {
    const l = (
      await db.query("SELECT * FROM property_listings WHERE property_id=$1", [
        id,
      ])
    ).rows[0];
    const origin = listingOrigin(req.nextUrl.origin),
      path = l ? "/p/" + l.token : "";
    const draft = listingSchema.parse(l?.draft || { title: property.name });
    const published = l?.published;
    const comparable = published
      ? Object.fromEntries(
          Object.keys(draft)
            .filter(
              (k) => !["photo_ids", "expires_on", "show_address"].includes(k),
            )
            .map((k) => [k, published[k]]),
        )
      : null;
    const current = Object.fromEntries(
      Object.entries(draft).filter(
        ([k]) => !["photo_ids", "expires_on", "show_address"].includes(k),
      ),
    );
    const changed =
      !!l &&
      (!published ||
        JSON.stringify(comparable) !== JSON.stringify(current) ||
        JSON.stringify(draft.photo_ids) !==
          JSON.stringify(published.photos.map((p: { id: string }) => p.id)) ||
        draft.expires_on !== l.expires_on ||
        draft.show_address !== !!published.address);
    return {
      draft,
      enabled: !!l?.enabled,
      published_at: l?.published_at || null,
      expires_on: l?.expires_on || null,
      path,
      url: path ? origin + path : "",
      local_only: ["localhost", "127.0.0.1", "[::1]"].includes(
        new URL(origin).hostname,
      ),
      has_unpublished_changes: changed,
    };
  }
  if (req.method === "GET" && parts.length === 2) return json(await state());
  if (
    req.method !== "POST" ||
    parts.length !== 3 ||
    !["draft", "publish", "disable", "rotate"].includes(action)
  )
    throw new AppError(404, "Esta operación no existe.");
  if (Number(req.headers.get("content-length")) > 100000)
    throw new AppError(413, "La solicitud es demasiado grande.");
  const input = ["draft", "publish"].includes(action)
    ? listingSchema.parse(await req.json())
    : null;
  await transaction(async (c) => {
    const p = (
      await c.query("SELECT * FROM properties WHERE id=$1 FOR UPDATE", [id])
    ).rows[0];
    if (p.archived_at && action !== "disable")
      throw new AppError(409, "El inmueble está archivado.");
    if (input) {
      const photos = (
        await c.query(
          "SELECT id,caption,width,height FROM property_photos WHERE property_id=$1 AND inventory_item_id IS NULL AND archived_at IS NULL AND id=ANY($2::uuid[])",
          [id, input.photo_ids],
        )
      ).rows;
      if (photos.length !== input.photo_ids.length)
        throw new AppError(
          400,
          "Selecciona fotos generales activas de este inmueble.",
        );
      if (action === "publish") {
        if (
          !input.title ||
          input.monthly_rent <= 0 ||
          !photos.length ||
          (!input.contact_phone && !input.contact_email)
        )
          throw new AppError(
            400,
            "Para publicar, agrega un título, canon, al menos una foto y un contacto.",
          );
        if (input.expires_on && input.expires_on < today())
          throw new AppError(
            400,
            "El vencimiento debe ser hoy o una fecha futura.",
          );
      }
      await c.query(
        "INSERT INTO property_listings(property_id,token,draft) VALUES($1,$2,$3) ON CONFLICT(property_id) DO UPDATE SET draft=$3,updated_at=now()",
        [id, token(), JSON.stringify(input)],
      );
      if (action === "publish") {
        const { photo_ids, show_address, expires_on, ...fields } = input;
        const published: PublicListing = {
          ...fields,
          kind: p.kind,
          city: p.city,
          address: show_address ? p.address : null,
          area: p.area,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          photos: photo_ids.map((id) => photos.find((p) => p.id === id)!),
        };
        await c.query(
          "UPDATE property_listings SET enabled=true,published=$2,published_at=now(),expires_on=$3 WHERE property_id=$1",
          [id, JSON.stringify(published), expires_on],
        );
      }
    } else {
      const l = (
        await c.query(
          "SELECT property_id FROM property_listings WHERE property_id=$1",
          [id],
        )
      ).rows[0];
      if (!l) throw new AppError(404, "Primero guarda el anuncio.");
      if (action === "disable")
        await c.query(
          "UPDATE property_listings SET enabled=false,updated_at=now() WHERE property_id=$1",
          [id],
        );
      else
        await c.query(
          "UPDATE property_listings SET token=$2,updated_at=now() WHERE property_id=$1",
          [id, token()],
        );
    }
  });
  return json(await state());
}
