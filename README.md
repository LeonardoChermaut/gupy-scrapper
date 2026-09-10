# Scrapper da api de pesquisa de Vagas Gupy

Interface estática que usa a API pública do [portal Gupy](https://portal.gupy.io) para listar vagas remotas. A página permite buscar vagas pelo título e filtrar pelo tipo de trabalho.

O projeto não usa framework nem processo de build. É HTML, CSS e JavaScript puro.

## Por que precisa de um servidor?

A API do Gupy (`https://portal.gupy.io/api/job-search/jobs`) não envia os cabeçalhos CORS necessários para permitir chamadas feitas diretamente pelo navegador a partir de outra origem.

Até seria possível usar um proxy público, como allorigins ou corsproxy.io, mas isso traz alguns problemas: esses serviços podem ficar instáveis, mais lentos em determinados horários ou limitar a quantidade de requisições.

Por isso, o projeto usa um proxy próprio no servidor. O arquivo `api/jobs.js` recebe a requisição do frontend, consulta o Gupy e devolve a resposta para a página. Como essa chamada passa pelo mesmo domínio da aplicação, o navegador não bloqueia a requisição por CORS.

Esse proxy funciona tanto com `vercel dev` durante o desenvolvimento quanto em produção na Vercel.

## Requisitos

- [Node.js](https://nodejs.org/) 16 ou superior, caso queira usar o servidor local ou o CLI da Vercel.
- Não é necessário executar `npm install`. O `api/jobs.js` usa apenas módulos nativos.

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

Essa opção é útil para testar localmente uma estrutura mais próxima do ambiente de produção. A Vercel serve os arquivos estáticos e executa a função de `/api/jobs`.

Os dois modos usam a porta `3000`. Portanto, escolha um deles por vez.

## Estrutura do projeto

```text
gupy-scrapper/
├── public/
│   ├── index.html          # Página principal
│   ├── css/
│   │   └── styles.css      # Estilos
│   └── js/
│       ├── config.js       # URLs, limites e filtros
│       ├── utils.js        # Funções auxiliares
│       ├── api.js          # Requisições à API
│       ├── ui.js           # Renderização da interface
│       └── app.js          # Estado, eventos e fluxo da aplicação
├── api/
│   └── jobs.js             # Proxy para a API do Gupy
├── scripts/
│   └── local-server.js     # Servidor local
├── vercel.json             # Configuração da Vercel
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

## Deploy na Vercel

O projeto já está organizado para a Vercel. A pasta `public/` é usada para os arquivos estáticos e `api/jobs.js` é executado como Serverless Function.

Para publicar:

```bash
vercel --prod
```

O `vercel.json` define `public/` como diretório de saída e desativa a detecção automática de framework.

### Sobre possíveis erros em produção

Dependendo de como o Gupy tratar as requisições vindas da infraestrutura da Vercel, podem ocorrer respostas `403` ou `429`. Isso pode acontecer por bloqueios ou limites aplicados ao tráfego de determinados IPs.

Se aparecer um erro como:

```text
[gupy] falhou via /api/jobs - HTTP 403
```

o problema provavelmente está entre a infraestrutura da Vercel e a API do Gupy, e não no frontend.

Uma alternativa nessa situação, seria mover o proxy para outra infraestrutura, como Cloudflare Workers. Essa troca pode ajudar caso o bloqueio esteja relacionado à origem das requisições.

## Alternativa: extensão de navegador

Também é possível usar uma extensão de navegador que altere as políticas de CORS. O `api.js` ainda possui tentativas de fallback usando proxies públicos quando a chamada direta não funciona.

Essa alternativa, porém, depende de serviços externos e pode deixar de funcionar sem aviso. Para uso normal, o proxy próprio é a opção mais previsível.
