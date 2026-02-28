"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Skull, LayoutDashboard, Crosshair } from "lucide-react";
import { WORLDS } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/previsoes", label: "Previsões", icon: Crosshair },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentWorldId = searchParams.get("worldId") || "1";

  return (
    <aside className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-white font-bold text-lg tracking-tight"
          onClick={onClose}
        >
          <Skull className="w-6 h-6 text-purple-400" />
          Boss Tracker
        </Link>
      </div>

      <nav className="px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/" && !searchParams.has("worldId")
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-purple-500/15 text-purple-400"
                  : "text-[#9ca3af] hover:text-white hover:bg-surface-hover/60"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 pt-2 pb-2">
        <span className="text-[10px] font-semibold text-[#9ca3af]/70 uppercase tracking-widest">
          Mundos
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
        <div className="space-y-0.5">
          {WORLDS.map((world) => {
            const isActive = currentWorldId === String(world.id) && pathname === "/";
            return (
              <Link
                key={world.id}
                href={`/?worldId=${world.id}`}
                onClick={onClose}
                className={`block px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                  isActive
                    ? "bg-purple-500/15 text-purple-400 font-medium"
                    : "text-[#9ca3af] hover:text-white hover:bg-surface-hover/60"
                }`}
              >
                {world.name}
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
