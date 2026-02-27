import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greek News Radar",
  description: "Daily Greek news intelligence dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
