"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, variaveisConfiguradas } from "@/lib/supabase";
import { FUNCOES_PADRAO, type Funcionario } from "@/lib/tipos";
import { Painel } from "@/components/Painel";

type Formulario = {
  id: string | null; // null = funcionário novo
  nome: string;
  funcao: string;
  telefone: string;
};

const MENSAGEM_SEM_VARIAVEIS =
  "As variáveis do Supabase não foram configuradas. Veja a tela Início.";

const FORMULARIO_VAZIO: Formulario = { id: null, nome: "", funcao: "", telefone: "" };

function mensagemDeErro(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String(e.message);
  return String(e);
}

export default function Equipe() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [carregando, setCarregando] = useState(() => variaveisConfiguradas());
  const [erro, setErro] = useState<string | null>(() =>
    variaveisConfiguradas() ? null : MENSAGEM_SEM_VARIAVEIS,
  );
  const [formulario, setFormulario] = useState<Formulario | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState<string | null>(null);
  const [alterandoId, setAlterandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!variaveisConfiguradas()) return;
    try {
      const { data, error } = await supabase()
        .from("funcionarios")
        .select("id, nome, funcao, telefone, cpf, ativo")
        .order("nome");
      if (error) throw error;
      setFuncionarios(data ?? []);
      setErro(null);
    } catch (e) {
      setErro(`Não foi possível carregar a equipe. ${mensagemDeErro(e)}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    // Busca inicial da equipe; o estado só muda quando a resposta chega.
    const tarefa = async () => {
      await carregar();
    };
    tarefa();
  }, [carregar]);

  const ativos = funcionarios.filter((f) => f.ativo);
  const inativos = funcionarios.filter((f) => !f.ativo);

  // Funções que já existem no banco + funções padrão, sem repetir.
  const funcoes = useMemo(() => {
    const todas = new Set<string>(FUNCOES_PADRAO);
    funcionarios.forEach((f) => todas.add(f.funcao));
    return Array.from(todas).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [funcionarios]);

  function abrirNovo() {
    setErroFormulario(null);
    setFormulario({ ...FORMULARIO_VAZIO });
  }

  function abrirEdicao(f: Funcionario) {
    setErroFormulario(null);
    setFormulario({ id: f.id, nome: f.nome, funcao: f.funcao, telefone: f.telefone ?? "" });
  }

  const fecharFormulario = useCallback(() => setFormulario(null), []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!formulario) return;
    const nome = formulario.nome.trim();
    const funcao = formulario.funcao.trim();
    const telefone = formulario.telefone.trim();
    if (!nome) return setErroFormulario("Preencha o nome.");
    if (!funcao) return setErroFormulario("Escolha a função.");

    setSalvando(true);
    setErroFormulario(null);
    try {
      const dados = { nome, funcao, telefone: telefone || null };
      const db = supabase().from("funcionarios");
      const { error } = formulario.id
        ? await db.update(dados).eq("id", formulario.id)
        : await db.insert(dados);
      if (error) throw error;
      setFormulario(null);
      await carregar();
    } catch (e) {
      setErroFormulario(`Não foi possível salvar. ${mensagemDeErro(e)}`);
    } finally {
      setSalvando(false);
    }
  }

  async function mudarAtivo(f: Funcionario, ativo: boolean) {
    if (!ativo && !window.confirm(`Desativar ${f.nome}? Ele(a) deixa de aparecer na escala.`)) {
      return;
    }
    setAlterandoId(f.id);
    try {
      const { error } = await supabase().from("funcionarios").update({ ativo }).eq("id", f.id);
      if (error) throw error;
      await carregar();
    } catch (e) {
      setErro(`Não foi possível ${ativo ? "reativar" : "desativar"}. ${mensagemDeErro(e)}`);
    } finally {
      setAlterandoId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Equipe</h1>
        <button type="button" className="botao w-full sm:w-auto" onClick={abrirNovo}>
          + Adicionar funcionário
        </button>
      </div>

      {erro && <p className="cartao border-red-200 bg-red-50 text-red-800">{erro}</p>}
      {carregando && <p className="text-neutral-600">Carregando...</p>}

      {!carregando && !erro && ativos.length === 0 && (
        <p className="cartao text-neutral-600">Nenhum funcionário ativo. Toque em “Adicionar funcionário”.</p>
      )}

      <ul className="space-y-3">
        {ativos.map((f) => (
          <li key={f.id} className="cartao">
            <CartaoFuncionario funcionario={f} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="botao-secundario" onClick={() => abrirEdicao(f)}>
                Editar
              </button>
              <button
                type="button"
                className="botao-secundario"
                style={{ borderColor: "#b91c1c", color: "#b91c1c" }}
                disabled={alterandoId === f.id}
                onClick={() => mudarAtivo(f, false)}
              >
                Desativar
              </button>
            </div>
          </li>
        ))}
      </ul>

      {inativos.length > 0 && (
        <section className="space-y-3">
          <h2 className="pt-2 text-lg font-semibold text-neutral-600">
            Desativados ({inativos.length})
          </h2>
          <ul className="space-y-3">
            {inativos.map((f) => (
              <li key={f.id} className="cartao opacity-70">
                <CartaoFuncionario funcionario={f} />
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" className="botao-secundario" onClick={() => abrirEdicao(f)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="botao-secundario"
                    disabled={alterandoId === f.id}
                    onClick={() => mudarAtivo(f, true)}
                  >
                    Reativar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {formulario && (
        <Painel
          titulo={formulario.id ? "Editar funcionário" : "Novo funcionário"}
          aoFechar={fecharFormulario}
        >
          <form onSubmit={salvar} className="space-y-4">
            <label className="block">
              <span className="mb-1 block font-semibold">Nome</span>
              <input
                className="campo"
                value={formulario.nome}
                onChange={(e) => setFormulario({ ...formulario, nome: e.target.value })}
                autoComplete="off"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold">Função</span>
              <select
                className="campo"
                value={formulario.funcao}
                onChange={(e) => setFormulario({ ...formulario, funcao: e.target.value })}
                required
              >
                <option value="">Escolha...</option>
                {funcoes.map((funcao) => (
                  <option key={funcao} value={funcao}>
                    {funcao}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-semibold">Telefone</span>
              <input
                className="campo"
                type="tel"
                inputMode="tel"
                placeholder="(11) 91234-0000"
                value={formulario.telefone}
                onChange={(e) => setFormulario({ ...formulario, telefone: e.target.value })}
              />
            </label>
            {erroFormulario && <p className="text-red-700">{erroFormulario}</p>}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button type="button" className="botao-secundario" onClick={fecharFormulario}>
                Cancelar
              </button>
              <button type="submit" className="botao" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Painel>
      )}
    </div>
  );
}

function CartaoFuncionario({ funcionario: f }: { funcionario: Funcionario }) {
  return (
    <div>
      <p className="text-lg font-semibold">{f.nome}</p>
      <p className="text-neutral-700">{f.funcao}</p>
      {f.telefone ? (
        <a href={`tel:${f.telefone.replace(/[^\d+]/g, "")}`} className="text-base underline" style={{ color: "var(--cor-principal)" }}>
          {f.telefone}
        </a>
      ) : (
        <p className="text-neutral-500">Sem telefone</p>
      )}
    </div>
  );
}
