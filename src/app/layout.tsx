import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Gmail AI | Leia Menos. Entenda Mais.",
  description: "Análise de e-mails com IA que mostra o que importa, o que fazer e o que responder.",
  keywords: ["gmail", "email", "ia", "gemini", "produtividade"],
  authors: [{ name: "Gmail AI" }],
  openGraph: {
    title: "Gmail AI | Leia Menos. Entenda Mais.",
    description: "Análise de e-mails com IA que mostra o que importa, o que fazer e o que responder.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
