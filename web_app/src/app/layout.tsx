import type { Metadata } from "next";
import { ClerkClientWrapper } from "@/components/ClerkClientWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartGrocer - Smart UK Grocery Assistant",
  description:
    "AI-powered UK grocery assistant with demand forecasting, budget tracking, and zero-waste chef recipes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartGrocer",
  },
};

export const instant = false;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#84C225" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className="bg-[#F8FAF6] text-[#1F2937] antialiased">
        <ClerkClientWrapper>{children}</ClerkClientWrapper>
      </body>
    </html>
  );
}
