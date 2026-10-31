"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  Home,
  Search,
  ShoppingCart,
  Refrigerator,
  Sparkles,
  User,
  LogOut,
  ShoppingBasket,
} from "lucide-react";

const NAV_ITEMS = [
  { name: "Home", href: "/", icon: Home },
  { name: "Catalogue", href: "/catalogue", icon: Search },
  { name: "Lists", href: "/lists", icon: ShoppingCart },
  { name: "Pantry", href: "/pantry", icon: Refrigerator },
  { name: "Chef AI", href: "/ai", icon: Sparkles },
  { name: "Profile", href: "/profile", icon: User },
];

export function Navigation() {
  const pathname = usePathname();
  const { user } = useUser();

  return (
    <>
      {/* Top Header (Visible on all screens) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-[#84C225] flex items-center justify-center text-white shadow-sm shadow-green-600/20 group-hover:bg-[#689F38] transition-colors">
              <ShoppingBasket className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-gray-900 leading-none block">
                SmartGrocer
              </span>
              <span className="text-[10px] font-bold text-[#689F38] tracking-wider uppercase block mt-0.5">
                UK Assistant
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#F1F8E9] text-[#689F38] shadow-2xs"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-[#84C225]" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User Bar & Sign Out */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-800">
                  {user.fullName || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Shopper"}
                </span>
                <span className="text-[10px] text-gray-400">
                  {user.primaryEmailAddress?.emailAddress}
                </span>
              </div>
            )}

            <SignOutButton>
              <button
                type="button"
                title="Sign Out"
                className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </SignOutButton>
          </div>
        </div>
      </header>

      {/* Bottom Mobile Tab Bar (Fixed on mobile screens < md) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-100 shadow-lg px-2 py-1.5 flex items-center justify-around pb-safe">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? "text-[#689F38]" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <div
                className={`w-9 h-7 flex items-center justify-center rounded-full transition-all ${
                  isActive ? "bg-[#F1F8E9]" : ""
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? "text-[#84C225] stroke-[2.5]" : "text-gray-400"
                  }`}
                />
              </div>
              <span className={`text-[10px] mt-0.5 ${isActive ? "font-bold text-[#689F38]" : "font-medium"}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
