import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PropTrader.AI - AI-Powered Trading Automation",
  description: "Natural language trading automation for prop traders. Describe your strategy. AI executes it perfectly. No code required.",
  keywords: ["prop trading", "trading automation", "AI trading", "futures trading", "prop firm challenge"],
  authors: [{ name: "PropTrader.AI" }],
  openGraph: {
    title: "PropTrader.AI - AI-Powered Trading Automation",
    description: "Natural language trading automation for prop traders. Describe your strategy. AI executes it perfectly.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PropTrader.AI",
    description: "Natural language trading automation for prop traders.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0e14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg-primary text-text-primary font-body antialiased">
        {children}
      </body>
    </html>
  );
}
