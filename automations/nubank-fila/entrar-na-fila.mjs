#!/usr/bin/env node
// Entra na fila virtual da Nubank House assim que houver vaga.
// Uso: NUBANK_COOKIE='...' node entrar-na-fila.mjs   (veja README.md)

const BASE_URL = (process.env.BASE_URL ?? "https://filas.nubankhouse.com.br").replace(/\/$/, "");
const EVENTO_ID = process.env.EVENTO_ID ?? "ad365629-e1b2-479c-8fe4-dd2ca53aa178";
const COOKIE = process.env.NUBANK_COOKIE?.trim();
const POLL_MS = Math.max(1000, Number(process.env.POLL_MS ?? 3000));
const MAX_MINUTES = Number(process.env.MAX_MINUTES ?? 0);
const DRY_RUN = process.env.DRY_RUN === "1";

const log = (...args) => console.log(`[${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}]`, ...args);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!COOKIE) {
  console.error("Defina NUBANK_COOKIE com o header Cookie da sua sessão logada (veja README.md).");
  process.exit(2);
}

async function api(path, { method = "GET", body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: COOKIE,
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; fila-helper)",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, ok: response.ok, data };
}

async function loadUser() {
  const { status, ok, data } = await api("/api/cadastro/me");
  if (status === 401 || !ok || !data.user) {
    throw new Error("Sessão inválida ou expirada. Faça login no site e copie o cookie de novo.");
  }
  const user = data.user;
  return {
    email: user.email?.trim().toLowerCase(),
    nome: [user.nome, user.sobrenome].map((part) => part?.trim() ?? "").filter(Boolean).join(" ") || user.nome?.trim() || "",
    participantes: user.participantes ?? 1,
    state: user.state?.trim().toUpperCase() ?? "",
  };
}

async function alreadyWaiting(email) {
  const { data } = await api(`/api/queue?eventoId=${encodeURIComponent(EVENTO_ID)}`).catch(() => ({ data: {} }));
  return Object.values(data.entries ?? {}).some(
    (entry) => entry.status === "aguardando" && entry.email?.trim().toLowerCase() === email,
  );
}

async function tryJoin(user) {
  const { status, ok, data } = await api("/api/queue", {
    method: "POST",
    body: { eventoId: EVENTO_ID, email: user.email, nome: user.nome },
  });
  if (ok || data.code === "ALREADY_IN_QUEUE") return "joined";
  if (data.code === "ALREADY_ENTERED_TODAY") return "already-participated";
  if (status === 401) throw new Error("Sessão expirou durante a execução.");
  const transient = status >= 500 || status === 408 || status === 429;
  if (!transient) {
    log(`Entrada recusada (HTTP ${status}${data.code ? `, ${data.code}` : ""}): ${data.error ?? "sem detalhes"}`);
    return "rejected";
  }
  return (await alreadyWaiting(user.email)) ? "joined" : "retry";
}

async function main() {
  const user = await loadUser();
  log(`Logado como ${user.nome || "(sem nome)"} <${user.email}> | participantes: ${user.participantes}`);

  const deadline = MAX_MINUTES > 0 ? Date.now() + MAX_MINUTES * 60_000 : Infinity;
  let lastState = "";

  while (Date.now() < deadline) {
    try {
      const { data: experiencias } = await api("/api/experiencias");
      const experiencia = (Array.isArray(experiencias) ? experiencias : []).find((item) => item.id === EVENTO_ID);

      if (!experiencia) {
        log("Experiência não encontrada na listagem.");
      } else {
        const vagas = experiencia.availableQueueSpots ?? experiencia.checkInsRestantes ?? 0;
        const state = `${experiencia.title} | fila ${experiencia.filaStatus} | vagas ${vagas}`;
        if (state !== lastState) {
          log(state);
          lastState = state;
        }

        if (experiencia.filaStatus === "ativa" && vagas >= user.participantes) {
          if (DRY_RUN) {
            log("DRY_RUN: há vaga, mas não vou entrar.");
            return 0;
          }
          log("Vaga disponível, tentando entrar...");
          const result = await tryJoin(user);
          if (result === "joined") {
            log(`Você está na fila! Acompanhe em ${BASE_URL}/filas/espera?experiencia=${EVENTO_ID}`);
            return 0;
          }
          if (result === "already-participated") {
            log("Você já participou desta ativação hoje.");
            return 1;
          }
          if (result === "rejected") return 1;
        }
      }
    } catch (error) {
      if (/Sessão/.test(error.message)) throw error;
      log(`Falha temporária: ${error.message}`);
    }
    await sleep(POLL_MS + Math.floor(Math.random() * 500));
  }

  log("Tempo máximo atingido sem conseguir entrar na fila.");
  return 1;
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error.message);
    process.exit(1);
  },
);
