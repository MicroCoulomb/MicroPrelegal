import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MicroPrelegal | Mutual NDA Creator",
  description: "Prototype workflow for drafting and downloading a Mutual NDA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
