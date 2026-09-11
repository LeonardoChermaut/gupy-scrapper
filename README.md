# Scrapper da api de pesquisa de Vagas Gupy

Interface estática que usa a API pública do [portal Gupy](https://portal.gupy.io) para listar vagas remotas. A página permite buscar vagas pelo título e filtrar pelo tipo de trabalho.

O projeto não usa framework nem processo de build. É HTML, CSS e JavaScript puro.

## Por que precisa de um servidor?

Este projeto resolve o problema na raiz: um servidor Node que
**serve os arquivos estáticos** e **faz o proxy para a API do Gupy** no mesmo
processo. Como o proxy roda na mesma origem que a página (`localhost:3000`),
não existe bloqueio de CORS.

## Requisitos

- [Node.js](https://nodejs.org/) 16 ou superior (nenhuma dependência externa —
  usa apenas módulos nativos).

## Como rodar

### Localmente, sem Vercel

```bash
node scripts/local-server.js
```

Depois, acesse:

`http://localhost:3000`

O script serve os arquivos de `public/` e também faz o proxy de `/api/jobs` para o Gupy, tudo no mesmo processo.

### Com `vercel dev`

```bash
vercel dev
```
gupy-scrapper/
├── server.js                 # Servidor local (estáticos + proxy)
├── scripts/
│   ├── proxy.js              # Lógica de proxy partilhada (buildUpstreamUrl, proxyToUpstream)
│   └── local-server.js       # Alternativa de servidor local (usa proxy.js)
├── public/
│   ├── index.html            # Página principal
│   ├── css/
│   │   └── styles.css        # Estilos
│   └── js/
│       ├── config.js         # Constantes (URLs, limites, filtros)
│       ├── utils.js          # Funções auxiliares (escape, datas, etc.)
│       ├── api.js            # Montagem de URL + fetch com fallback
│       ├── ui.js             # Renderização do DOM
│       └── app.js            # Estado + orquestração + eventos
├── vercel.json               # Configuração do deploy Vercel
└── README.md
```

A separação é simples: o que vai para o navegador fica em `public/`, o código do backend fica em `api/` e o servidor usado apenas no desenvolvimento fica em `scripts/`.

## Como a busca funciona

- Cada requisição pede até `100` vagas, que é o limite usado pela API.
- A paginação acontece no frontend. O backend busca as vagas e a interface divide os resultados em páginas de `20` itens. Assim, trocar de página não exige uma nova requisição.
- A busca por texto usa o parâmetro `jobName`.
- O filtro de tipo de trabalho usa `workplaceType`.
- Quando uma nova busca começa, a requisição anterior pode ser cancelada com `AbortController` e isso vair evitar que uma resposta antiga chegue depois e substitua o resultado mais recente.
- Busca, filtro e página atual ficam na URL.

Por exemplo:

```text
?searchTerm=java&workplaceType=remote&page=3
```

Com isso, é possível compartilhar uma URL mantendo a mesma busca e o mesmo filtro. O histórico do navegador também funciona de forma consistente.

- Cada requisição pede `limit=100` (máximo aceito pela API).
- A paginação é feita no frontend — as vagas são carregadas uma vez e
  paginadas localmente (20 por página).
- A busca por texto envia `jobName`; os chips enviam `workplaceType`.
- Requisições em andamento são canceladas via `AbortController` quando você
  digita rápido ou troca de filtro, evitando resposta fora de ordem.

## Deploy no Vercel

O `vercel.json` aponta `public/` como diretório de estáticos.
Em produção, o frontend usa proxies CORS públicos como fallback quando o
proxy local não está disponível.

## Alternativa: extensão de navegador

Se por algum motivo você não puder rodar o servidor local, é possível usar uma
extensão de "unblock CORS" no navegador. O código tenta automaticamente o
fetch direto e cai em proxies públicos — mas o proxy local é a via confiável.
