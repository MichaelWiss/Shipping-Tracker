import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shipping Tracker",
  description: "Fleet tracking dashboard for shipping and trade operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
