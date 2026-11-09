import { z } from "zod";
import { date, money, text } from "./domain";
export const conditions = [
  "Por revisar",
  "Nuevo",
  "Bueno",
  "Regular",
  "Malo",
  "No funciona",
] as const;
export const categories = [
  "Eléctrico",
  "Iluminación",
  "Hidráulico y sanitario",
  "Puertas y ventanas",
  "Carpintería y clósets",
  "Pisos y acabados",
  "Cocina",
  "Electrodomésticos",
  "Mobiliario",
  "Seguridad",
  "Climatización",
  "Exteriores",
  "Servicios y medidores",
  "General",
];
export const units = ["unidad", "par", "juego", "m²", "m", "litro"];
const short = z.string().trim().max(200).default("");
export const spaceSchema = z.object({
  property_id: z.uuid(),
  name: z.string().trim().min(1).max(120),
  floor: z.string().trim().max(80).default(""),
  notes: z.string().trim().max(2000).default(""),
});
export const inventorySchema = z.object({
  property_id: z.uuid(),
  space_id: z
    .union([z.uuid(), z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
  name: text,
  category: z.string().trim().min(1).max(100).default("General"),
  quantity: z.coerce
    .number()
    .positive()
    .max(9999999999.99)
    .refine((n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.001, {
      message: "Usa máximo dos decimales.",
    })
    .default(1),
  unit: z.string().trim().min(1).max(30).default("unidad"),
  condition: z.enum(conditions).default("Por revisar"),
  brand: short,
  model: short,
  serial_number: short,
  material: short,
  color: short,
  dimensions: short,
  unit_value: money.default(0),
  ownership: z
    .enum(["Propietario", "Arrendatario", "Otro"])
    .default("Propietario"),
  inspected_on: z
    .union([date, z.literal(""), z.null()])
    .transform((v) => v || null)
    .default(null),
  notes: z.string().trim().max(5000).default(""),
  attributes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        value: z.string().trim().max(500),
      }),
    )
    .max(30)
    .default([]),
});
export const quickCatalog: Record<string, string[]> = {
  Eléctrico: [
    "Tomacorriente",
    "Interruptor",
    "Tablero eléctrico",
    "Breaker",
    "Punto de red",
    "Punto de televisión",
    "Timbre",
  ],
  Iluminación: [
    "Bombillo",
    "Luminaria de techo",
    "Aplique",
    "Lámpara",
    "Luz de emergencia",
  ],
  "Hidráulico y sanitario": [
    "Lavabo / lavamanos",
    "Inodoro",
    "Ducha",
    "Grifería",
    "Lavadero",
    "Sifón",
    "Llave de paso",
    "Espejo de baño",
    "Toallero",
    "Portarrollos",
    "División de baño",
  ],
  "Puertas y ventanas": [
    "Puerta",
    "Ventana",
    "Cerradura",
    "Llave",
    "Manija",
    "Bisagra",
    "Vidrio",
    "Persiana",
    "Reja",
  ],
  "Carpintería y clósets": [
    "Clóset",
    "Puerta de clóset",
    "Cajón",
    "Entrepaño",
    "Mueble empotrado",
    "Zócalo",
  ],
  "Pisos y acabados": [
    "Piso",
    "Pared",
    "Techo",
    "Pintura",
    "Enchape",
    "Guardaescoba",
  ],
  Cocina: [
    "Mesón",
    "Lavaplatos",
    "Mueble superior",
    "Mueble inferior",
    "Estufa",
    "Horno",
    "Campana extractora",
  ],
  Electrodomésticos: [
    "Nevera",
    "Lavadora",
    "Secadora",
    "Calentador",
    "Microondas",
    "Lavavajillas",
  ],
  Mobiliario: [
    "Cama",
    "Colchón",
    "Sofá",
    "Mesa",
    "Silla",
    "Escritorio",
    "Biblioteca",
  ],
  Seguridad: [
    "Detector de humo",
    "Extintor",
    "Cámara",
    "Alarma",
    "Citófono",
    "Control de acceso",
  ],
  Climatización: [
    "Aire acondicionado",
    "Ventilador",
    "Extractor",
    "Termostato",
  ],
  Exteriores: [
    "Portón",
    "Canaleta",
    "Bajante",
    "Tanque de agua",
    "Bomba de agua",
    "Cerca",
    "Jardinera",
  ],
  "Servicios y medidores": [
    "Medidor de agua",
    "Medidor de energía",
    "Medidor de gas",
    "Válvula de gas",
  ],
};
