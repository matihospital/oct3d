import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Oct 3D — Precios de venta",
  description:
    "Consultá el precio público y mayorista sugerido de piezas 3D a partir de links de MakerWorld.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${display.variable} ${body.variable} h-full`}>
      <body className="min-h-full antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
