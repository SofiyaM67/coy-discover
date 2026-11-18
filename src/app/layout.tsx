import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import TabBar from "@/components/TabBar";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coy · Discover",
  description: "A swipe-based Discover tab prototype for Coy.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fffdfb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} antialiased`}>
        <div className="mx-auto flex h-dvh max-w-[480px] flex-col overflow-hidden">
          <main className="relative min-h-0 flex-1 overflow-y-auto">{children}</main>
          <TabBar />
        </div>
      </body>
    </html>
  );
}
