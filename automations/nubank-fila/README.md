# Automação: entrar na fila virtual (Nubank House)

Fila alvo: **Simulador Cockpit**
`https://filas.nubankhouse.com.br/filas/experiencia/ad365629-e1b2-479c-8fe4-dd2ca53aa178`

O script consulta `/api/experiencias` a cada poucos segundos. Quando a fila está `ativa` e há vaga para o seu grupo, ele envia o mesmo `POST /api/queue` que o botão "Entrar na fila virtual" do site. Ele tenta entrar uma única vez por vaga, para assim que consegue, e não contorna nenhuma regra do site (uma participação por pessoa e por experiência, limite de vagas, cidade do perfil).

## Pré-requisitos

- Node 18 ou superior, sem dependências.
- Cadastro e login feitos por você no site. O script reaproveita a sua sessão.

## Como pegar a sessão

1. Abra o site no navegador e faça login.
2. DevTools, aba Network, clique em qualquer requisição para `filas.nubankhouse.com.br` (por exemplo `me`).
3. Copie o valor do header `Cookie`.

Trate esse cookie como senha: não commite e não compartilhe. A sessão expira, então copie de novo se aparecer "Sessão inválida".

## Uso

```bash
export NUBANK_COOKIE='cole-o-header-cookie-aqui'
node automations/nubank-fila/entrar-na-fila.mjs
```

| Variável | Padrão | Função |
| --- | --- | --- |
| `NUBANK_COOKIE` | (obrigatória) | Header `Cookie` da sua sessão |
| `EVENTO_ID` | `ad365629-...` (Simulador Cockpit) | Outra fila, se quiser |
| `POLL_MS` | `3000` | Intervalo entre consultas (mínimo 1000) |
| `MAX_MINUTES` | `0` (sem limite) | Desiste depois desse tempo |
| `DRY_RUN` | `0` | Com `1`, só avisa quando houver vaga e não entra |

Códigos de saída: `0` entrou na fila, `1` falhou ou desistiu, `2` falta o cookie.

Depois de entrar, você tem 10 minutos após ser chamado para chegar à fila física.
