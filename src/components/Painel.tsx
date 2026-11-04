"use client";

import { useEffect } from "react";

// Painel que sobe de baixo da tela (no celular) ou aparece no centro (no computador).
// Usado para formulários e escolhas, sem depender de passar o mouse.
export function Painel({
  titulo,
  aoFechar,
  children,
}: {
  titulo: string;
  aoFechar: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aoFechar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={aoFechar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
          <h2 className="text-lg font-bold">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-2xl text-neutral-600 active:bg-neutral-100"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
