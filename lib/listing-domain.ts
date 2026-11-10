import { z } from "zod";
import { date, money } from "./domain";
export const listingSchema = z.object({
  title: z.string().trim().max(160).default(""),
  description: z.string().trim().max(5000).default(""),
  monthly_rent: money.default(0),
  administration: money.default(0),
  neighborhood: z.string().trim().max(120).default(""),
  contact_name: z.string().trim().max(120).default(""),
  contact_phone: z
    .string()
    .trim()
    .regex(/^(?:\+?[0-9]{7,15})?$/, "Usa indicativo y número, sin espacios.")
    .default(""),
  contact_email: z.union([z.email(), z.literal("")]).default(""),
  amenities: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  photo_ids: z
    .array(z.uuid())
    .max(40)
    .refine((v) => new Set(v).size === v.length, "No repitas fotos.")
    .default([]),
  show_address: z.boolean().default(false),
  available_from: z
    .union([date, z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
  expires_on: z
    .union([date, z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
});
export type ListingDraft = z.infer<typeof listingSchema>;
export type PublicListing = Omit<
  ListingDraft,
  "photo_ids" | "show_address" | "expires_on"
> & {
  kind: string;
  city: string;
  address: string | null;
  area: string;
  bedrooms: number;
  bathrooms: number;
  photos: { id: string; caption: string; width: number; height: number }[];
};
export type ListingState = {
  draft: ListingDraft;
  enabled: boolean;
  published_at: string | null;
  expires_on: string | null;
  url: string;
  path: string;
  local_only: boolean;
  has_unpublished_changes: boolean;
};
export const amenityOptions = [
  "Parqueadero",
  "Balcón",
  "Ascensor",
  "Portería",
  "Gimnasio",
  "Piscina",
  "Zona de lavandería",
  "Depósito",
  "Amoblado",
  "Admite mascotas",
  "Terraza",
  "Zona infantil",
];
