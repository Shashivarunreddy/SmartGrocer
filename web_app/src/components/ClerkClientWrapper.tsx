"use client";

import React, { useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";
import { Navigation } from "@/components/Navigation";
import { AIChatModal } from "@/components/AIChatModal";

function AppLayout({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  return (
    <div className="min-h-screen bg-[#F8FAF6] text-[#1F2937] flex flex-col antialiased pb-20 md:pb-6">
      <Navigation />
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">{children}</main>
      <AIChatModal />
    </div>
  );
}

export function ClerkClientWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "pk_test_Y29tcGxldGUtcGlwZWZpc2gtNjk5MC5jbGVyay5hY2NvdW50cy5kZXYk";

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <AppLayout>{children}</AppLayout>
    </ClerkProvider>
  );
}

