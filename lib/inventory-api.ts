import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { PoolClient } from "pg";
import { db, transaction } from "./db";
import { AppError, today } from "./domain";
import { inventorySchema, spaceSchema } from "./inventory-domain";
import {
  normalizePhoto,
  savePhoto,
  cleanupPhoto,
  readPhoto,
  type NormalizedPhoto,
} from "./photos";
const json = (value: unknown) =>
  NextResponse.json(value, { headers: { "Cache-Control": "no-store" } });
async function body(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 250000)
    throw new AppError(413, "La solicitud es demasiado grande.");
  return req.json();
}
async function lockProperty(c: PoolClient, id: string) {
  const p = (
    await c.query("SELECT * FROM properties WHERE id=$1 FOR UPDATE", [id])
  ).rows[0];
  if (!p) throw new AppError(404, "El inmueble no existe.");
  if (p.archived_at)
    throw new AppError(
      409,
      "El inmueble está archivado. Su inventario solo se puede consultar.",
    );
  return p;
}
async function ensureSpace(
  c: PoolClient,
  propertyId: string,
  spaceId: string | null,
) {
  if (
    spaceId &&
    !(
      await c.query(
        "SELECT id FROM property_spaces WHERE id=$1 AND property_id=$2",
        [spaceId, propertyId],
      )
    ).rows.length
  )
    throw new AppError(400, "El espacio no pertenece a este inmueble.");
}
async function record(
  c: PoolClient,
  item: Record<string, unknown>,
  action: string,
) {
  await c.query(
    "INSERT INTO inventory_history(item_id,action,snapshot) VALUES($1,$2,$3)",
    [item.id, action, JSON.stringify(item)],
  );
}
const columns = [
  "property_id",
  "space_id",
  "name",
  "category",
  "quantity",
  "unit",
  "condition",
  "brand",
  "model",
  "serial_number",
  "material",
  "color",
  "dimensions",
  "unit_value",
  "ownership",
  "inspected_on",
  "notes",
  "attributes",
] as const;
type ItemInput = z.infer<typeof inventorySchema>;
async function saveItem(c: PoolClient, v: ItemInput, id?: string) {
  await ensureSpace(c, v.property_id, v.space_id);
  if (v.inspected_on && v.inspected_on > today())
    throw new AppError(
      400,
      "La fecha de revisión no puede estar en el futuro.",
    );
  const values = columns.map((k) =>
    k === "attributes" ? JSON.stringify(v[k]) : v[k],
  );
  const q = id
    ? await c.query(
        `UPDATE inventory_items SET ${columns.map((k, i) => `${k}=$${i + 1}`).join(",")},updated_at=now() WHERE id=$${values.length + 1} RETURNING *`,
        [...values, id],
      )
    : await c.query(
        `INSERT INTO inventory_items(${columns.join(",")}) VALUES(${columns.map((_, i) => "$" + (i + 1)).join(",")}) RETURNING *`,
        values,
      );
  await record(c, q.rows[0], id ? "Actualizado" : "Creado");
  return q.rows[0];
}
const photoColumns =
  "id,property_id,inventory_item_id,caption,original_filename,width,height,size_bytes,is_cover,archived_at,created_at";
async function repairCover(c: PoolClient, propertyId: string) {
  await c.query(
    `UPDATE property_photos SET is_cover=true WHERE id=(SELECT id FROM property_photos WHERE property_id=$1 AND inventory_item_id IS NULL AND archived_at IS NULL ORDER BY created_at,id LIMIT 1) AND NOT EXISTS(SELECT 1 FROM property_photos WHERE property_id=$1 AND is_cover)`,
    [propertyId],
  );
}

