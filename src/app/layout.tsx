import type { Metadata } from "next";
import { Press_Start_2P, Chivo_Mono, VT323, Inter } from "next/font/google";
import "./globals.css";

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
  display: "swap",
});

const chivoMono = Chivo_Mono({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chivo-mono",
  display: "swap",
});

const vt323 = VT323({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-vt323",
  display: "swap",
});

const inter = Inter({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Simulador da Fila do Restaurante Universitário — UFOPA",
  description:
    "Simulador estocástico em 2 etapas (Teoria das Filas M/M/c + Cadeia de Markov + Lei de Little) da fila do Restaurante Universitário da UFOPA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${pressStart2P.variable} ${chivoMono.variable} ${vt323.variable} ${inter.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#5c4ee5] text-slate-100 selection:bg-[#ff2a85]/40 selection:text-white">
        {children}
      </body>
    </html>
  );
}
