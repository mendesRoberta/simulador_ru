"use client";

import { formatWaitCompact, type SimSnapshot } from "@/engine/simulator";
import { GhostSprite } from "./GhostSprite";

interface SimulationArenaProps {
  snapshot: SimSnapshot;
}

const MAX_VISIBLE_SPRITES = 8;

export function SimulationArena({ snapshot }: SimulationArenaProps) {
  const {
    externalQueue,
    turnstiles,
    buffetStudents,
    config,
    timeSec,
    distribution,
    kpis,
    buffetBlocked,
  } = snapshot;

  // Fase 1: Fila externa (mostra até 7 fantasmas rosa + 1 roxo "PRÓX" na frente da fila + "+X...")
  const nextQueueStudent = externalQueue[0] ?? null;
  const waitingBehind = externalQueue.slice(1, MAX_VISIBLE_SPRITES).reverse();
  const queueOverflow = Math.max(0, externalQueue.length - MAX_VISIBLE_SPRITES);

  // Fase 3: Buffet (mostra até 7 fantasmas rosa + 1 roxo "PRÓX" próximo de sair + "+X...")
  const nextBuffetStudent = buffetStudents[0] ?? null;
  const buffetBehind = buffetStudents.slice(1, MAX_VISIBLE_SPRITES).reverse();
  const buffetOverflow = Math.max(0, buffetStudents.length - MAX_VISIBLE_SPRITES);
  const buffetOccPct = Math.min(
    100,
    Math.round((buffetStudents.length / Math.max(1, config.buffetCapacity)) * 100)
  );

  return (
    <section className="arcade-arena-shadow w-full rounded-[14px] border-4 border-[rgba(45,31,88,0.85)] bg-[rgba(45,31,88,0.82)] p-4 sm:p-6">
      <div className="flex flex-col gap-6 rounded-[12px] border-[3px] border-[rgba(49,46,129,0.65)] bg-[#2d1f58] p-4 sm:p-6">
        {/* FASE 1: FILA EXTERNA */}
        <div className="flex flex-col gap-3 rounded-[7px] border-[1.7px] border-[#1e1b4b] bg-[rgba(21,13,48,0.65)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-pixel text-[13px] leading-[22px] text-[#f472b6] sm:text-[15px]">
                FASE 1: FILA EXTERNA
              </h3>
              <div className="rounded-[6px] border border-[#334155] bg-[#1e1442] px-3 py-0.5">
                <span className="font-mono-tech text-[13px] text-[#94a3b8] sm:text-[15px]">
                  Tempo médio de espera:{" "}
                  <strong className="text-slate-200">
                    {(distribution.avgQueueSec / 60).toFixed(1)} min
                  </strong>
                </span>
              </div>
            </div>

            <span className="font-pixel text-[12px] text-[#ffe600] sm:text-[14px]">
              {externalQueue.length}{" "}
              {externalQueue.length === 1 ? "ALUNO NA FILA" : "ALUNOS NA FILA"}
            </span>
          </div>

          <div className="arcade-scroll flex min-h-[86px] items-center gap-4 overflow-x-auto px-1 py-2">
            {externalQueue.length === 0 ? (
              <p className="font-mono-tech text-[13px] text-slate-400">
                Fila externa vazia — discentes avançam direto para as catracas.
              </p>
            ) : (
              <>
                {waitingBehind.map((student, idx) => (
                  <GhostSprite
                    key={student.id}
                    variant="pink"
                    lookLeft={idx % 2 === 1}
                    caption={formatWaitCompact(timeSec - student.arrivedAt)}
                  />
                ))}
                {nextQueueStudent && (
                  <GhostSprite
                    key={nextQueueStudent.id}
                    variant="purple"
                    caption="PRÓX"
                    highlighted
                  />
                )}
                {queueOverflow > 0 && (
                  <span className="font-pixel shrink-0 pl-2 text-[16px] text-[#64748b] sm:text-[18px]">
                    +{queueOverflow}...
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* FASE 2 (CATRACAS) + FASE 3 (BUFFET) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* FASE 2: CATRACAS (4 colunas) */}
          <div className="flex flex-col gap-3 rounded-[7px] border-[1.7px] border-[rgba(59,37,121,0.85)] bg-[rgba(21,13,48,0.72)] p-4 sm:p-5 lg:col-span-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-pixel text-[12px] leading-[20px] text-[#00f0ff] sm:text-[14px]">
                FASE 2: CATRACAS
              </h3>
              <span className="font-mono-tech text-[14px] font-semibold text-[#34d399]">
                {config.turnstileServiceTimeSec.toFixed(1)}s
              </span>
            </div>

            {/* Ajuste obrigatório #2: Numeração dinâmica C-01, C-02, C-03, C-04, C-05 */}
            <div className="flex flex-col gap-2.5">
              {turnstiles.map((slot) => {
                const styleMap = {
                  ok: {
                    row: "border-l-[#10b981] bg-[#1e1442]",
                    code: "text-[#cbd5e1]",
                    label: "text-[#94a3b8]",
                    badge: "border-[#065f46] bg-[#022c22] text-[#34d399]",
                    badgeText: "OK",
                  },
                  wait: {
                    row: "border-l-[#f59e0b] bg-[#1e1442]",
                    code: "text-[#cbd5e1]",
                    label: "text-[#fcd34d]",
                    badge: "border-[#92400e] bg-[#451a03] text-[#fbbf24]",
                    badgeText: "WAIT",
                  },
                  blocked: {
                    row: "border-l-[#f97316] bg-[#2a1530]",
                    code: "text-[#fdba74]",
                    label: "text-[#fdba74]",
                    badge: "border-[#9a3412] bg-[#431407] text-[#fb923c]",
                    badgeText: "BLOQ",
                  },
                  fault: {
                    row: "animate-pulse-alert border-l-[#ef4444] bg-[rgba(69,10,10,0.6)]",
                    code: "text-[#fca5a5]",
                    label: "text-[#fca5a5]",
                    badge: "border-[#ef4444] bg-[#450a0a] text-[#fecaca]",
                    badgeText: "PANE",
                  },
                  off: {
                    row: "border-l-[#ef4444] bg-[rgba(30,20,66,0.5)] opacity-65",
                    code: "text-[#64748b]",
                    label: "text-[#f87171]",
                    badge: "border-[#991b1b] bg-[#450a0a] text-[#f87171]",
                    badgeText: "OFF",
                  },
                }[slot.status];

                return (
                  <div
                    key={slot.code}
                    className={`flex items-center justify-between gap-2 rounded-[6px] border-l-[6px] py-2.5 pl-4 pr-3 transition-colors ${styleMap.row}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`font-pixel shrink-0 text-[12px] ${styleMap.code}`}
                      >
                        {slot.code}
                      </span>
                      <span
                        className={`font-mono-tech truncate text-[13px] ${styleMap.label}`}
                      >
                        {slot.label}
                      </span>
                    </div>

                    <span
                      className={`font-pixel shrink-0 rounded-[5px] border px-2.5 py-1 text-[10px] ${styleMap.badge}`}
                    >
                      {styleMap.badgeText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FASE 3: BUFFET (8 colunas) */}
          <div className="flex flex-col justify-between gap-4 rounded-[7px] border-[1.7px] border-[rgba(59,37,121,0.85)] bg-[rgba(21,13,48,0.72)] p-4 sm:p-5 lg:col-span-8">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-pixel text-[12px] leading-[20px] text-[#d8b4fe] sm:text-[14px]">
                    FASE 3: BUFFET
                  </h3>
                  {config.buffetPaused && (
                    <span className="font-pixel rounded border border-[#ef4444] bg-[#450a0a] px-2 py-0.5 text-[9px] text-[#fecaca]">
                      PAUSADO
                    </span>
                  )}
                  {buffetBlocked && !config.buffetPaused && (
                    <span className="font-pixel rounded border border-[#f97316] bg-[#431407] px-2 py-0.5 text-[9px] text-[#fdba74]">
                      LOTADO — BLOQUEIO
                    </span>
                  )}
                </div>

                <span className="font-mono-tech text-[14px] text-[#d8b4fe]">
                  {(config.buffetServiceTimeSec / 60).toFixed(2)} min
                </span>
              </div>

              {/* Slots visuais do Bandejão */}
              <div className="arcade-scroll flex min-h-[155px] items-center gap-4 overflow-x-auto rounded-[6px] border-[1.7px] border-[rgba(168,85,247,0.35)] bg-[#1e1442] px-4 py-3">
                {buffetStudents.length === 0 ? (
                  <p className="font-mono-tech text-[13px] text-slate-400">
                    Buffet livre — aguardando alunos passarem pelas catracas.
                  </p>
                ) : (
                  <>
                    {buffetBehind.map((student, idx) => (
                      <GhostSprite
                        key={student.id}
                        variant="pink"
                        lookLeft={idx % 2 === 1}
                        caption={formatWaitCompact(
                          timeSec - (student.enteredBuffetAt ?? student.arrivedAt)
                        )}
                      />
                    ))}
                    {nextBuffetStudent && (
                      <GhostSprite
                        key={nextBuffetStudent.id}
                        variant="purple"
                        caption="PRÓX"
                        highlighted
                      />
                    )}
                    {buffetOverflow > 0 && (
                      <span className="font-pixel shrink-0 pl-2 text-[16px] text-[#64748b] sm:text-[18px]">
                        +{buffetOverflow}...
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Barra de ocupação do Buffet + Vazão */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="relative h-[12px] w-full overflow-hidden rounded-full border border-[#334155] bg-[#0f172a]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#34d399] via-[#facc15] to-[#ef4444] transition-all duration-300"
                    style={{ width: `${buffetOccPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-mono-tech text-slate-400">
                    Ocupação simultânea (K = {config.buffetCapacity} vagas)
                  </span>
                  <span className="font-pixel text-[10px] text-[#ff2a85]">
                    {buffetStudents.length} / {config.buffetCapacity} (
                    {buffetOccPct}%)
                  </span>
                </div>
              </div>

              <div
                className={`rounded-[6px] border px-4 py-2.5 text-center ${
                  config.buffetPaused
                    ? "border-[#ef4444]/60 bg-[#450a0a]/60 text-[#fecaca]"
                    : "border-[rgba(107,33,168,0.45)] bg-[rgba(59,7,100,0.45)] text-[#d8b4fe]"
                }`}
              >
                <p className="font-mono-tech text-[14px] sm:text-[15px]">
                  {config.buffetPaused
                    ? "Buffet pausado (Reposição de proteínas) — saída interrompida"
                    : `Vazão: ${kpis.throughputPerMin.toFixed(1)} refeições/ min`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
