import { z } from "zod";
import { date, money, text } from "./domain";
export const stages = [
  "Nuevo",
  "Contactado",
  "Visita",
  "Propuesta",
  "Cerrado",
  "Descartado",
] as const;
export const interests = ["Arriendo", "Compra"] as const;
export const personSchema = z.object({
  name: text,
  document: z
    .string()
    .trim()
    .max(200)
    .nullable()
    .default(null)
    .transform((v) => v || null),
  email: z.union([z.email(), z.literal("")]).default(""),
  phone: z.string().trim().max(50).default(""),
  notes: z.string().trim().max(5000).default(""),
});
export const opportunitySchema = z.object({
  person_id: z.uuid(),
  property_id: z
    .union([z.uuid(), z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
  interest: z.enum(interests),
  stage: z.enum(stages).default("Nuevo"),
  budget: money.default(0),
  next_contact_on: z
    .union([date, z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
  next_action: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(5000).default(""),
});
export const activitySchema = z.object({
  person_id: z.uuid(),
  opportunity_id: z.uuid().nullable().default(null),
  kind: z.enum(["Nota", "Llamada", "WhatsApp", "Correo", "Visita"]),
  body: z.string().trim().min(1).max(5000),
});
export type Opportunity = z.infer<typeof opportunitySchema> & {
  id: string;
  person_name: string;
  property_name: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Activity = {
  id: string;
  person_id: string;
  opportunity_id: string | null;
  kind: string;
  body: string;
  created_at: string;
};
