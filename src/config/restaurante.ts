// Configurações da casa (Paris 6).

// Turnos que existem no banco mas não aparecem na grade da escala.
// Nada é apagado: para voltar a mostrar um turno, tire o nome desta lista.
export const turnosOcultos: string[] = ["Café"];

/** "Café" -> "cafe" (ignora maiúsculas, acentos e espaços nas pontas). */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function turnoVisivel(nome: string): boolean {
  const alvo = normalizar(nome);
  return !turnosOcultos.some((oculto) => normalizar(oculto) === alvo);
}
