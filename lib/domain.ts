import { z } from "zod";
export const money = z.coerce.number().int().min(0).max(9999999999999);
export const date = z.iso
  .date()
  .refine((v) => v >= "1900-01-01" && v <= "2200-12-31", {
    message: "La fecha debe estar entre 1900 y 2200.",
  });
export const text = z.string().trim().min(1).max(200);
const notes = z.string().trim().max(5000).default("");
export const propertySchema = z.object({
  name: text,
  kind: z.enum([
    "Apartamento",
    "Casa",
    "Local",
    "Oficina",
    "Bodega",
    "Lote",
    "Otro",
  ]),
  address: text,
  city: text,
  area: z.coerce.number().min(0).max(99999999).default(0),
  bedrooms: z.coerce.number().int().min(0).max(999).default(0),
  bathrooms: z.coerce.number().int().min(0).max(999).default(0),
  purchase_value: money.default(0),
  notes,
});
export const tenantSchema = z.object({
  name: text,
  document: text,
  email: z.union([z.email(), z.literal("")]).default(""),
  phone: z.string().trim().max(50).default(""),
  notes,
});
export const leaseSchema = z
  .object({
    property_id: z.uuid(),
    tenant_id: z.uuid(),
    start_date: date,
    end_date: date,
    rent: money.refine((n) => n > 0),
    administration: money.default(0),
    due_day: z.coerce.number().int().min(1).max(28),
    notes,
  })
  .refine((v) => v.end_date >= v.start_date, {
    message: "La fecha de fin debe ser posterior al inicio.",
  });
export const paymentSchema = z.object({
  charge_id: z.uuid(),
  amount: money.refine((n) => n > 0),
  paid_on: date,
  method: z.enum(["Transferencia", "Efectivo", "Consignación", "Otro"]),
  reference: z.string().trim().max(200).default(""),
  notes,
  idempotency_key: z.uuid(),
});
export function today() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
  }).format(new Date());
}
export function currentMonth() {
  return today().slice(0, 7);
}
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
