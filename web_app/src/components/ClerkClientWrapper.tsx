"use client";

import React, { useEffect } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";
import { AuthScreen } from "@/components/AuthScreen";
import { Navigation } from "@/components/Navigation";
import { AIChatModal } from "@/components/AIChatModal";

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
  }, [getToken]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8FAF6] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#84C225] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-bold text-gray-500">Loading SmartGrocer...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <AuthScreen />;
  }

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
      <AuthenticatedApp>{children}</AuthenticatedApp>
    </ClerkProvider>
  );
}
