"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <Sidebar />
      <div className="ml-64 flex flex-col min-h-screen">
        <Header searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
        <main className="flex-1 pt-16 p-8">
          <div className="max-w-7xl mx-auto space-y-8 pb-12">{children}</div>
        </main>
        <footer className="py-4 text-center border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-mono text-zinc-400 uppercase tracking-widest bg-white dark:bg-zinc-950">
          Project Tracker • Swapnil Joijode • {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
