"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/reporting", label: "Reporting", icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 flex flex-col py-8 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 z-50">
      {/* Brand */}
      <div className="px-6 mb-8">
        <div className="flex items-center gap-2.5">
          <div>
            <h1 className="font-bold text-lg text-zinc-900 dark:text-white tracking-tight">
              Project Tracker
            </h1>
            <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              v1.0.0
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 space-y-1.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-sm ${
                active
                  ? "bg-zinc-100 dark:bg-zinc-800 text-black dark:text-white font-bold border-r-4 border-black dark:border-white"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
              }`}
            >
              <Icon
                className={`w-4 h-4 ${active ? "text-black dark:text-white" : "text-zinc-400 dark:text-zinc-500"}`}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-6 mt-auto">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/avatar.jpg"
            alt="Swapnil Joijode"
            className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
          />
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
              Swapnil Joijode
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-semibold truncate">
              Portfolio
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
