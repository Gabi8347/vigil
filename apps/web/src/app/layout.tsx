import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "../components/Shell.tsx";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Vigil", template: "%s · Vigil" },
  description: "KAP finansal tablolarından hesaplanan bulgular. Yatırım tavsiyesi değildir.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
