"use client";

import React from "react";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Lock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

interface AuthGateProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function AuthGate({ title, description, children }: AuthGateProps) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#84C225] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <span className="text-xs font-bold text-gray-500">Loading SmartGrocer...</span>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#F1F8E9] text-[#689F38] border border-[#C5E1A5] flex items-center justify-center mx-auto shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-snug">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium leading-relaxed">
              {description}
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <SignInButton mode="modal">
              <button
                type="button"
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-[#84C225] hover:bg-[#689F38] text-white shadow-sm shadow-green-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Sign In to Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </SignInButton>

            <SignUpButton mode="modal">
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 transition-all cursor-pointer"
              >
                Create a Free Account
              </button>
            </SignUpButton>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-2 text-[11px] font-semibold text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-[#84C225]" />
            <span>Secure Authentication via Clerk</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
