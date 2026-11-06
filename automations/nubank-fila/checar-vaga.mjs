#!/usr/bin/env node
// Checa (sem login) se a fila tem vaga. Saída: 0 = há vaga, 10 = sem vaga, 1 = erro.
const BASE_URL = (process.env.BASE_URL ?? "https://filas.nubankhouse.com.br").replace(/\/$/, "");
const EVENTO_ID = process.env.EVENTO_ID ?? "ad365629-e1b2-479c-8fe4-dd2ca53aa178";
const PARTICIPANTES = Number(process.env.PARTICIPANTES ?? 1);

try {
  const response = await fetch(`${BASE_URL}/api/experiencias`, { signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const experiencia = (await response.json()).find((item) => item.id === EVENTO_ID);
  if (!experiencia) throw new Error("Experiência não encontrada");
  const vagas = experiencia.availableQueueSpots ?? 0;
  const aberta = experiencia.filaStatus === "ativa" && vagas >= PARTICIPANTES;
  console.log(JSON.stringify({ title: experiencia.title, status: experiencia.filaStatus, vagas, aberta }));
  process.exit(aberta ? 0 : 10);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
