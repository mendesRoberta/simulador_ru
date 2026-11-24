"use client";

import {
  formatLunchClock,
  LONG_QUEUE_THRESHOLD,
  type SimSnapshot,
} from "@/engine/simulator";

interface AnalyticsSectionProps {
  snapshot: SimSnapshot;
}

function formatRho(rho: number): string {
  if (!Number.isFinite(rho)) return "∞";
  return `${(rho * 100).toFixed(2)}%`;
}

export function AnalyticsSection({ snapshot }: AnalyticsSectionProps) {
  const { distribution, little, kpis, markov, history, config, timeSec } =
    snapshot;

  // --- Donut Concêntrico do Sistema Principal (Fila Externa Wq vs Catraca) ---
  const ringR1 = 72; // Fila Externa (rosa)
  const ringR2 = 52; // Catraca (ciano)
  const c1 = 2 * Math.PI * ringR1;
  const c2 = 2 * Math.PI * ringR2;

  const qPct = Math.max(0, Math.min(100, distribution.queuePct));
  const cPct = Math.max(0, Math.min(100, distribution.turnstilePct));

  // --- Gráfico Histórico do Sistema ao Vivo (L = stateN) ---
  const chartW = 760;
  const chartH = 240;
  const padL = 46;
  const padR = 24;
  const padT = 28;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxTimeDomain = Math.max(
    300, // mínimo de 5 min no eixo X para leitura confortável
    snapshot.isOneHourComplete ? 3600 : timeSec
  );

  const rawMaxY = Math.max(
    LONG_QUEUE_THRESHOLD + 6,
    kpis.maxN,
    ...history.map((p) => p.stateN)
  );
  const stepY = rawMaxY <= 25 ? 5 : rawMaxY <= 60 ? 10 : 20;
  const maxY = Math.ceil((rawMaxY * 1.15) / stepY) * stepY;

  const toX = (t: number) =>
    padL + (Math.min(t, maxTimeDomain) / maxTimeDomain) * plotW;
  const toY = (val: number) =>
    padT + plotH - (Math.min(val, maxY) / maxY) * plotH;

  // Plota L (stateN = fila externa + catracas)
  const pathD =
    history.length > 0
      ? history
          .map((pt, idx) => {
            const x = toX(pt.timeSec).toFixed(1);
            const y = toY(pt.stateN).toFixed(1);
            return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : `M ${padL} ${padT + plotH}`;

  const areaD =
    history.length > 1
      ? `${pathD} L ${toX(history[history.length - 1].timeSec).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${toX(history[0].timeSec).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`
      : "";

  const criticalY = toY(LONG_QUEUE_THRESHOLD);
  const peakX = toX(kpis.maxNTimeSec);
  const peakY = toY(kpis.maxN);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));
  const xTicks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) =>
    Math.round(maxTimeDomain * f)
  );

  const peakLabelAnchorX = Math.min(
    chartW - 96,
    Math.max(padL + 10, peakX - 38)
  );
  const peakLabelY = Math.max(padT + 14, peakY - 14);

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* COLUNA ESQUERDA: Distribuição Temporal (Sistema Principal) + Lei de Little */}
      <div className="flex flex-col gap-6 lg:col-span-4">
        {/* Card 1: DISTRIBUIÇÃO TEMPORAL NO SISTEMA (Fila Externa + Catraca) */}
        <div className="arcade-card-shadow flex flex-col rounded-[8px] border-x-3 border-b-3 border-t-2 border-[#ff2a85] bg-[rgba(45,31,88,0.85)] p-4 backdrop-blur-[6px]">
          <div className="mb-3">
            <h3 className="font-pixel text-[10px] leading-[15px] text-[#ff2a85]">
              DISTRIBUIÇÃO TEMPORAL (W)
            </h3>
            <p className="font-mono-tech mt-1 text-[11px] text-[#94a3b8]">
              Sistema principal: Fila Externa + Catraca
            </p>
          </div>

          {/* SVG Donut Concêntrico (Wq vs Catraca) */}
          <div className="relative mx-auto my-2 flex size-[180px] items-center justify-center">
            <svg
              viewBox="0 0 180 180"
              className="size-full -rotate-90"
              role="img"
              aria-label={`Distribuição temporal no sistema principal: ${Math.round(qPct)}% fila externa e ${Math.round(cPct)}% catraca`}
            >
              <circle
                cx="90"
                cy="90"
                r={ringR1}
                fill="none"
                stroke="#1e1442"
                strokeWidth="12"
              />
              <circle
                cx="90"
                cy="90"
                r={ringR2}
                fill="none"
                stroke="#1e1442"
                strokeWidth="12"
              />

              {/* Arco 1: Fila Externa Wq (rosa) */}
              <circle
                cx="90"
                cy="90"
                r={ringR1}
                fill="none"
                stroke="#ff2a85"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c1}
                strokeDashoffset={c1 * (1 - qPct / 100)}
                className="transition-all duration-300"
              />

              {/* Arco 2: Catraca (ciano) */}
              <circle
                cx="90"
                cy="90"
                r={ringR2}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={c2}
                strokeDashoffset={c2 * (1 - cPct / 100)}
                className="transition-all duration-300"
              />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="font-pixel text-[11px] text-[#00f0ff]">
                TEMPO W
              </span>
              <span className="font-mono-tech mt-0.5 text-[10px] text-[#94a3b8]">
                {(distribution.avgTotalSec / 60).toFixed(2)}m TOTAL
              </span>
            </div>
          </div>

          {/* Lista de métricas de distribuição */}
          <div className="mt-3 flex flex-col gap-3.5 border-t border-[rgba(59,37,121,0.8)] pt-3">
            {/* Fila Externa (Wq) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[14px] text-[#f472b6]">
                  {Math.round(qPct)}%
                </span>
                <span className="font-mono-tech text-[12px] text-[#cbd5e1]">
                  Fila Externa (Wq)
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0f172a]">
                <div
                  className="h-full rounded-full bg-[#ec4899] transition-all duration-300"
                  style={{ width: `${qPct}%` }}
                />
              </div>
              <span className="font-mono-tech text-[10px] text-[#cbd5e1]">
                Espera até entrar na catraca (~
                {(distribution.avgQueueSec / 60).toFixed(2)} min)
              </span>
            </div>

            {/* Catraca (Tempo de serviço) */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-pixel text-[14px] text-[#00f0ff]">
                  {Math.round(cPct)}%
                </span>
                <span className="font-mono-tech text-[12px] text-[#cbd5e1]">
                  Catraca (Serviço)
                </span>
              </div>
              <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0f172a]">
                <div
                  className="h-full rounded-full bg-[#22d3ee] transition-all duration-300"
                  style={{ width: `${cPct}%` }}
                />
              </div>
              <span className="font-mono-tech text-[10px] text-[#cbd5e1]">
                Tempo de leitura na catraca (~
                {distribution.avgTurnstileSec < 60
                  ? `${distribution.avgTurnstileSec.toFixed(1)} seg`
                  : `${(distribution.avgTurnstileSec / 60).toFixed(2)} min`}
                )
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: LEI DE LITTLE (REFERÊNCIA TEÓRICA) */}
        <div className="arcade-card-shadow flex flex-col gap-2.5 rounded-[8px] border-x-3 border-b-3 border-t-2 border-[#ffe600] bg-[#150d30] p-4">
          <h3 className="font-pixel text-[9px] leading-[16px] text-[#ffe600]">
            LEI DE LITTLE (REFERÊNCIA TEÓRICA)
          </h3>

          <div className="flex flex-col gap-2 rounded-[4px] border border-[rgba(59,37,121,0.5)] bg-[#1e1442] p-3">
            <div className="flex items-start justify-between gap-2 text-[11px]">
              <span className="font-mono-tech text-[#94a3b8]">
                Taxa λ Efetiva:
              </span>
              <span className="font-mono-tech text-right font-bold text-[#e2e8f0]">
                {little.lambdaEffectivePerSec.toFixed(4)} alunos/seg
                <br />
                <span className="text-[#94a3b8]">
                  ({little.lambdaEffectivePerMin.toFixed(2)}/min)
                </span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-2 text-[11px]">
              <span className="font-mono-tech text-[#94a3b8]">
                Tempo Total W:
              </span>
              <span className="font-mono-tech text-right font-bold text-[#e2e8f0]">
                {little.avgTotalTimeSec.toFixed(1)} seg
                <br />
                <span className="text-[#94a3b8]">
                  ({(little.avgTotalTimeSec / 60).toFixed(2)} min — fila +
                  catraca)
                </span>
              </span>
            </div>

            <div className="flex items-start justify-between gap-2 border-t border-[#1e293b] pt-2 text-[11px]">
              <span className="font-mono-tech text-[#ffe600]">
                Referência L = λ·W:
              </span>
              <span className="font-mono-tech text-right font-bold text-[#ffe600]">
                {little.littleL.toFixed(1)} alunos
                <br />
                <span
                  className={`text-[10px] font-normal ${
                    little.isStable ? "text-[#94a3b8]" : "text-[#fca5a5]"
                  }`}
                >
                  {little.referenceLabel}
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-[#1e293b]/70 pt-1.5 text-[10px] text-[#94a3b8]">
              <span>L médio observado:</span>
              <span className="font-bold text-slate-300">
                {little.observedAvgL.toFixed(1)} al (agora: {little.currentL} al)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* COLUNA DIREITA: Histórico do Sistema ao Vivo (L) + KPIS + Cadeia de Markov */}
      <div className="flex flex-col gap-6 lg:col-span-8">
        {/* Card 3: HISTÓRICO DO SISTEMA AO VIVO (L) */}
        <div className="arcade-card-shadow flex flex-col gap-3 rounded-[10px] border-x-4 border-b-4 border-t-[3px] border-[#00f0ff] bg-[#150d30] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-pixel text-[12px] leading-[20px] text-[#00f0ff] sm:text-[14px]">
                HISTÓRICO DO SISTEMA AO VIVO (L)
              </h3>
            </div>
            <div className="font-mono-tech flex flex-wrap items-center gap-3 text-[11px] text-[#94a3b8]">
              <span>
                L atual:{" "}
                <strong className="text-[#00f0ff]">{markov.n} al</strong>
              </span>
              <span>
                Fila externa (Lq):{" "}
                <strong className="text-[#f472b6]">
                  {snapshot.externalQueue.length} al
                </strong>
              </span>
              <span>
                Pico L:{" "}
                <strong className="text-[#ff2a85]">{kpis.maxN} al</strong>
              </span>
            </div>
          </div>

          <div className="w-full rounded-[6px] border border-[rgba(59,37,121,0.5)] bg-[rgba(30,20,66,0.65)] p-2 sm:p-3">
            <svg
              viewBox={`0 0 ${chartW} ${chartH}`}
              className="h-[220px] w-full sm:h-[250px]"
              role="img"
              aria-label={`Gráfico histórico do sistema principal L (fila externa + catracas) ao longo do tempo. Pico máximo de ${kpis.maxN} alunos.`}
            >
              <defs>
                <linearGradient id="queueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.02" />
                </linearGradient>
                <filter
                  id="cyanGlow"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Faixa sombreada da janela de Pico (12h00–12h45 / 0–45 min) */}
              {config.arrivalMode === "peak_wave" && (
                <g>
                  <rect
                    x={toX(0)}
                    y={padT}
                    width={Math.max(
                      0,
                      toX(Math.min(2700, maxTimeDomain)) - toX(0)
                    )}
                    height={plotH}
                    fill="rgba(255, 42, 133, 0.1)"
                  />
                  <text
                    x={toX(0) + 6}
                    y={padT + 13}
                    fill="#ff5493"
                    fontSize="10"
                    fontFamily="var(--font-chivo-mono), monospace"
                  >
                    Janela de Pico (12h00–12h45)
                  </text>
                </g>
              )}

              {/* Linhas horizontais de grade + eixo Y */}
              {yTicks.map((val) => {
                const y = toY(val);
                return (
                  <g key={val}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={chartW - padR}
                      y2={y}
                      stroke="rgba(148, 163, 184, 0.16)"
                      strokeDasharray={val === 0 ? undefined : "3 4"}
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fill="#64748b"
                      fontSize="11"
                      fontFamily="var(--font-chivo-mono), monospace"
                    >
                      {String(val).padStart(2, "0")}
                    </text>
                  </g>
                );
              })}

              {/* Linha tracejada de referência de Fila Longa (L >= 10) */}
              <line
                x1={padL}
                y1={criticalY}
                x2={chartW - padR}
                y2={criticalY}
                stroke="#00f0ff"
                strokeOpacity="0.65"
                strokeDasharray="6 5"
                strokeWidth="1.5"
              />
              <text
                x={padL + 8}
                y={Math.max(padT + 12, criticalY - 6)}
                fill="#00f0ff"
                fontSize="11"
                fontFamily="var(--font-chivo-mono), monospace"
              >
                Limiar de Fila Longa (L = {LONG_QUEUE_THRESHOLD} discentes)
              </text>

              {/* Área sob a curva + Linha de L (stateN) */}
              {areaD && <path d={areaD} fill="url(#queueAreaGrad)" />}
              <path
                d={pathD}
                fill="none"
                stroke="#00f0ff"
                strokeWidth="2.4"
                strokeLinejoin="round"
                strokeLinecap="round"
                filter="url(#cyanGlow)"
              />

              {/* Marcador de Pico L em ALUNOS */}
              {history.length > 0 && (
                <g>
                  <line
                    x1={peakX}
                    y1={peakY}
                    x2={peakX}
                    y2={padT + plotH}
                    stroke="#ff2a85"
                    strokeDasharray="4 4"
                    strokeWidth="1.4"
                    strokeOpacity="0.85"
                  />
                  <circle
                    cx={peakX}
                    cy={peakY}
                    r="5.5"
                    fill="#ff2a85"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <rect
                    x={peakLabelAnchorX}
                    y={peakLabelY - 16}
                    width="82"
                    height="22"
                    rx="4"
                    fill="#150d30"
                    stroke="#ff2a85"
                    strokeWidth="1.5"
                  />
                  <text
                    x={peakLabelAnchorX + 41}
                    y={peakLabelY - 1}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontFamily="var(--font-press-start), monospace"
                  >
                    {kpis.maxN} al
                  </text>
                </g>
              )}

              {/* Eixo X (horários 12h00–13h00) */}
              {xTicks.map((sec) => {
                const x = toX(sec);
                return (
                  <text
                    key={sec}
                    x={x}
                    y={chartH - 10}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="11"
                    fontFamily="var(--font-chivo-mono), monospace"
                  >
                    {formatLunchClock(sec)}
                  </text>
                );
              })}

              {kpis.maxN > 0 && kpis.maxNTimeSec > 0 && (
                <text
                  x={Math.min(chartW - 55, Math.max(padL + 45, peakX))}
                  y={chartH - 23}
                  textAnchor="middle"
                  fill="#ff2a85"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="var(--font-chivo-mono), monospace"
                >
                  {formatLunchClock(kpis.maxNTimeSec)} (PICO)
                </text>
              )}
            </svg>
          </div>
        </div>

        {/* Linha inferior direita: KPIS + Cadeia de Markov */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          {/* Card 4: KPIS (foco em ρ_catracas, Lq complementar, Max L e Fila Longa L >= 10) */}
          <div className="arcade-card-shadow flex flex-col gap-3 rounded-[8px] border-x-3 border-b-3 border-t-2 border-[#00f0ff] bg-[#150d30] p-4 xl:col-span-6">
            <div className="flex items-center justify-between border-b border-[rgba(59,37,121,0.8)] pb-2">
              <h3 className="font-pixel text-[10px] tracking-[0.25px] text-[#00f0ff]">
                KPIS
              </h3>
              {kpis.turnstileOverloaded && (
                <span className="font-pixel animate-pulse rounded bg-[#ff3366] px-2 py-0.5 text-[8px] text-white">
                  ALERTA ρ ≥ 1
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* ρ_catracas */}
              <div
                className={`flex flex-col justify-between gap-2 rounded-[4px] border p-2.5 ${
                  kpis.turnstileOverloaded
                    ? "animate-pulse-alert border-[#ff3366] bg-[rgba(69,10,10,0.5)]"
                    : "border-[rgba(59,37,121,0.6)] bg-[#1e1442]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono-tech text-[10px] font-semibold text-[#cbd5e1]">
                    ρ_catracas
                  </span>
                  <span
                    className={`font-pixel text-[10px] ${
                      kpis.turnstileOverloaded
                        ? "text-[#ff3366]"
                        : "text-[#00f0ff]"
                    }`}
                  >
                    {formatRho(kpis.rhoTurnstiles)}
                  </span>
                </div>
                <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0f172a]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      kpis.turnstileOverloaded ? "bg-[#ff3366]" : "bg-[#00f0ff]"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Number.isFinite(kpis.rhoTurnstiles)
                          ? kpis.rhoTurnstiles * 100
                          : 100
                      )}%`,
                    }}
                  />
                </div>
                {kpis.turnstileOverloaded ? (
                  <span className="font-mono-tech text-[9px] font-bold text-[#fca5a5]">
                    ⚠ Saturação (ρ ≥ 1)
                  </span>
                ) : (
                  <span className="font-mono-tech text-[9px] text-[#94a3b8]">
                    Sistema estável (ρ &lt; 1)
                  </span>
                )}
              </div>

              {/* Indicador complementar: Fila Externa (Lq) */}
              <div className="flex flex-col justify-between gap-2 rounded-[4px] border border-[rgba(244,114,182,0.4)] bg-[#1e1442] p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono-tech text-[10px] font-semibold text-[#f9a8d4]">
                    Fila Externa (Lq)
                  </span>
                  <span className="font-pixel text-[10px] text-[#f472b6]">
                    {snapshot.externalQueue.length} al
                  </span>
                </div>
                <div className="flex items-end justify-between gap-1 text-[9px] text-[#94a3b8]">
                  <span className="font-mono-tech leading-[12px]">
                    Média Lq:{" "}
                    <strong className="text-slate-200">
                      {little.observedAvgLq.toFixed(1)} al
                    </strong>
                  </span>
                  <span className="font-mono-tech text-[#f9a8d4]">
                    Máx: {kpis.maxQueue}
                  </span>
                </div>
              </div>

              {/* Max L (Pico do Sistema) */}
              <div className="flex flex-col justify-between gap-2 rounded-[4px] border border-[rgba(239,68,68,0.45)] bg-[rgba(69,10,10,0.25)] p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono-tech text-[10px] font-semibold text-[#fca5a5]">
                    Max L (Pico)
                  </span>
                  <span className="font-pixel text-[10px] text-[#ff3366]">
                    {kpis.maxN} al
                  </span>
                </div>
                <div className="flex items-end justify-between gap-1">
                  <span className="font-mono-tech text-[9px] leading-[12px] text-[#94a3b8]">
                    Máx. no sistema
                    <br />
                    (fila + catraca)
                  </span>
                  <span className="font-pixel rounded-[4px] border border-[#991b1b] bg-[#450a0a] px-1.5 py-0.5 text-[8px] text-[#f87171]">
                    {formatLunchClock(kpis.maxNTimeSec)}
                  </span>
                </div>
              </div>

              {/* Fila Longa (L >= 10) + Amostragem minuto a minuto em Simular 1h */}
              <div className="flex flex-col justify-between gap-2 rounded-[4px] border border-[rgba(245,158,11,0.45)] bg-[#1e1442] p-2.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono-tech text-[10px] font-semibold text-[#fcd34d]">
                    Fila Longa
                  </span>
                  <span className="font-pixel text-[10px] text-[#ffe600]">
                    {kpis.longQueuePct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#0f172a]">
                  <div
                    className="h-full rounded-full bg-[#fbbf24] transition-all duration-300"
                    style={{ width: `${Math.min(100, kpis.longQueuePct)}%` }}
                  />
                </div>
                <span className="font-mono-tech text-[9px] leading-[11px] text-[#94a3b8]">
                  {kpis.minuteSampleCount > 0
                    ? `Tempo com L ≥ 10 al. (${kpis.longQueueMinuteCount}/${kpis.minuteSampleCount} min)`
                    : "Tempo com fila ≥ 10 al."}
                </span>
              </div>
            </div>
          </div>

          {/* Card 5: Cadeia de Markov */}
          <div className="arcade-card-shadow flex flex-col gap-3 rounded-[8px] border-x-3 border-b-3 border-t-2 border-[#ffe600] bg-[#150d30] p-4 xl:col-span-6">
            <div className="flex items-center justify-between border-b border-[rgba(59,37,121,0.8)] pb-2">
              <h3 className="font-pixel text-[10px] tracking-[0.25px] text-[#e0ca04]">
                Cadeia de Markov
              </h3>
              <span className="font-mono-tech text-[10px] text-[#94a3b8]">
                Fila + Catracas (c_efetivo = {markov.effectiveTurnstiles})
              </span>
            </div>

            <div className="flex flex-1 flex-col justify-between gap-2.5 rounded-[4px] border border-[rgba(59,37,121,0.5)] bg-[#1e1442] p-3">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono-tech text-[#94a3b8]">
                  Estado atual (L):
                </span>
                <span className="font-mono-tech font-bold text-[#e2e8f0]">
                  n = {markov.n} alunos (Lq = {snapshot.externalQueue.length})
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono-tech text-[#94a3b8]">Passo:</span>
                <span className="font-mono-tech font-bold text-[#e2e8f0]">
                  Δt = {markov.dt}s (μ = {markov.muPerTurnstile.toFixed(4)}{" "}
                  al/min)
                </span>
              </div>

              <div className="border-t border-[#1e293b] pt-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  <span className="font-mono-tech text-[#94a3b8]">
                    Transições:
                  </span>
                  <span className="font-mono-tech font-bold text-[#e2e8f0]">
                    <span className="text-[#f472b6]">
                      Sobe (a): {(markov.probUp * 100).toFixed(1)}%
                    </span>
                    {" | "}
                    <span className="text-[#34d399]">
                      Desce (s): {(markov.probDown * 100).toFixed(1)}%
                    </span>
                    {" | "}
                    <span className="text-[#cbd5e1]">
                      Fica: {(markov.probStay * 100).toFixed(1)}%
                    </span>
                  </span>
                </div>

                {/* Barra visual das probabilidades a + s + fica = 100% */}
                <div className="mt-2.5 flex h-[8px] w-full overflow-hidden rounded-full bg-[#0f172a]">
                  <div
                    className="h-full bg-[#ec4899] transition-all duration-200"
                    style={{ width: `${markov.probUp * 100}%` }}
                    title={`Sobe (a): ${(markov.probUp * 100).toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-[#10b981] transition-all duration-200"
                    style={{ width: `${markov.probDown * 100}%` }}
                    title={`Desce (s): ${(markov.probDown * 100).toFixed(1)}%`}
                  />
                  <div
                    className="h-full bg-[#4f46e5] transition-all duration-200"
                    style={{ width: `${markov.probStay * 100}%` }}
                    title={`Fica: ${(markov.probStay * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
