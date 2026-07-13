import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konjac",
  description: "A bilingual block editor for English and Japanese article translation.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
