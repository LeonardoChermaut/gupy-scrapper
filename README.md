# Vagas remotas — Gupy

Interface estática que consome a API pública do [portal.gupy.io](https://portal.gupy.io)
para listar vagas remotas, com busca por título e filtro por tipo de trabalho.

## Por que preciso rodar um servidor?

A API do Gupy (`https://portal.gupy.io/api/job-search/jobs`) **não envia
cabeçalhos CORS**, então o navegador bloqueia chamadas diretas de qualquer
página hospedada em outro domínio. Pra tentar contornar fiz com proxies
públicos (allorigins, corsproxy.io etc.) que é instável: eles caem, ficam lentos
ou limitam requisições.

Este projeto resolve o problema na raiz: um servidor Node (`server.js`) que
**serve os arquivos estáticos** e **faz o proxy para a API do Gupy** no mesmo
processo. Como o proxy roda na mesma origem que a página (`localhost:3000`),
não existe bloqueio de CORS.

## Requisitos

- [Node.js](https://nodejs.org/) 16 ou superior (nenhuma dependência externa —
  `server.js` usa apenas módulos nativos).

## Como rodar

```bash
node server.js
```

Depois abra <http://localhost:3000>.

## Estrutura

```
gupy-vagas/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos
├── js/
│   ├── config.js       # Constantes (URLs, limites, filtros)
│   ├── utils.js        # Funções auxiliares (escape, datas, etc.)
│   ├── api.js          # Montagem de URL + fetch com fallback
│   ├── ui.js           # Renderização do DOM
│   └── app.js          # Estado + orquestração + eventos
├── server.js           # Servidor estático + proxy CORS (Node)
└── README.md
```

## Como funciona a busca

- Cada requisição pede `limit=100` (máximo aceito pela API).
- A paginação usa `offset = (página - 1) * 100` — a API do portal usa
  `offset`/`limit`, não `page`.
- O total de páginas vem do campo `total`/`pagination.total` da resposta, não
  do número de itens já carregados.
- A busca por texto envia `jobName`; os chips enviam `workplaceType`.
- Requisições em andamento são canceladas via `AbortController` quando você
  digita rápido ou troca de filtro, evitando resposta fora de ordem.


## Alternativa: extensão de navegador

Se por algum motivo você não puder rodar o `server.js`, é possível usar uma
extensão de "unblock CORS" no navegador. O código tenta automaticamente o
fetch direto e cai em proxies públicos — mas o proxy local é a via confiável.