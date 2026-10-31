"use client";

import React, { useState } from "react";
import { SignIn, SignUp } from "@clerk/nextjs";
import { ShoppingBasket, CheckCircle2, Calculator, Clock, KeyRound, Copy, Check } from "lucide-react";

const TEST_USERS = [
  { id: "1", name: "User 1", email: "user1@gmail.com", pass: "GrocerPass@1" },
  { id: "2", name: "User 2", email: "user2@gmail.com", pass: "GrocerPass@2" },
  { id: "3", name: "User 3", email: "user3@gmail.com", pass: "GrocerPass@3" },
  { id: "4", name: "User 4", email: "user4@gmail.com", pass: "GrocerPass@4" },
  { id: "5", name: "User 5", email: "user5@gmail.com", pass: "GrocerPass@5" },
  { id: "6", name: "User 6", email: "user6@gmail.com", pass: "GrocerPass@6" },
  { id: "7", name: "User 7", email: "user7@gmail.com", pass: "GrocerPass@7" },
  { id: "8", name: "User 8", email: "user8@gmail.com", pass: "GrocerPass@8" },
  { id: "9", name: "User 9", email: "user9@gmail.com", pass: "GrocerPass@9" },
  { id: "10", name: "User 10", email: "user10@gmail.com", pass: "GrocerPass@10" },
];

export function AuthScreen() {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const copyCredentials = (user: typeof TEST_USERS[0]) => {
    navigator.clipboard.writeText(`${user.email}`);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF6] flex flex-col justify-between">
      {/* Top Hero Section (BigBasket Leaf Green #84C225) */}
      <div className="bg-[#84C225] text-white pt-8 pb-10 px-6 sm:px-12 rounded-b-3xl shadow-lg shadow-green-700/10">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/40 flex items-center justify-center shadow-inner">
              <ShoppingBasket className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none">SmartGrocer</h1>
              <p className="text-xs sm:text-sm font-semibold text-white/90 mt-1">⚡ Smart UK Grocery Assistant</p>
            </div>
          </div>

          <p className="text-sm sm:text-base text-white/95 font-medium mt-2 leading-relaxed">
            Smart ML bill estimates, pantry expiry tracking, zero-waste chef recipes, and basket optimization.
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 border border-white/30 backdrop-blur-xs">
              <CheckCircle2 className="w-3.5 h-3.5" /> 1,000+ UK Products
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 border border-white/30 backdrop-blur-xs">
              <Calculator className="w-3.5 h-3.5" /> Live Bill Predictor
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 border border-white/30 backdrop-blur-xs">
              <Clock className="w-3.5 h-3.5" /> Expiry Alerts
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 -mt-4 space-y-4">
        {/* Quick Test Accounts Card */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-[#84C225]" /> Seeded Test Accounts (Click to Copy Email)
            </span>
            <span className="text-[11px] font-bold text-gray-400">Password: GrocerPass@1..10</span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Pre-configured accounts with historical receipts, weekly budgets, and pantry items.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {TEST_USERS.map((u) => {
              const isCopied = copiedId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => copyCredentials(u)}
                  title={`Copy ${u.email}`}
                  className="px-2.5 py-2 rounded-xl text-xs font-bold bg-[#F1F8E9] text-[#689F38] border border-[#C5E1A5] hover:bg-[#84C225] hover:text-white transition-all flex flex-col items-center justify-center text-center cursor-pointer shadow-2xs group"
                >
                  <span className="flex items-center gap-1">
                    {u.name}
                    {isCopied ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-2.5 h-2.5 opacity-60" />}
                  </span>
                  <span className="text-[10px] opacity-75 font-normal mt-0.5">{isCopied ? "Copied!" : u.email.split("@")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clerk Sign In / Sign Up Form */}
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100 flex justify-center">
          {authMode === "signin" ? (
            <div className="w-full">
              <SignIn
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "w-full shadow-none border-0 p-0",
                    headerTitle: "text-gray-900 font-black text-lg",
                    headerSubtitle: "text-gray-500 text-xs",
                    formButtonPrimary:
                      "bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors",
                    footerActionLink: "text-[#689F38] font-bold hover:underline",
                  },
                }}
              />
              <div className="text-center pt-3 border-t border-gray-50 mt-3">
                <button
                  type="button"
                  onClick={() => setAuthMode("signup")}
                  className="text-xs font-bold text-[#689F38] hover:underline cursor-pointer"
                >
                  Don&apos;t have an account? Create one
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <SignUp
                routing="hash"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "w-full shadow-none border-0 p-0",
                    headerTitle: "text-gray-900 font-black text-lg",
                    headerSubtitle: "text-gray-500 text-xs",
                    formButtonPrimary:
                      "bg-[#84C225] hover:bg-[#689F38] text-white text-xs font-bold py-2.5 rounded-xl shadow-xs transition-colors",
                    footerActionLink: "text-[#689F38] font-bold hover:underline",
                  },
                }}
              />
              <div className="text-center pt-3 border-t border-gray-50 mt-3">
                <button
                  type="button"
                  onClick={() => setAuthMode("signin")}
                  className="text-xs font-bold text-[#689F38] hover:underline cursor-pointer"
                >
                  Already have an account? Sign In
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 flex items-center justify-center gap-1.5 border-t border-gray-100">
        <span>Secured with Clerk Auth • PostgreSQL & Express Backend</span>
      </footer>
    </div>
  );
}
