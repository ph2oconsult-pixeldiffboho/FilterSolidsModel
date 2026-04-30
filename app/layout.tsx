import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SHC Calculator — Dual & Triple Media RGFs",
  description: "Solids holding capacity model and benchmark tool for rapid gravity filters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
