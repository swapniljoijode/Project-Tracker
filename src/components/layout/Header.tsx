"use client";

import { useState } from "react";
import { Search, Bell, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/projects": "Projects",
  "/reporting": "Reporting",
};

const PLACEHOLDERS: Record<string, string> = {
  "/": "Search repos, phases, or tasks...",
  "/projects": "Search repositories...",
  "/reporting": "Search events and history...",
};

export default function Header({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
}) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(true);

  const toggleDark = () => {
    setDarkMode((d) => {
      const next = !d;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  };

  const title = TITLES[pathname] ?? "Project Tracker";
  const placeholder = PLACEHOLDERS[pathname] ?? "Search...";

  return (
    <header className="h-16 fixed top-0 right-0 left-64 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-8 z-40">
      {/* Title + Search */}
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-50 shrink-0">{title}</h2>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs font-mono hover:text-zinc-800"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleDark}
          className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
        >
          {darkMode ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-500" />
          )}
        </button>

        <button className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800 mx-2" />

        {/* User avatar — replace with <img> once user provides image */}
        <div className="relative group">
          <div className="w-9 h-9 rounded-full bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-black text-xs font-bold cursor-pointer ring-offset-2 hover:ring-2 hover:ring-black dark:hover:ring-white">
            SJ
          </div>
          <div className="hidden group-hover:block absolute right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-3 text-xs z-50">
            <p className="font-bold text-zinc-900 dark:text-zinc-100">Swapnil Joijode</p>
            <p className="text-zinc-400 text-[10px] truncate mb-2">swapniljoijode22@gmail.com</p>
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2 text-[11px] text-zinc-500">
              GitHub: swapniljoijode
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
