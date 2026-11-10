import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "./globals.css";
import "./inventory.css";
import "./studio.css";
import "./growth.css";
import "./landing-motion.css";
export const metadata: Metadata = {
  applicationName: "Kevvio",
  title: "Kevvio · Gestión de inmuebles",
  description:
    "Tu portafolio inmobiliario, sus arriendos, pagos y documentos en un solo lugar.",
  openGraph: {
    siteName: "Kevvio",
    locale: "es_CO",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
