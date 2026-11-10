import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db, transaction } from "./db";
import { AppError } from "./domain";
import { personSchema, opportunitySchema, activitySchema } from "./crm-domain";
const json = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
async function body(req: NextRequest) {
  const raw = await req.text();
  if (Buffer.byteLength(raw) > 100000)
    throw new AppError(413, "La información es demasiado extensa.");
  return JSON.parse(raw);
}
export async function crmApi(req: NextRequest, parts: string[]) {
  if (parts[0] !== "crm") return;
  const resource = parts[1],
    id = parts[2];
  if (req.method === "GET" && parts.length === 1) {
    const [people, opportunities] = await Promise.all([
      db.query("SELECT * FROM tenants ORDER BY name"),
      db.query(
        "SELECT o.*,p.name AS person_name,i.name AS property_name FROM crm_opportunities o JOIN tenants p ON p.id=o.person_id LEFT JOIN properties i ON i.id=o.property_id ORDER BY o.updated_at DESC",
      ),
    ]);
    return json({ people: people.rows, opportunities: opportunities.rows });
  }
  if (
    resource === "people" &&
    id &&
    req.method === "GET" &&
    parts.length === 3
  ) {
    z.uuid().parse(id);
    const person = (await db.query("SELECT * FROM tenants WHERE id=$1", [id]))
      .rows[0];
    if (!person) throw new AppError(404, "La persona no existe.");
    const activities = (
      await db.query(
        "SELECT * FROM crm_activities WHERE person_id=$1 ORDER BY created_at DESC LIMIT 200",
        [id],
      )
    ).rows;
    return json({ person, activities });
  }
  if (
    resource === "people" &&
    ((req.method === "POST" && parts.length === 2) ||
      (req.method === "PATCH" && parts.length === 3))
  ) {
    const p = personSchema.parse(await body(req));
    const values = [p.name, p.document, p.email, p.phone, p.notes];
    const result =
      req.method === "POST"
        ? await db.query(
            "INSERT INTO tenants(name,document,email,phone,notes) VALUES($1,$2,$3,$4,$5) RETURNING *",
            values,
          )
        : await db.query(
            "UPDATE tenants SET name=$1,document=$2,email=$3,phone=$4,notes=$5 WHERE id=$6 RETURNING *",
            [...values, z.uuid().parse(id)],
          );
    if (!result.rows.length) throw new AppError(404, "La persona no existe.");
    return json(result.rows[0]);
  }
  if (
    resource === "opportunities" &&
    ((req.method === "POST" && parts.length === 2) ||
      (req.method === "PATCH" && parts.length === 3))
  ) {
    const o = opportunitySchema.parse(await body(req));
    return json(
      await transaction(async (c) => {
        if (
          !(
            await c.query("SELECT id FROM tenants WHERE id=$1 FOR UPDATE", [
              o.person_id,
            ])
          ).rows.length
        )
          throw new AppError(404, "La persona no existe.");
        const existing = id
          ? (
              await c.query(
                "SELECT * FROM crm_opportunities WHERE id=$1 FOR UPDATE",
                [z.uuid().parse(id)],
              )
            ).rows[0]
          : null;
        if (id && !existing)
          throw new AppError(404, "La oportunidad no existe.");
        if (existing && existing.person_id !== o.person_id)
          throw new AppError(
            400,
            "No se puede cambiar la persona de una oportunidad.",
          );
        if (o.property_id) {
          const p = (
            await c.query("SELECT archived_at FROM properties WHERE id=$1", [
              o.property_id,
            ])
          ).rows[0];
          if (!p || (p.archived_at && existing?.property_id !== o.property_id))
            throw new AppError(400, "Selecciona un inmueble activo.");
        }
        const values = [
          o.person_id,
          o.property_id,
          o.interest,
          o.stage,
          o.budget,
          o.next_contact_on,
          o.next_action,
          o.notes,
        ];
        const r = id
          ? await c.query(
              "UPDATE crm_opportunities SET person_id=$1,property_id=$2,interest=$3,stage=$4,budget=$5,next_contact_on=$6,next_action=$7,notes=$8,closed_at=CASE WHEN $4='Cerrado' THEN COALESCE(closed_at,now()) ELSE NULL END,updated_at=now() WHERE id=$9 RETURNING *",
              [...values, id],
            )
          : await c.query(
              "INSERT INTO crm_opportunities(person_id,property_id,interest,stage,budget,next_contact_on,next_action,notes,closed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $4='Cerrado' THEN now() ELSE NULL END) RETURNING *",
              values,
            );
        if (!existing || existing.stage !== o.stage)
          await c.query(
            "INSERT INTO crm_activities(person_id,opportunity_id,kind,body) VALUES($1,$2,'Etapa',$3)",
            [
              o.person_id,
              r.rows[0].id,
              existing
                ? `Etapa actualizada: ${existing.stage} → ${o.stage}.`
                : `Oportunidad de ${o.interest.toLowerCase()} creada en ${o.stage}.`,
            ],
          );
        return r.rows[0];
      }),
    );
  }
  if (
    resource === "activities" &&
    req.method === "POST" &&
    parts.length === 2
  ) {
    const a = activitySchema.parse(await body(req));
    return json(
      await transaction(async (c) => {
        if (
          !(await c.query("SELECT id FROM tenants WHERE id=$1", [a.person_id]))
            .rows.length
        )
          throw new AppError(404, "La persona no existe.");
        if (
          a.opportunity_id &&
          !(
            await c.query(
              "SELECT id FROM crm_opportunities WHERE id=$1 AND person_id=$2",
              [a.opportunity_id, a.person_id],
            )
          ).rows.length
        )
          throw new AppError(
            400,
            "La oportunidad no pertenece a esta persona.",
          );
        return (
          await c.query(
            "INSERT INTO crm_activities(person_id,opportunity_id,kind,body) VALUES($1,$2,$3,$4) RETURNING *",
            [a.person_id, a.opportunity_id, a.kind, a.body],
          )
        ).rows[0];
      }),
    );
  }
  throw new AppError(404, "Esta operación no existe.");
}
