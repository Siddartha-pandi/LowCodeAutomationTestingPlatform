import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/common/Providers";

export const metadata: Metadata = {
  title: "AgentFlow | Enterprise Browser Automation & Testing Platform",
  description: "Enterprise platform for visual browser flow automation, end-to-end regression testing, live DOM inspection, and self-healing test execution.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className="antialiased h-full overflow-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
