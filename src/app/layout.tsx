import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finder Business",
  description: "Prospecção B2B com IA — geração e gestão de leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} bg-zinc-950 text-zinc-100 min-h-screen flex`}>
        <ToastProvider>
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