// Called only after the shared authentication and same-origin checks.
export async function inventoryApi(
  req: NextRequest,
  parts: string[],
): Promise<NextResponse | undefined> {
  const [resource, id, action] = parts;
  if (resource === "inventory" && req.method === "GET") {
    const propertyId = z.uuid().parse(id);
    const property = (
      await db.query("SELECT * FROM properties WHERE id=$1", [propertyId])
    ).rows[0];
    if (!property) throw new AppError(404, "El inmueble no existe.");
    const [spaces, items, photos] = await Promise.all([
      db.query(
        "SELECT * FROM property_spaces WHERE property_id=$1 ORDER BY created_at,name",
        [propertyId],
      ),
      db.query(
        "SELECT i.*,s.name AS space_name FROM inventory_items i LEFT JOIN property_spaces s ON s.id=i.space_id WHERE i.property_id=$1 ORDER BY i.created_at,i.id",
        [propertyId],
      ),
      db.query(
        `SELECT ${photoColumns} FROM property_photos WHERE property_id=$1 ORDER BY is_cover DESC,created_at,id`,
        [propertyId],
      ),
    ]);
    if (action === "export") {
      const csvCell = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      const headers = [
        "Inmueble",
        "Espacio",
        "Elemento",
        "Categoría",
        "Cantidad",
        "Unidad",
        "Estado",
        "Marca",
        "Modelo",
        "Serial",
        "Material",
        "Color",
        "Dimensiones",
        "Valor unitario COP",
        "Propietario",
        "Revisado el",
        "Notas",
        "Detalles adicionales",
      ];
      const rows = items.rows
        .filter((i) => !i.archived_at)
        .map((i) => [
          property.name,
          i.space_name || "Sin espacio",
          i.name,
          i.category,
          i.quantity,
          i.unit,
          i.condition,
          i.brand,
          i.model,
          i.serial_number,
          i.material,
          i.color,
          i.dimensions,
          i.unit_value,
          i.ownership,
          i.inspected_on || "",
          i.notes,
          JSON.stringify(i.attributes),
        ]);
      return new NextResponse(
        "\ufeff" +
          [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="inventario-${propertyId}-${today()}.csv"`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    return json({
      property,
      spaces: spaces.rows,
      items: items.rows,
      photos: photos.rows,
    });
  }
  if (resource === "spaces" && req.method === "POST") {
    const v = spaceSchema.parse(await body(req));
    return json(
      await transaction(async (c) => {
        await lockProperty(c, v.property_id);
        return (
          await c.query(
            "INSERT INTO property_spaces(property_id,name,floor,notes) VALUES($1,$2,$3,$4) RETURNING *",
            [v.property_id, v.name, v.floor, v.notes],
          )
        ).rows[0];
      }),
    );
  }
  if (resource === "spaces" && ["PATCH", "DELETE"].includes(req.method)) {
    const spaceId = z.uuid().parse(id);
    const input =
      req.method === "PATCH"
        ? spaceSchema.omit({ property_id: true }).parse(await body(req))
        : null;
    return json(
      await transaction(async (c) => {
        const s = (
          await c.query("SELECT * FROM property_spaces WHERE id=$1", [spaceId])
        ).rows[0];
        if (!s) throw new AppError(404, "El espacio no existe.");
        await lockProperty(c, s.property_id);
        if (input)
          return (
            await c.query(
              "UPDATE property_spaces SET name=$2,floor=$3,notes=$4 WHERE id=$1 RETURNING *",
              [spaceId, input.name, input.floor, input.notes],
            )
          ).rows[0];
        if (
          (
            await c.query(
              "SELECT id FROM inventory_items WHERE space_id=$1 LIMIT 1",
              [spaceId],
            )
          ).rows.length
        )
          throw new AppError(
            409,
            "Este espacio contiene elementos. Muévelos a otro espacio antes de eliminarlo, incluidos los archivados.",
          );
        await c.query("DELETE FROM property_spaces WHERE id=$1", [spaceId]);
        return { ok: true };
      }),
    );
  }
  if (resource === "inventory-items" && req.method === "POST") {
    if (id === "batch") {
      const v = z
        .object({ items: z.array(inventorySchema).min(1).max(100) })
        .parse(await body(req));
      const propertyId = v.items[0].property_id;
      if (v.items.some((i) => i.property_id !== propertyId))
        throw new AppError(400, "La lista debe pertenecer a un solo inmueble.");
      return json(
        await transaction(async (c) => {
          await lockProperty(c, propertyId);
          const result = [];
          for (const item of v.items) result.push(await saveItem(c, item));
          return { items: result };
        }),
      );
    }
    const v = inventorySchema.parse(await body(req));
    return json(
      await transaction(async (c) => {
        await lockProperty(c, v.property_id);
        return saveItem(c, v);
      }),
    );
  }
  if (
    resource === "inventory-items" &&
    req.method === "GET" &&
    action === "history"
  ) {
    const itemId = z.uuid().parse(id);
    if (
      !(await db.query("SELECT id FROM inventory_items WHERE id=$1", [itemId]))
        .rows.length
    )
      throw new AppError(404, "El elemento no existe.");
    return json(
      (
        await db.query(
          "SELECT * FROM inventory_history WHERE item_id=$1 ORDER BY created_at DESC,id DESC",
          [itemId],
        )
      ).rows,
    );
  }
  if (resource === "inventory-items" && req.method === "PATCH") {
    const itemId = z.uuid().parse(id),
      input = await body(req);
    return json(
      await transaction(async (c) => {
        let old = (
          await c.query("SELECT * FROM inventory_items WHERE id=$1", [itemId])
        ).rows[0];
        if (!old) throw new AppError(404, "El elemento no existe.");
        await lockProperty(c, old.property_id);
        old = (
          await c.query(
            "SELECT * FROM inventory_items WHERE id=$1 FOR UPDATE",
            [itemId],
          )
        ).rows[0];
        if ("archived" in input) {
          const v = z.object({ archived: z.boolean() }).parse(input);
          const item = (
            await c.query(
              "UPDATE inventory_items SET archived_at=CASE WHEN $2 THEN COALESCE(archived_at,now()) ELSE NULL END,updated_at=now() WHERE id=$1 RETURNING *",
              [itemId, v.archived],
            )
          ).rows[0];
          await record(c, item, v.archived ? "Archivado" : "Restaurado");
          return item;
        }
        const v = inventorySchema.parse(input);
        if (v.property_id !== old.property_id)
          throw new AppError(
            400,
            "No se puede mover el elemento a otro inmueble.",
          );
        if (old.archived_at)
          throw new AppError(409, "Restaura el elemento antes de editarlo.");
        return saveItem(c, v, itemId);
      }),
    );
  }
  if (resource === "photos" && req.method === "POST") {
    if (Number(req.headers.get("content-length")) > 55 * 1024 * 1024)
      throw new AppError(413, "Sube hasta 50 MB de fotos por vez.");
    const f = await req.formData(),
      propertyId = z.uuid().parse(f.get("property_id")),
      itemId =
        z
          .union([z.uuid(), z.literal(""), z.null()])
          .parse(f.get("inventory_item_id")) || null,
      caption = z
        .string()
        .trim()
        .max(300)
        .parse(f.get("caption") || "");
    const files = f.getAll("files");
    if (
      !files.length ||
      files.length > 12 ||
      files.some((f) => !(f instanceof File))
    )
      throw new AppError(400, "Selecciona entre 1 y 12 fotos.");
    if ((files as File[]).reduce((n, f) => n + f.size, 0) > 50 * 1024 * 1024)
      throw new AppError(413, "Sube hasta 50 MB de fotos por vez.");
    const normalized: NormalizedPhoto[] = [];
    try {
      for (const file of files as File[])
        normalized.push(await normalizePhoto(file));
      const photos = await transaction(async (c) => {
        await lockProperty(c, propertyId);
        if (
          itemId &&
          !(
            await c.query(
              "SELECT id FROM inventory_items WHERE id=$1 AND property_id=$2 AND archived_at IS NULL",
              [itemId, propertyId],
            )
          ).rows.length
        )
          throw new AppError(
            400,
            "El elemento no pertenece al inmueble o está archivado.",
          );
        const result = [];
        for (const photo of normalized) {
          await savePhoto(photo);
          const r = await c.query(
            `INSERT INTO property_photos(property_id,inventory_item_id,caption,original_filename,storage_key,width,height,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${photoColumns}`,
            [
              propertyId,
              itemId,
              caption,
              photo.filename,
              photo.key,
              photo.width,
              photo.height,
              photo.full.length,
            ],
          );
          result.push(r.rows[0]);
        }
        await repairCover(c, propertyId);
        return result;
      });
      return json({ photos });
    } catch (e) {
      await Promise.all(normalized.map((p) => cleanupPhoto(p.key)));
      throw e;
    }
  }
  if (
    resource === "photos" &&
    req.method === "GET" &&
    ["file", "thumbnail"].includes(action)
  ) {
    const photo = (
      await db.query("SELECT * FROM property_photos WHERE id=$1", [
        z.uuid().parse(id),
      ])
    ).rows[0];
    if (!photo) throw new AppError(404, "La foto no existe.");
    const bytes = await readPhoto(photo.storage_key, action === "thumbnail");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": `${req.nextUrl.searchParams.has("download") ? "attachment" : "inline"}; filename="foto-${photo.id}.webp"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  if (resource === "photos" && req.method === "PATCH") {
    const photoId = z.uuid().parse(id),
      v = z
        .object({
          caption: z.string().trim().max(300).optional(),
          is_cover: z.literal(true).optional(),
          archived: z.boolean().optional(),
        })
        .refine((v) => Object.keys(v).length > 0)
        .parse(await body(req));
    return json(
      await transaction(async (c) => {
        let old = (
          await c.query("SELECT * FROM property_photos WHERE id=$1", [photoId])
        ).rows[0];
        if (!old) throw new AppError(404, "La foto no existe.");
        await lockProperty(c, old.property_id);
        old = (
          await c.query(
            "SELECT * FROM property_photos WHERE id=$1 FOR UPDATE",
            [photoId],
          )
        ).rows[0];
        const archived = v.archived ?? !!old.archived_at;
        if (v.is_cover && (old.inventory_item_id || archived))
          throw new AppError(
            400,
            "La portada debe ser una foto general activa del inmueble.",
          );
        if (v.is_cover)
          await c.query(
            "UPDATE property_photos SET is_cover=false WHERE property_id=$1 AND is_cover",
            [old.property_id],
          );
        const result = await c.query(
          `UPDATE property_photos SET caption=COALESCE($2,caption),archived_at=CASE WHEN $3::boolean IS NULL THEN archived_at WHEN $3 THEN COALESCE(archived_at,now()) ELSE NULL END,is_cover=CASE WHEN $3=true THEN false WHEN $4=true THEN true ELSE is_cover END WHERE id=$1 RETURNING ${photoColumns}`,
          [photoId, v.caption ?? null, v.archived ?? null, v.is_cover ?? null],
        );
        await repairCover(c, old.property_id);
        return result.rows[0];
      }),
    );
  }
}
