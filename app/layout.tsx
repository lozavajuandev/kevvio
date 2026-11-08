import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Raíz · Gestión de inmuebles",
  description:
    "Tu portafolio inmobiliario, sus arriendos, pagos y documentos en un solo lugar.",
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
