import type { Metadata, Viewport } from "next";
import "./globals.css";
import { identidade } from "@/config/identidade";
import { Cabecalho } from "@/components/Cabecalho";

export const metadata: Metadata = {
  title: `Escala · ${identidade.nome}`,
  description: "Sistema de escala de funcionários",
};

// Barra do navegador do celular na cor principal.
export const viewport: Viewport = {
  themeColor: identidade.corPrincipal,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // As cores da identidade viram variáveis CSS para toda a aplicação.
  const estilo = {
    "--cor-principal": identidade.corPrincipal,
    "--cor-secundaria": identidade.corSecundaria,
    "--cor-texto-fundo": identidade.corTextoSobreFundo,
  } as React.CSSProperties;

  return (
    <html lang="pt-BR" className="h-full antialiased" style={estilo}>
      <body className="flex min-h-full flex-col">
        <Cabecalho />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5">{children}</main>
        <footer className="texto-fundo px-4 py-6 text-center text-sm">
          {identidade.nome} · sistema de escala
        </footer>
      </body>
    </html>
  );
}
