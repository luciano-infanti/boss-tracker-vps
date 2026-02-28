import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LayoutShell } from "@/components/layout/LayoutShell";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RubinOT Boss Tracker",
  description:
    "Track boss spawns and kill statistics across all RubinOT game worlds",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans`}>
        <div
          className="fixed inset-0 z-[-1] bg-cover bg-center opacity-30 pointer-events-none"
          style={{ backgroundImage: "url('/background.png')" }}
          aria-hidden="true"
        />
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
