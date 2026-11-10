import type { Metadata } from "next";
import Landing from "@/components/landing";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
  title: "Kevvio · Inmuebles, personas y arriendos en un solo lugar",
  description:
    "El espacio de trabajo del agente inmobiliario independiente: controla inmuebles, interesados, arrendatarios, contratos, cobros, pagos, inventario y documentos.",
};
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  if (params.vista || params.inmueble || params.seccion || params.crear) {
    const query = new URLSearchParams();
    for (const key of ["vista", "inmueble", "seccion", "crear"]) {
      const v = params[key];
      if (typeof v === "string") query.set(key, v);
    }
    redirect("/app?" + query);
  }
  return <Landing />;
}
