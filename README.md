# Scrapper da API de Pesquisa de Vagas Gupy

Interface estática que usa a API pública do [portal Gupy](https://portal.gupy.io) para listar vagas remotas. A página permite buscar vagas pelo título e filtrar pelo tipo de trabalho.

O projeto não usa framework nem processo de build. É HTML, CSS e JavaScript puro.

## Por que precisa de um servidor?

Este projeto resolve o problema na raiz: um servidor Node que **serve os arquivos estáticos** e **faz o proxy para a API do Gupy** no mesmo processo. Como o proxy roda na mesma origem que a página (`localhost:3000`), não existe bloqueio de CORS.

## Requisitos

- [Node.js](https://nodejs.org/) 16 ou superior (nenhuma dependência externa — usa apenas módulos nativos).

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

## Estrutura do Projeto

```text
gupy-scrapper/
├── server.js                 # Servidor local (estáticos + proxy)
├── api/
│   └── jobs.js               # Serverless function para o Vercel (importa de scripts/proxy.js)
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

- Cada requisição pede até `100` vagas (`limit=100`), que é o limite máximo aceito pela API.
- A paginação acontece no frontend. O backend busca as vagas e a interface divide os resultados em páginas de `20` itens. Assim, trocar de página não exige uma nova requisição.
- A busca por texto usa o parâmetro `jobName`.
- O filtro de tipo de trabalho envia `workplaceType`.
- Quando uma nova busca começa, a requisição anterior é cancelada via `AbortController`, evitando respostas fora de ordem quando você digita rápido ou troca de filtro.
- Busca, filtro e página atual ficam sincronizados na URL.

Por exemplo:

```text
?searchTerm=java&workplaceType=remote&page=3
```

Com isso, é possível compartilhar uma URL mantendo a mesma busca e o mesmo filtro. O histórico do navegador também funciona de forma consistente.

## Deploy no Vercel

O `vercel.json` aponta `public/` como diretório de estáticos.
O `api/jobs.js` é a serverless function que o Vercel executa na rota `/api/jobs` — ela importa a lógica de proxy de `scripts/proxy.js`. Em produção, o frontend usa proxies CORS públicos como fallback quando o proxy local não está disponível.

## Alternativa: extensão de navegador

Se por algum motivo você não puder rodar o servidor local, é possível usar uma extensão de "unblock CORS" no navegador. O código tenta automaticamente o fetch direto e cai em proxies públicos — mas o proxy local é a via confiável.

