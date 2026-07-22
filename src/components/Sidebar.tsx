"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/leads", label: "Leads", icon: "📋" },
  { href: "/buscas", label: "Buscas", icon: "🔍" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col py-6 px-4 gap-2">
      <div className="mb-6 px-2">
        <span className="text-base font-bold text-white tracking-tight">
          🔍 Finder Business
        </span>
      </div>

      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const ativo =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                ativo
                  ? "bg-zinc-800 text-white font-medium"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {link.icon} {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-2 text-xs text-zinc-600">v2.0.0</div>
    </aside>
  );
}
