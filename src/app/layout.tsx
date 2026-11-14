import type { Metadata, Viewport } from "next";
import { Geist, Mountains_of_Christmas } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const display = Mountains_of_Christmas({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-display",
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "Secret Santa",
  description: "A Christmas secret santa for the friend circle.",
};

export const viewport: Viewport = {
  themeColor: "#07140f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
