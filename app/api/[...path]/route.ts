import { NextRequest, NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { db, transaction } from "@/lib/db";
import {
  AppError,
  propertySchema,
  tenantSchema,
  leaseSchema,
  paymentSchema,
  today,
  currentMonth,
  date,
} from "@/lib/domain";
import {
  checkOrigin,
  userFor,
  hashPassword,
  verifyPassword,
  issueSession,
  digest,
  checkLoginRate,
  failedLogin,
  clearLoginRate,
} from "@/lib/auth";
import { generateCharges, registerPayment } from "@/lib/billing";
import { mkdir, writeFile, readFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import { inventoryApi } from "@/lib/inventory-api";
import { listingApi, publicListingApi } from "@/lib/listings";
import { crmApi } from "@/lib/crm-api";
import { propertyCreationApi } from "@/lib/property-creation";
import { videoApi } from "@/lib/video-api";
import { descriptionApi } from "@/lib/description-api";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uploads = () =>
  resolve(
    /* turbopackIgnore: true */ process.env.UPLOAD_DIR || ".data/uploads",
  );
const ok = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
  .refine((v) => v >= "1900-01" && v <= "2200-12");
async function body(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 100000)
    throw new AppError(413, "La solicitud es demasiado grande.");
  return req.json();
}
async function handle(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    checkOrigin(req);
    const parts = (await params).path,
      route = parts.join("/"),
      id = parts[1];
    if (route === "health") {
      await db.query("SELECT 1");
      return ok({ status: "ok" });
    }
    if (route === "session" && req.method === "GET") {
      const user = await userFor(req);
      const count = await db.query("SELECT count(*) FROM users");
      return ok({ user, setupRequired: Number(count.rows[0].count) === 0 });
    }
    if (route === "setup" && req.method === "POST") {
      const v = z
        .object({
          name: z.string().trim().min(1).max(100),
          password: z.string().min(10).max(200),
        })
        .parse(await body(req));
      const password = await hashPassword(v.password);
      const user = await transaction(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(741826)");
        if ((await c.query("SELECT id FROM users")).rows.length)
          throw new AppError(
            409,
            "La cuenta ya está configurada. Inicia sesión.",
          );
        return (
          await c.query(
            "INSERT INTO users(name,password_hash) VALUES($1,$2) RETURNING id,name",
            [v.name, password],
          )
        ).rows[0];
      });
      return issueSession(user, req);
    }
    if (route === "login" && req.method === "POST") {
      checkLoginRate("owner");
      const v = z
        .object({ password: z.string().max(200) })
        .parse(await body(req));
      const user = (await db.query("SELECT * FROM users LIMIT 1")).rows[0];
      if (!user || !(await verifyPassword(v.password, user.password_hash))) {
        failedLogin("owner");
        throw new AppError(401, "Contraseña incorrecta. Vuelve a intentarlo.");
      }
      clearLoginRate("owner");
      return issueSession({ id: user.id, name: user.name }, req);
    }
    const publicResponse = await publicListingApi(req, parts);
    if (publicResponse) return publicResponse;
    const user = await userFor(req);
    if (!user) throw new AppError(401, "Inicia sesión para continuar.");
    const videoResponse = await videoApi(req, parts, user.id);
    if (videoResponse) return videoResponse;
    const crmResponse = await crmApi(req, parts);
    if (crmResponse) return crmResponse;
    const creationResponse = await propertyCreationApi(req, parts);
    if (creationResponse) return creationResponse;
    const aiResponse = await descriptionApi(req, parts, user.id);
    if (aiResponse) return aiResponse;
    const listingResponse = await listingApi(req, parts);
    if (listingResponse) return listingResponse;
    const inventoryResponse = await inventoryApi(req, parts);
    if (inventoryResponse) return inventoryResponse;
    if (route === "logout" && req.method === "POST") {
      const token = req.cookies.get("raiz_session")?.value;
      await db.query("DELETE FROM sessions WHERE token_hash=$1", [
        digest(token || ""),
      ]);
      const res = ok({ ok: true });
      res.cookies.delete("raiz_session");
      return res;
    }
    if (route === "snapshot" && req.method === "GET") {
      const [properties, tenants, leases, charges, payments, documents] =
        await Promise.all([
          db.query(
            "SELECT p.*,(SELECT id FROM property_photos WHERE property_id=p.id AND is_cover LIMIT 1) AS cover_photo_id,COALESCE(l.enabled AND (l.expires_on IS NULL OR l.expires_on >= (now() AT TIME ZONE 'America/Bogota')::date) AND p.archived_at IS NULL,false) AS listing_enabled, l.published->>'monthly_rent' AS listing_rent FROM properties p LEFT JOIN property_listings l ON l.property_id=p.id ORDER BY p.created_at DESC",
          ),
          db.query("SELECT * FROM tenants ORDER BY name"),
          db.query(
            `SELECT l.*,p.name AS property_name,t.name AS tenant_name FROM leases l JOIN properties p ON p.id=l.property_id JOIN tenants t ON t.id=l.tenant_id ORDER BY l.created_at DESC`,
          ),
          db.query(
            `SELECT c.*,p.name AS property_name,p.id AS property_id,t.name AS tenant_name,t.id AS tenant_id,COALESCE(x.paid,0) AS paid,c.amount-COALESCE(x.paid,0) AS balance FROM charges c JOIN leases l ON l.id=c.lease_id JOIN properties p ON p.id=l.property_id JOIN tenants t ON t.id=l.tenant_id LEFT JOIN LATERAL (SELECT sum(amount) AS paid FROM payments WHERE charge_id=c.id AND voided_at IS NULL) x ON true ORDER BY c.due_date,c.created_at`,
          ),
          db.query(
            `SELECT py.*,p.name AS property_name,t.name AS tenant_name,c.period FROM payments py JOIN charges c ON c.id=py.charge_id JOIN leases l ON l.id=c.lease_id JOIN properties p ON p.id=l.property_id JOIN tenants t ON t.id=l.tenant_id ORDER BY py.paid_on DESC,py.created_at DESC`,
          ),
          db.query(
            `SELECT d.*,p.name AS property_name FROM documents d JOIN properties p ON p.id=d.property_id ORDER BY d.created_at DESC`,
          ),
        ]);
      return ok({
        user,
        today: today(),
        properties: properties.rows,
        tenants: tenants.rows,
        leases: leases.rows,
        charges: charges.rows,
        payments: payments.rows,
        documents: documents.rows,
      });
    }
    if (parts[0] === "properties" && ["POST", "PATCH"].includes(req.method)) {
      const v = propertySchema.parse(await body(req));
      const values = [
        v.name,
        v.kind,
        v.address,
        v.city,
        v.area,
        v.bedrooms,
        v.bathrooms,
        v.purchase_value,
        v.notes,
      ];
      const result =
        req.method === "POST"
          ? await db.query(
              "INSERT INTO properties(name,kind,address,city,area,bedrooms,bathrooms,purchase_value,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
              values,
            )
          : await db.query(
              "UPDATE properties SET name=$1,kind=$2,address=$3,city=$4,area=$5,bedrooms=$6,bathrooms=$7,purchase_value=$8,notes=$9 WHERE id=$10 RETURNING *",
              [...values, z.uuid().parse(id)],
            );
      if (!result.rows.length)
        throw new AppError(404, "El inmueble no existe.");
      return ok(result.rows[0]);
    }
    if (parts[0] === "properties" && req.method === "DELETE") {
      z.uuid().parse(id);
      await transaction(async (c) => {
        const p = await c.query(
          "SELECT id FROM properties WHERE id=$1 FOR UPDATE",
          [id],
        );
        if (!p.rows.length) throw new AppError(404, "El inmueble no existe.");
        const active = await c.query(
          "SELECT id FROM leases WHERE property_id=$1 AND status='active' AND end_date >= $2",
          [id, today()],
        );
        if (active.rows.length)
          throw new AppError(
            409,
            "Finaliza los contratos vigentes antes de archivar el inmueble.",
          );
        await c.query("UPDATE properties SET archived_at=now() WHERE id=$1", [
          id,
        ]);
      });
      return ok({ ok: true });
    }
    if (parts[0] === "tenants" && ["POST", "PATCH"].includes(req.method)) {
      const v = tenantSchema.parse(await body(req));
      const values = [v.name, v.document, v.email, v.phone, v.notes];
      const q =
        req.method === "POST"
          ? await db.query(
              "INSERT INTO tenants(name,document,email,phone,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",
              values,
            )
          : await db.query(
              "UPDATE tenants SET name=$1,document=$2,email=$3,phone=$4,notes=$5 WHERE id=$6 RETURNING *",
              [...values, z.uuid().parse(id)],
            );
      if (!q.rows.length) throw new AppError(404, "El arrendatario no existe.");
      return ok(q.rows[0]);
    }
    if (route === "leases" && req.method === "POST") {
      const v = leaseSchema.parse(await body(req));
      const lease = await transaction(async (c) => {
        const p = await c.query(
          "SELECT id FROM properties WHERE id=$1 AND archived_at IS NULL FOR UPDATE",
          [v.property_id],
        );
        if (!p.rows.length)
          throw new AppError(400, "Selecciona un inmueble disponible.");
        const q = await c.query(
          "INSERT INTO leases(property_id,tenant_id,start_date,end_date,rent,administration,due_day,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
          [
            v.property_id,
            v.tenant_id,
            v.start_date,
            v.end_date,
            v.rent,
            v.administration,
            v.due_day,
            v.notes,
          ],
        );
        await generateCharges(c, currentMonth(), q.rows[0].id);
        return q.rows[0];
      });
      return ok(lease);
    }
    if (parts[0] === "leases" && req.method === "PATCH") {
      const v = z.object({ end_date: date }).parse(await body(req));
      if (v.end_date > today())
        throw new AppError(
          400,
          "La fecha de finalización no puede estar en el futuro.",
        );
      const result = await transaction(async (c) => {
        const l = (
          await c.query("SELECT * FROM leases WHERE id=$1 FOR UPDATE", [
            z.uuid().parse(id),
          ])
        ).rows[0];
        if (!l) throw new AppError(404, "El contrato no existe.");
        if (l.status === "ended") {
          if (v.end_date === l.end_date) return l;
          throw new AppError(
            409,
            "El contrato ya fue finalizado. Su fecha de cierre no puede modificarse.",
          );
        }
        if (v.end_date < l.start_date)
          throw new AppError(
            400,
            "La fecha de finalización debe ser posterior al inicio.",
          );
        if (v.end_date > l.end_date)
          throw new AppError(
            400,
            "La finalización no puede extender la vigencia. Crea un nuevo contrato para renovarlo.",
          );
        const future = (
          await c.query(
            "SELECT id FROM charges WHERE lease_id=$1 AND period>date_trunc('month',$2::date)",
            [id, v.end_date],
          )
        ).rows;
        if (future.length)
          throw new AppError(
            409,
            "Hay cobros posteriores a esa fecha. Revisa la fecha de finalización.",
          );
        await generateCharges(c, v.end_date.slice(0, 7), l.id);
        return (
          await c.query(
            "UPDATE leases SET status='ended',end_date=$2,ended_at=now() WHERE id=$1 RETURNING *",
            [id, v.end_date],
          )
        ).rows[0];
      });
      return ok(result);
    }
    if (route === "charges/generate" && req.method === "POST") {
      const { month } = z.object({ month: monthSchema }).parse(await body(req));
      if (month > currentMonth())
        throw new AppError(400, "Los cobros se generan hasta el mes actual.");
      return ok({
        created: await transaction((c) => generateCharges(c, month)),
      });
    }
    if (route === "payments" && req.method === "POST") {
      const v = paymentSchema.parse(await body(req));
      return ok(await transaction((c) => registerPayment(c, v)));
    }
    if (parts[0] === "payments" && req.method === "PATCH") {
      const { reason } = z
        .object({ reason: z.string().trim().min(5).max(1000) })
        .parse(await body(req));
      const payment = await transaction(async (c) => {
        const p = (
          await c.query("SELECT * FROM payments WHERE id=$1", [
            z.uuid().parse(id),
          ])
        ).rows[0];
        if (!p) throw new AppError(404, "El pago no existe.");
        await c.query("SELECT id FROM charges WHERE id=$1 FOR UPDATE", [
          p.charge_id,
        ]);
        return (
          await c.query(
            "UPDATE payments SET voided_at=COALESCE(voided_at,now()),void_reason=COALESCE(void_reason,$2) WHERE id=$1 RETURNING *",
            [id, reason],
          )
        ).rows[0];
      });
      return ok(payment);
    }
    if (route === "documents" && req.method === "POST") {
      if (Number(req.headers.get("content-length")) > 11 * 1024 * 1024)
        throw new AppError(413, "El archivo no puede superar 10 MB.");
      const f = await req.formData();
      const v = z
        .object({
          property_id: z.uuid(),
          lease_id: z.union([z.uuid(), z.literal("")]).optional(),
          title: z.string().trim().min(1).max(200),
          category: z.enum([
            "Contrato",
            "Escritura",
            "Certificado",
            "Recibo",
            "Inventario",
            "Póliza",
            "Otro",
          ]),
          expires_on: z.union([date, z.literal("")]).optional(),
        })
        .parse(Object.fromEntries(f));
      const file = f.get("file");
      if (
        !(file instanceof File) ||
        file.size === 0 ||
        file.size > 10 * 1024 * 1024
      )
        throw new AppError(400, "Selecciona un archivo de hasta 10 MB.");
      const buffer = Buffer.from(await file.arrayBuffer());
      let mime = "";
      if (buffer.subarray(0, 5).toString() === "%PDF-")
        mime = "application/pdf";
      else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff)
        mime = "image/jpeg";
      else if (
        buffer
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      )
        mime = "image/png";
      if (!mime)
        throw new AppError(400, "Formato no permitido. Usa PDF, JPG o PNG.");
      if (
        v.lease_id &&
        !(
          await db.query(
            "SELECT id FROM leases WHERE id=$1 AND property_id=$2",
            [v.lease_id, v.property_id],
          )
        ).rows.length
      )
        throw new AppError(400, "El contrato debe pertenecer al inmueble.");
      const key = randomUUID();
      await mkdir(uploads(), { recursive: true, mode: 0o700 });
      await writeFile(
        join(/* turbopackIgnore: true */ uploads(), key),
        buffer,
        { flag: "wx", mode: 0o600 },
      );
      try {
        const { rows } = await db.query(
          "INSERT INTO documents(property_id,lease_id,title,category,filename,storage_key,mime_type,size_bytes,expires_on) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
          [
            v.property_id,
            v.lease_id || null,
            v.title,
            v.category,
            file.name.slice(0, 200),
            key,
            mime,
            file.size,
            v.expires_on || null,
          ],
        );
        return ok(rows[0]);
      } catch (e) {
        await unlink(join(/* turbopackIgnore: true */ uploads(), key));
        throw e;
      }
    }
    if (parts[0] === "documents" && req.method === "GET") {
      const d = (
        await db.query("SELECT * FROM documents WHERE id=$1", [
          z.uuid().parse(id),
        ])
      ).rows[0];
      if (!d) throw new AppError(404, "El documento no existe.");
      const bytes = await readFile(
        /* turbopackIgnore: true */ join(
          /* turbopackIgnore: true */ uploads(),
          d.storage_key,
        ),
      );
      return new NextResponse(bytes, {
        headers: {
          "Content-Type": d.mime_type,
          "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(d.filename)}`,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (route === "export" && req.method === "GET") {
      const rows = (
        await db.query(
          `SELECT p.name AS inmueble,t.name AS arrendatario,c.period AS periodo,c.due_date AS vencimiento,c.amount AS cobro,COALESCE(sum(py.amount) FILTER (WHERE py.voided_at IS NULL),0) AS pagado,c.amount-COALESCE(sum(py.amount) FILTER (WHERE py.voided_at IS NULL),0) AS saldo FROM charges c JOIN leases l ON l.id=c.lease_id JOIN properties p ON p.id=l.property_id JOIN tenants t ON t.id=l.tenant_id LEFT JOIN payments py ON py.charge_id=c.id GROUP BY c.id,p.name,t.name ORDER BY c.period DESC,p.name`,
        )
      ).rows;
      const columns = [
        "inmueble",
        "arrendatario",
        "periodo",
        "vencimiento",
        "cobro",
        "pagado",
        "saldo",
      ];
      const cell = (v: unknown) => {
        let s = String(v ?? "");
        if (/^[=+@\-\t\r\n]/.test(s)) s = "'" + s;
        return '"' + s.replaceAll('"', '""') + '"';
      };
      return new NextResponse(
        "\ufeff" +
          [
            columns.join(";"),
            ...rows.map((r) => columns.map((k) => cell(r[k])).join(";")),
          ].join("\r\n"),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="kevvio-cartera-${today()}.csv"`,
            "Cache-Control": "no-store",
          },
        },
      );
    }
    throw new AppError(404, "Esta operación no existe.");
  } catch (error) {
    if (error instanceof AppError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        {
          error: "Revisa los campos del formulario.",
          details: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
        },
        { status: 400 },
      );
    const e = error as { code?: string };
    if (e.code === "23P01")
      return NextResponse.json(
        {
          error:
            "El inmueble ya tiene un contrato que coincide con esas fechas.",
        },
        { status: 409 },
      );
    if (e.code === "23505")
      return NextResponse.json(
        {
          error:
            "Ya existe un registro con esos datos. Revisa el documento o la operación.",
        },
        { status: 409 },
      );
    if (e.code === "23503")
      return NextResponse.json(
        { error: "No se encontró el inmueble o arrendatario relacionado." },
        { status: 400 },
      );
    console.error(
      "Error de API:",
      error instanceof Error ? error.message : "desconocido",
    );
    return NextResponse.json(
      {
        error:
          "No se pudo completar la operación. Verifica que PostgreSQL esté en ejecución e inténtalo de nuevo.",
      },
      { status: 500 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH, handle as DELETE };
