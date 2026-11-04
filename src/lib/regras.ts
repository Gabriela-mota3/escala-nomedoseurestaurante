// Verificação das regras da casa sobre a escala de uma semana.
// Só avisa: não impede ninguém de salvar.

import type { Escala, Funcionario, Turno } from "@/lib/tipos";
import { DIAS_SEMANA, DIAS_SEMANA_CURTO, diaMes, paraData, somarDias } from "@/lib/datas";
import { normalizar, type RegraMinimo, type RegrasDaCasa } from "@/config/restaurante";

export const chaveCelula = (data: string, turnoId: string) => `${data}|${turnoId}`;

export type TipoAlerta = "minimo" | "folga" | "fechar-abrir";

export type Alerta = {
  tipo: TipoAlerta;
  texto: string; // texto completo, para a lista de alertas
};

export type ResultadoRegras = {
  alertas: Alerta[];
  // Avisos curtos por célula (chave = data|turno), para mostrar dentro da grade.
  avisosPorCelula: Map<string, string[]>;
  // Funcionários em alerta em cada célula (nome aparece em vermelho).
  pessoasEmAlerta: Map<string, Set<string>>;
};

/** "Ana Souza" -> "Ana S." */
export function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
}

const rotulo = (iso: string) => `${DIAS_SEMANA_CURTO[paraData(iso).getDay()]} ${diaMes(iso)}`;

/** Quão específica é a regra: turno + dia (3) > só turno (2) > só dia (1) > geral (0). */
function especificidade(r: RegraMinimo): number {
  return (r.turno !== "todos" ? 2 : 0) + (r.dias !== "todos" ? 1 : 0);
}

/** Mínimos por função (nome normalizado) que valem para um turno num dia. */
function minimosDoTurno(regras: RegraMinimo[], turno: Turno, data: string) {
  const nomeDia = normalizar(DIAS_SEMANA[paraData(data).getDay()]);
  const melhores = new Map<string, { regra: RegraMinimo; nivel: number }>();
  for (const r of regras) {
    if (r.turno !== "todos" && normalizar(r.turno) !== normalizar(turno.nome)) continue;
    if (r.dias !== "todos" && !r.dias.some((d) => normalizar(d) === nomeDia)) continue;
    const funcao = normalizar(r.funcao);
    const nivel = especificidade(r);
    const atual = melhores.get(funcao);
    if (!atual || nivel > atual.nivel) melhores.set(funcao, { regra: r, nivel });
  }
  return Array.from(melhores.values()).map((m) => m.regra);
}

/**
 * Verifica a semana.
 * - dias: os 7 dias mostrados (segunda a domingo).
 * - escalas: as da semana, mais o domingo anterior e a segunda seguinte
 *   (para a regra de fechar e abrir na virada da semana).
 */
export function verificarSemana(params: {
  dias: string[];
  turnos: Turno[];
  funcionarios: Funcionario[];
  escalas: Escala[];
  regras: RegrasDaCasa;
}): ResultadoRegras {
  const { dias, turnos, funcionarios, escalas, regras } = params;
  const alertas: Alerta[] = [];
  const avisosPorCelula = new Map<string, string[]>();
  const pessoasEmAlerta = new Map<string, Set<string>>();
  const diasDaSemana = new Set(dias);
  const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));
  const nomeDe = (id: string) => nomeCurto(funcionarioPorId.get(id)?.nome ?? "?");

  const avisar = (chave: string, texto: string) =>
    avisosPorCelula.set(chave, [...(avisosPorCelula.get(chave) ?? []), texto]);
  const marcarPessoa = (chave: string, id: string) => {
    const conjunto = pessoasEmAlerta.get(chave) ?? new Set<string>();
    conjunto.add(id);
    pessoasEmAlerta.set(chave, conjunto);
  };

  // Quem está em cada célula.
  const porCelula = new Map<string, string[]>();
  for (const e of escalas) {
    const chave = chaveCelula(e.data, e.turno_id);
    porCelula.set(chave, [...(porCelula.get(chave) ?? []), e.funcionario_id]);
  }

  // 1. Mínimo de pessoas por turno e função.
  for (const turno of turnos) {
    for (const data of dias) {
      const chave = chaveCelula(data, turno.id);
      const presentes = porCelula.get(chave) ?? [];
      const faltas: string[] = [];
      for (const r of minimosDoTurno(regras.minimos, turno, data)) {
        const tem = presentes.filter(
          (id) => normalizar(funcionarioPorId.get(id)?.funcao ?? "") === normalizar(r.funcao),
        ).length;
        if (tem < r.minimo) faltas.push(`${r.minimo - tem} ${r.funcao}`);
      }
      if (faltas.length > 0) {
        avisar(chave, `Falta: ${faltas.join(", ")}`);
        alertas.push({
          tipo: "minimo",
          texto: `${turno.nome} ${rotulo(data)}: falta ${faltas.join(", ")}`,
        });
      }
    }
  }

  // 2. Folga mínima na semana (dia de folga = dia sem nenhum turno).
  if (regras.folgasMinimasPorSemana > 0) {
    const diasTrabalhados = new Map<string, Set<string>>();
    for (const e of escalas) {
      if (!diasDaSemana.has(e.data)) continue;
      const conjunto = diasTrabalhados.get(e.funcionario_id) ?? new Set<string>();
      conjunto.add(e.data);
      diasTrabalhados.set(e.funcionario_id, conjunto);
    }
    for (const [id, trabalhados] of diasTrabalhados) {
      const folgas = dias.length - trabalhados.size;
      if (folgas >= regras.folgasMinimasPorSemana) continue;
      const precisa = regras.folgasMinimasPorSemana;
      alertas.push({
        tipo: "folga",
        texto:
          folgas === 0
            ? `${nomeDe(id)} sem folga na semana`
            : `${nomeDe(id)} com ${folgas} folga(s); precisa de ${precisa}`,
      });
      for (const e of escalas) {
        if (e.funcionario_id === id && diasDaSemana.has(e.data)) {
          marcarPessoa(chaveCelula(e.data, e.turno_id), id);
        }
      }
    }
  }

  // 3. Fechar um dia e abrir o seguinte.
  const regra = regras.proibirFecharEAbrir;
  const fecha = regra && turnos.find((t) => normalizar(t.nome) === normalizar(regra.fecha));
  const abre = regra && turnos.find((t) => normalizar(t.nome) === normalizar(regra.abre));
  if (fecha && abre) {
    // Pares (dia que fecha, dia seguinte que abre) que tocam esta semana.
    const diasQueFecham = [somarDias(dias[0], -1), ...dias];
    for (const dataFecha of diasQueFecham) {
      const dataAbre = somarDias(dataFecha, 1);
      const chaveFecha = chaveCelula(dataFecha, fecha.id);
      const chaveAbre = chaveCelula(dataAbre, abre.id);
      const abrem = new Set(porCelula.get(chaveAbre) ?? []);
      for (const id of porCelula.get(chaveFecha) ?? []) {
        if (!abrem.has(id)) continue;
        const nome = nomeDe(id);
        alertas.push({
          tipo: "fechar-abrir",
          texto: `${nome} fecha ${rotulo(dataFecha)} e abre ${rotulo(dataAbre)}`,
        });
        for (const [data, chave] of [
          [dataFecha, chaveFecha],
          [dataAbre, chaveAbre],
        ]) {
          if (!diasDaSemana.has(data)) continue;
          avisar(chave, `${nome} fecha e abre`);
          marcarPessoa(chave, id);
        }
      }
    }
  }

  return { alertas, avisosPorCelula, pessoasEmAlerta };
}
