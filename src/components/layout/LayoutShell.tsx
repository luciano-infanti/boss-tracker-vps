"use client";

import { useState, useCallback, Suspense } from "react";
import type { ReactNode } from "react";
import { Menu, X, Skull } from "lucide-react";
import { Sidebar } from "./Sidebar";

interface LayoutShellProps {
  children: ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="relative flex flex-col min-h-screen">
      {/* Mobile header */}
      <header className="md:hidden sticky top-0 z-50 flex items-center h-14 px-4 bg-surface border-b border-border">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-md text-[#9ca3af] hover:text-white hover:bg-surface-hover transition-colors"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Skull className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-sm tracking-tight text-white">Boss Tracker</span>
        </div>
      </header>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 bottom-0 left-0 z-50 w-[260px]
          bg-surface/80 backdrop-blur-md border-r border-border
          transition-transform duration-300 ease-in-out
          md:translate-x-0
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Suspense fallback={null}>
          <Sidebar onClose={closeSidebar} />
        </Suspense>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:ml-[260px]">
        <div className="max-w-7xl mx-auto px-4 py-8 md:px-8 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
