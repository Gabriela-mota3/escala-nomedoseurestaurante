// Configurações da casa (Paris 6).
// Para mudar uma regra, edite os valores abaixo (ou peça para a IA editar).

// Turnos que existem no banco mas não aparecem na grade da escala.
// Nada é apagado: para voltar a mostrar um turno, tire o nome desta lista.
export const turnosOcultos: string[] = ["Café"];

export type DiaDaSemana =
  | "Domingo"
  | "Segunda"
  | "Terça"
  | "Quarta"
  | "Quinta"
  | "Sexta"
  | "Sábado";

export type RegraMinimo = {
  turno: string | "todos"; // nome do turno, ex.: "Jantar"
  dias: DiaDaSemana[] | "todos";
  funcao: string; // ex.: "Salão"
  minimo: number; // mínimo de pessoas dessa função no turno
};

export type RegrasDaCasa = {
  // Mínimo de pessoas por turno e função.
  // Se mais de uma regra servir para o mesmo turno, dia e função, vale a mais
  // específica: turno + dia > só turno > só dia > geral ("todos" e "todos").
  minimos: RegraMinimo[];
  // Dias sem nenhum turno que cada funcionário precisa ter na semana (0 = sem regra).
  folgasMinimasPorSemana: number;
  // Quem trabalha no turno "fecha" não pode trabalhar no turno "abre" do dia seguinte.
  // Use null para desligar esta regra.
  proibirFecharEAbrir: { fecha: string; abre: string } | null;
};

export const regrasDaCasa: RegrasDaCasa = {
  minimos: [
    { turno: "Jantar", dias: ["Sexta", "Sábado"], funcao: "Salão", minimo: 3 },
    { turno: "Jantar", dias: ["Sexta", "Sábado"], funcao: "Cozinha", minimo: 2 },
    { turno: "todos", dias: "todos", funcao: "Salão", minimo: 2 },
    { turno: "todos", dias: "todos", funcao: "Cozinha", minimo: 1 },
  ],
  folgasMinimasPorSemana: 1,
  proibirFecharEAbrir: { fecha: "Jantar", abre: "Almoço" },
};

/** "Café" -> "cafe" (ignora maiúsculas, acentos e espaços nas pontas). */
export function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

export function turnoVisivel(nome: string): boolean {
  const alvo = normalizar(nome);
  return !turnosOcultos.some((oculto) => normalizar(oculto) === alvo);
}
