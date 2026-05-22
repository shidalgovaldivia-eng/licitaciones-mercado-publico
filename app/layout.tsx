import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Licitaciones Chile",
  description: "Búsqueda y seguimiento moderno de licitaciones públicas de Mercado Público Chile."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
