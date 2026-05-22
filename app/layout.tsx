import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar Licitaciones Chile",
  description: "Busqueda y seguimiento moderno de licitaciones publicas de Mercado Publico Chile."
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
