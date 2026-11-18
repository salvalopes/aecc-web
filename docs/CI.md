# CI do aecc-web e acoplamento com o aecc-api

## O gate `e2e`

`.github/workflows/deploy.yml` → job `e2e`: lint + tsc + Playwright contra uma stack E2E
levantada no runner por `scripts/ci/e2e-api.sh up` (Postgres descartável, aecc-api com
`ASPNETCORE_ENVIRONMENT=E2E`, readiness em `GET /api/categories`, `seed-e2e`).

A imagem da API **não é `:latest`**: está fixada por digest em `env.AECC_API_IMAGE` do job
`e2e`, que é a única fonte desse valor. Um deploy da API deixa de poder partir o gate sem
nenhuma alteração no web (foi o que aconteceu com o #34).

## Quem usa o `scripts/ci/e2e-api.sh`

| Repo     | Workflow                        | Imagem da API                                 |
| -------- | ------------------------------- | --------------------------------------------- |
| aecc-web | `deploy.yml` (job `e2e`)        | digest fixado (`AECC_API_IMAGE`)              |
| aecc-api | `pr-checks.yml` (job `e2e-web`) | construída a partir do commit do PR, sem push |

O aecc-api faz checkout do aecc-web **no `main`** e chama este script. Por isso, uma
mudança ao script ou aos specs do Playwright afeta os PRs do aecc-api a partir do momento
em que entra no `main` do web. Mantém a interface estável: subcomandos `up | logs | down`,
variáveis `AECC_API_IMAGE` e `E2E_SEED_PASSWORD`, API em `http://localhost:5080`.

## Atualizar o digest da API

Quando: depois de cada deploy do aecc-api que o web deva acompanhar, e obrigatoriamente
quando um PR do aecc-api muda um contrato que o web consome.

Ordem, quando um PR do aecc-api muda um contrato:

1. **PR no aecc-api.** O job `e2e-web` dos checks de PR corre o Playwright do web (`main`)
   contra a API do PR. Se falhar, a mudança parte o web tal como está. Ou é retrocompatível,
   ou o web tem de se adaptar primeiro. Nota: os checks do aecc-api não bloqueiam o merge
   (repo privado, sem GitHub Pro): são só aviso.
2. **Merge e deploy da API** (push para `main` do aecc-api → testes → `:latest` → servidor).
3. **PR no web que atualiza o digest**, que entra **depois** do deploy da API. Esse PR
   leva as adaptações do web ao novo contrato, se houver, e o gate valida-as contra a API
   nova antes do merge.

Obter o digest novo (qualquer um serve; devem coincidir):

- No log do run do aecc-api (job `build-and-deploy`, step "Build e Push API"):
  `"containerimage.digest": "sha256:…"`.
- No servidor, o que está em produção:

  ```bash
  TERM=xterm-256color ssh deploy@178.105.35.70 \
    "docker image inspect --format '{{index .RepoDigests 0}}' ghcr.io/salvalopes/aecc-api:latest"
  ```

- No log do run do gate, o step "Levantar a stack E2E" imprime `aecc-api: <imagem> @ <digest>`.

Depois, no `deploy.yml`, troca o valor de `AECC_API_IMAGE` (formato
`ghcr.io/salvalopes/aecc-api@sha256:<64 hex>`) e a linha `# Atual:` do comentário
(commit e data do deploy da API). Abre o PR. O gate corre contra o digest novo.

O aecc-api publica hoje só `:latest` (sem tags imutáveis `sha-…`), por isso o pin é por
digest. Se um dia publicar `sha-<commit>`, esta tag pode substituir o digest.
