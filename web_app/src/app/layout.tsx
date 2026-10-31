import type { Metadata } from "next";
import { ClerkClientWrapper } from "@/components/ClerkClientWrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartGrocer - Smart UK Grocery Assistant",
  description: "AI-powered UK grocery assistant with demand forecasting, budget tracking, and zero-waste chef recipes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#F8FAF6] text-[#1F2937] antialiased">
        <ClerkClientWrapper>{children}</ClerkClientWrapper>
      </body>
    </html>
  );
}
