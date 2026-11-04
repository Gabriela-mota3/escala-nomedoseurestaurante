"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";
import type { Escala, Funcionario, Turno } from "@/lib/tipos";
import {
  DIAS_SEMANA,
  DIAS_SEMANA_CURTO,
  diaMes,
  diasDaSemana,
  hojeISO,
  horaCurta,
  inicioDaSemana,
  paraData,
  somarDias,
} from "@/lib/datas";
import { Painel } from "@/components/Painel";
import { turnoVisivel } from "@/config/restaurante";

const MENSAGEM_SEM_VARIAVEIS =
  "As variáveis do Supabase não foram configuradas. Veja a tela Início.";

type CelulaAberta = { data: string; turno: Turno };

function mensagemDeErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

/** "Ana Souza" -> "Ana S." (cabe na célula do celular) */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length > 1 ? `${partes[0]} ${partes[partes.length - 1][0]}.` : partes[0];
}

const chaveCelula = (data: string, turnoId: string) => `${data}|${turnoId}`;

export default function EscalaDaSemana() {
  const [segunda, setSegunda] = useState(() => inicioDaSemana(hojeISO()));
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [escalas, setEscalas] = useState<Escala[]>([]);
  const [carregando, setCarregando] = useState(() => variaveisConfiguradas());
  const [erro, setErro] = useState<string | null>(() =>
    variaveisConfiguradas() ? null : MENSAGEM_SEM_VARIAVEIS,
  );
  const [celula, setCelula] = useState<CelulaAberta | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const dias = useMemo(() => diasDaSemana(segunda), [segunda]);
  const hoje = hojeISO();

  // Turnos e funcionários: carregados uma vez.
  useEffect(() => {
    async function carregarBase() {
      if (!variaveisConfiguradas()) return;
      try {
        const db = supabase();
        const [t, f] = await Promise.all([
          db.from("turnos").select("id, nome, hora_inicio, hora_fim, ordem").order("ordem"),
          db.from("funcionarios").select("id, nome, funcao, telefone, cpf, ativo").order("nome"),
        ]);
        if (t.error) throw t.error;
        if (f.error) throw f.error;
        setTurnos((t.data ?? []).filter((turno) => turnoVisivel(turno.nome)));
        setFuncionarios(f.data ?? []);
      } catch (e) {
        setErro(`Não foi possível carregar turnos e equipe. ${mensagemDeErro(e)}`);
      }
    }
    carregarBase();
  }, []);

  // Escala da semana: recarregada ao trocar de semana.
  // Guarda a semana pedida por último, para ignorar respostas atrasadas.
  const ultimaSemanaPedida = useRef("");

  const carregarSemana = useCallback(async (inicio: string) => {
    if (!variaveisConfiguradas()) return;
    ultimaSemanaPedida.current = inicio;
    try {
      const { data, error } = await supabase()
        .from("escalas")
        .select("id, data, turno_id, funcionario_id")
        .gte("data", inicio)
        .lte("data", somarDias(inicio, 6));
      if (ultimaSemanaPedida.current !== inicio) return;
      if (error) throw error;
      setEscalas(data ?? []);
      setCarregando(false);
    } catch (e) {
      if (ultimaSemanaPedida.current !== inicio) return;
      setErro(`Não foi possível carregar a escala. ${mensagemDeErro(e)}`);
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca a escala ao abrir a tela e a cada troca de semana.
    const tarefa = async () => {
      await carregarSemana(segunda);
    };
    tarefa();
  }, [segunda, carregarSemana]);

  const funcionarioPorId = useMemo(
    () => new Map(funcionarios.map((f) => [f.id, f])),
    [funcionarios],
  );

  // Quem está em cada célula (dia + turno), em ordem alfabética.
  const porCelula = useMemo(() => {
    const mapa = new Map<string, Escala[]>();
    for (const e of escalas) {
      const chave = chaveCelula(e.data, e.turno_id);
      mapa.set(chave, [...(mapa.get(chave) ?? []), e]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) =>
        (funcionarioPorId.get(a.funcionario_id)?.nome ?? "").localeCompare(
          funcionarioPorId.get(b.funcionario_id)?.nome ?? "",
          "pt-BR",
        ),
      );
    }
    return mapa;
  }, [escalas, funcionarioPorId]);

  async function alternar(f: Funcionario) {
    if (!celula || salvandoId) return;
    const { data, turno } = celula;
    const existente = escalas.find(
      (e) => e.data === data && e.turno_id === turno.id && e.funcionario_id === f.id,
    );
    setSalvandoId(f.id);
    setErro(null);
    try {
      const db = supabase().from("escalas");
      if (existente) {
        const { error } = await db.delete().eq("id", existente.id);
        if (error) throw error;
        setEscalas((atual) => atual.filter((e) => e.id !== existente.id));
      } else {
        const { data: nova, error } = await db
          .insert({ data, turno_id: turno.id, funcionario_id: f.id })
          .select("id, data, turno_id, funcionario_id")
          .single();
        if (error) throw error;
        setEscalas((atual) => [...atual, nova]);
      }
    } catch (e) {
      setErro(`Não foi possível salvar. ${mensagemDeErro(e)}`);
      await carregarSemana(segunda);
    } finally {
      setSalvandoId(null);
    }
  }

  function trocarSemana(novaSegunda: string) {
    if (novaSegunda === segunda) return;
    if (variaveisConfiguradas()) setCarregando(true);
    setSegunda(novaSegunda);
  }

  const fecharCelula = useCallback(() => setCelula(null), []);

  // Na lista de escolha: ativos + inativos que já estavam escalados nessa célula.
  const opcoesDaCelula = useMemo(() => {
    if (!celula) return [];
    const escalados = new Set(
      (porCelula.get(chaveCelula(celula.data, celula.turno.id)) ?? []).map((e) => e.funcionario_id),
    );
    return funcionarios
      .filter((f) => f.ativo || escalados.has(f.id))
      .map((f) => ({ funcionario: f, marcado: escalados.has(f.id) }));
  }, [celula, funcionarios, porCelula]);

  const periodo = `${diaMes(dias[0])} a ${diaMes(dias[6])}/${dias[6].slice(0, 4)}`;
  const ehSemanaAtual = segunda === inicioDaSemana(hoje);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Escala da semana</h1>

      <div className="cartao space-y-3">
        <p className="text-center text-lg font-semibold">{periodo}</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="botao-secundario" onClick={() => trocarSemana(somarDias(segunda, -7))}>
            ◀ Anterior
          </button>
          <button type="button" className="botao-secundario" onClick={() => trocarSemana(somarDias(segunda, 7))}>
            Próxima ▶
          </button>
        </div>
        {!ehSemanaAtual && (
          <button type="button" className="botao w-full" onClick={() => trocarSemana(inicioDaSemana(hoje))}>
            Voltar para esta semana
          </button>
        )}
      </div>

      {erro && <p className="cartao border-red-200 bg-red-50 text-red-800">{erro}</p>}

      {!carregando && turnos.length === 0 && !erro && (
        <p className="cartao text-neutral-600">Nenhum turno cadastrado no banco.</p>
      )}

      {turnos.length > 0 && (
        <>
          <p className="text-sm text-neutral-600">
            Toque numa célula para escolher quem trabalha. Arraste a grade para o lado para ver
            todos os dias.
          </p>
          <div className={`overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm ${carregando ? "opacity-60" : ""}`}>
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 z-[1] border-b border-r border-neutral-200 bg-neutral-50 p-2 text-sm">
                    Turno
                  </th>
                  {dias.map((dia) => (
                    <th
                      key={dia}
                      className={`min-w-24 border-b border-neutral-200 p-2 text-center text-sm ${
                        dia === hoje ? "text-white" : "bg-neutral-50"
                      }`}
                      style={dia === hoje ? { background: "var(--cor-principal)" } : undefined}
                    >
                      <span className="block font-bold">{DIAS_SEMANA_CURTO[paraData(dia).getDay()]}</span>
                      <span className="block font-normal">{diaMes(dia)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {turnos.map((turno) => (
                  <tr key={turno.id}>
                    <th className="sticky left-0 z-[1] border-b border-r border-neutral-200 bg-neutral-50 p-2 align-top text-sm">
                      <span className="block font-bold">{turno.nome}</span>
                      <span className="block whitespace-nowrap text-xs font-normal text-neutral-600">
                        {horaCurta(turno.hora_inicio)}–{horaCurta(turno.hora_fim)}
                      </span>
                    </th>
                    {dias.map((dia) => {
                      const lista = porCelula.get(chaveCelula(dia, turno.id)) ?? [];
                      return (
                        <td key={dia} className="border-b border-neutral-200 p-1 align-top">
                          <button
                            type="button"
                            onClick={() => setCelula({ data: dia, turno })}
                            className="flex min-h-24 w-full flex-col items-stretch gap-1 rounded-lg p-1 text-left active:bg-neutral-100"
                            aria-label={`${turno.nome} de ${DIAS_SEMANA[paraData(dia).getDay()]} ${diaMes(dia)}: ${lista.length} escalados`}
                          >
                            {lista.map((e) => {
                              const f = funcionarioPorId.get(e.funcionario_id);
                              return (
                                <span
                                  key={e.id}
                                  className="block truncate rounded-md bg-neutral-100 px-2 py-1 text-sm"
                                >
                                  {f ? nomeCurto(f.nome) : "?"}
                                </span>
                              );
                            })}
                            {lista.length === 0 && (
                              <span className="flex flex-1 items-center justify-center text-2xl text-neutral-300">
                                +
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {celula && (
        <Painel
          titulo={`${celula.turno.nome} · ${DIAS_SEMANA[paraData(celula.data).getDay()]} ${diaMes(celula.data)}`}
          aoFechar={fecharCelula}
        >
          {opcoesDaCelula.length === 0 ? (
            <p className="text-neutral-600">Nenhum funcionário ativo. Cadastre na tela Equipe.</p>
          ) : (
            <ul className="space-y-2">
              {opcoesDaCelula.map(({ funcionario: f, marcado }) => (
                <li key={f.id}>
                  <label
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
                      marcado ? "border-neutral-400 bg-neutral-100" : "border-neutral-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-6 w-6 shrink-0"
                      style={{ accentColor: "var(--cor-principal)" }}
                      checked={marcado}
                      disabled={salvandoId !== null}
                      onChange={() => alternar(f)}
                    />
                    <span className="flex-1">
                      <span className="block font-semibold">{f.nome}</span>
                      <span className="block text-sm text-neutral-600">
                        {f.funcao}
                        {!f.ativo && " · desativado"}
                      </span>
                    </span>
                    {salvandoId === f.id && <span className="text-sm text-neutral-500">Salvando...</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
          {erro && <p className="mt-3 text-red-700">{erro}</p>}
          <button type="button" className="botao mt-4 w-full" onClick={fecharCelula}>
            Pronto
          </button>
        </Painel>
      )}
    </div>
  );
}
