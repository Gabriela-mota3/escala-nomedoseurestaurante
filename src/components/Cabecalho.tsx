"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { identidade } from "@/config/identidade";
import { menu } from "@/config/menu";

export function Cabecalho() {
  const caminho = usePathname();
  return (
    <header
      className="sticky top-0 z-10 text-white shadow-lg"
      style={{ background: "var(--cor-principal)" }}
    >
      <Link
        href="/"
        className="mx-auto flex max-w-3xl items-center gap-3 px-4 pt-3 pb-2"
        aria-label={`${identidade.nome}: início`}
      >
        {identidade.logoCabecalho ? (
          <Image
            src={identidade.logoCabecalho}
            alt=""
            width={198}
            height={215}
            priority
            className="h-14 w-auto"
          />
        ) : null}
        <span className="flex flex-col leading-tight">
          <span className="text-xl font-bold tracking-wide">{identidade.nome}</span>
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-white/80">
            Escala da equipe
          </span>
        </span>
      </Link>
      <nav className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 pb-2">
        {menu.map((item) => {
          const ativo = caminho === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
                ativo ? "bg-white/20 shadow-inner" : "text-white/85 active:bg-white/10"
              }`}
            >
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
