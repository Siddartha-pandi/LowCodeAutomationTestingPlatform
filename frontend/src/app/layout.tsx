import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/common/Providers";

export const metadata: Metadata = {
  title: "Enterprise Browser Automation & Deterministic Testing Platform",
  description: "Enterprise SaaS platform for visual browser flow automation, deterministic testing, DOM inspection, and rule-based self-healing with Zero-AI company data guarantee.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
