// Identidade visual do restaurante.
// Para trocar: mude o nome e as cores abaixo e substitua os arquivos do logo
// na pasta public (ou deixe logo como null para mostrar só o nome).

export const identidade = {
  nome: "Paris 6",
  // Cor dos botões e do cabeçalho (formato #RRGGBB) · R109 G39 B28
  corPrincipal: "#6D271C",
  // Cor de fundo das páginas · R213 G178 B92
  corSecundaria: "#D5B25C",
  // Cor dos textos escritos direto sobre o fundo (escura, para ler bem)
  corTextoSobreFundo: "#4A3222",
  // Logo original (public/logo.png), ou null
  logo: "/logo.png" as string | null,
  // Versão branca do logo, usada sobre o cabeçalho colorido (public/logo-branco.png)
  logoCabecalho: "/logo-branco.png" as string | null,
};
