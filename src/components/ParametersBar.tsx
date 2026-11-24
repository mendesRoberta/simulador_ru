"use client";

import { useState } from "react";
import type { SimConfig } from "@/engine/simulator";

interface ParametersBarProps {
  config: SimConfig;
  activeTurnstileCount: number;
  currentLambda: number;
  buffetCurrentCount: number;
  systemNCount: number;
  externalQueueCount: number;
  timeSec: number;
  onUpdateConfig: (partial: Partial<SimConfig>) => void;
  onToggleTurnstile: (index: number) => void;
  onAddQueueStudents: (count: number) => void;
  onAddBuffetStudents: (count: number) => void;
}

type EditorKey =
  | null
  | "lambda"
  | "buffetTime"
  | "turnstileTime"
  | "initialQueue"
  | "buffetQueue";

export function ParametersBar({
  config,
  activeTurnstileCount,
  currentLambda,
  buffetCurrentCount,
  systemNCount,
  externalQueueCount,
  timeSec,
  onUpdateConfig,
  onToggleTurnstile,
  onAddQueueStudents,
  onAddBuffetStudents,
}: ParametersBarProps) {
  const [openEditor, setOpenEditor] = useState<EditorKey>(null);
  const [draftValue, setDraftValue] = useState("");
  const [draftPeakValue, setDraftPeakValue] = useState("");

  const toggleEditor = (key: EditorKey, initialVal: string, peakVal = "") => {
    if (openEditor === key) {
      setOpenEditor(null);
      return;
    }
    setDraftValue(initialVal);
    setDraftPeakValue(peakVal);
    setOpenEditor(key);
  };

  const applyLambda = () => {
    if (config.arrivalMode === "peak_wave") {
      const calm = parseFloat(draftValue.replace(",", "."));
      const peak = parseFloat(draftPeakValue.replace(",", "."));
      if (Number.isFinite(calm) && calm > 0 && Number.isFinite(peak) && peak > 0) {
        onUpdateConfig({ calmLambda: calm, peakLambda: peak });
      }
    } else {
      const val = parseFloat(draftValue.replace(",", "."));
      if (Number.isFinite(val) && val > 0) {
        onUpdateConfig({ lambda: val });
      }
    }
    setOpenEditor(null);
  };

  const applyNumberConfig = (field: keyof SimConfig, min: number, max: number) => {
    const val = parseFloat(draftValue.replace(",", "."));
    if (Number.isFinite(val)) {
      const clamped = Math.max(min, Math.min(max, val));
      onUpdateConfig({ [field]: clamped } as Partial<SimConfig>);
    }
    setOpenEditor(null);
  };

  const applyAddQueue = () => {
    const val = Math.round(parseFloat(draftValue));
    if (Number.isFinite(val) && val >= 0) {
      if (timeSec === 0) {
        onUpdateConfig({ initialQueue: val });
      } else if (val > 0) {
        onAddQueueStudents(val);
      }
    }
    setOpenEditor(null);
  };

  const applyAddBuffet = () => {
    const val = Math.round(parseFloat(draftValue));
    if (Number.isFinite(val) && val >= 0) {
      if (timeSec === 0) {
        onUpdateConfig({ initialBuffet: val });
      } else if (val > 0) {
        onAddBuffetStudents(val);
      }
    }
    setOpenEditor(null);
  };

  return (
    <section className="arcade-card-shadow w-full rounded-[8px] border-x-3 border-b-3 border-t-4 border-[#00f0ff] bg-[rgba(45,31,88,0.85)] px-4 pb-4 pt-4 backdrop-blur-[8px] sm:px-5">
      {/* Cabeçalho PARÂMETROS + Badge Dinâmico M/M/c */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(59,37,121,0.8)] pb-3">
        <div className="flex items-center gap-3">
          <h2 className="font-pixel text-[12px] tracking-[0.3px] text-[#00f0ff]">
            PARÂMETROS
          </h2>
          <span
            data-testid="mm-badge"
            className="font-mono-tech rounded-[4px] border border-[#3b2579] bg-[#1e1442] px-2.5 py-0.5 text-[11px] font-semibold text-[#94a3b8]"
          >
            M/M/{activeTurnstileCount}
          </span>
        </div>

        <div className="font-mono-tech flex items-center gap-3 text-[11px] text-[#94a3b8]">
          <span>
            Semente Mulberry32:{" "}
            <strong className="text-[#cbd5e1]">{config.seed}</strong>
          </span>
        </div>
      </div>

      {/* Faixa horizontal dos cards de parâmetros (sem Capacidade K do buffet) */}
      <div className="arcade-scroll flex gap-3.5 overflow-x-auto pb-2">
        {/* 1. Lambda: Taxa de Chegada */}
        <div className="flex min-w-[335px] shrink-0 flex-col justify-between gap-3 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[14px] font-bold text-[#ffe600]">
                λ
              </span>
              <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
                Taxa de Chegada (Poisson)
              </span>
            </div>
            <span className="font-pixel text-[10px] text-[#ffe600]">
              {currentLambda.toFixed(2)} al/min
            </span>
          </div>

          {openEditor === "lambda" ? (
            <div className="flex flex-wrap items-center gap-2">
              {config.arrivalMode === "peak_wave" ? (
                <>
                  <label className="font-mono-tech flex items-center gap-1 text-[10px] text-slate-300">
                    Calma:
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="60"
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="w-16 rounded border border-[#00f0ff]/60 bg-[#150d30] px-1.5 py-0.5 text-[11px] text-white outline-none"
                    />
                  </label>
                  <label className="font-mono-tech flex items-center gap-1 text-[10px] text-slate-300">
                    Pico:
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      max="60"
                      value={draftPeakValue}
                      onChange={(e) => setDraftPeakValue(e.target.value)}
                      className="w-16 rounded border border-[#ff2a85]/60 bg-[#150d30] px-1.5 py-0.5 text-[11px] text-white outline-none"
                    />
                  </label>
                </>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max="60"
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyLambda()}
                  className="w-24 rounded border border-[#ffe600]/60 bg-[#150d30] px-2 py-1 text-[11px] text-white outline-none"
                  aria-label="Nova taxa de chegada em alunos por minuto"
                />
              )}
              <button
                type="button"
                onClick={applyLambda}
                className="font-pixel cursor-pointer rounded bg-[#10b981] px-2 py-1 text-[8px] text-[#020617]"
              >
                OK
              </button>
              <button
                type="button"
                onClick={() => setOpenEditor(null)}
                className="font-pixel cursor-pointer rounded bg-slate-700 px-2 py-1 text-[8px] text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  toggleEditor(
                    "lambda",
                    config.arrivalMode === "peak_wave"
                      ? config.calmLambda.toFixed(2)
                      : config.lambda.toFixed(4),
                    config.peakLambda.toFixed(2)
                  )
                }
                className="font-pixel cursor-pointer rounded-[4px] border border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] px-2.5 py-1.5 text-[9px] text-[#fbcfe8] transition-colors hover:bg-[rgba(255,42,133,0.5)]"
              >
                Alterar taxa
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    arrivalMode:
                      config.arrivalMode === "peak_wave"
                        ? "constant"
                        : "peak_wave",
                  })
                }
                className={`font-pixel cursor-pointer rounded-[4px] border px-2.5 py-1.5 text-[9px] transition-all ${
                  config.arrivalMode === "peak_wave"
                    ? "border-[#00f0ff] bg-[#ff2a85] text-white shadow-[0_0_10px_rgba(255,42,133,0.6)]"
                    : "border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] text-[#fbcfe8] hover:bg-[rgba(255,42,133,0.5)]"
                }`}
                title="Pico (5.33 al/min) das 12:00–12:45; Calma (4.13 al/min) das 12:45–13:00"
              >
                Modo Onda de Pico
              </button>
            </div>
          )}
        </div>

        {/* 2. Catracas Ativas (c) */}
        <div className="flex min-w-[350px] shrink-0 flex-col justify-between gap-2 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
              Catracas Ativas
            </span>
            <span className="font-pixel text-[10px] text-[#00f0ff]">
              {activeTurnstileCount} DE 5 ATIVAS
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {config.turnstileEnabled.map((enabled, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onToggleTurnstile(idx)}
                className={
                  enabled
                    ? "arcade-btn-inset font-pixel flex-1 cursor-pointer rounded-[4px] border border-[#34d399] bg-[#059669] px-2 py-2 text-[10px] text-white drop-shadow-[0_3px_0_#009e3f] transition-transform hover:brightness-110 active:translate-y-0.5"
                    : "font-pixel flex-1 cursor-pointer rounded-[4px] border border-[rgba(239,68,68,0.5)] bg-[#1e293b] px-2 py-2 text-[10px] text-[#f87171] opacity-85 transition-opacity hover:opacity-100"
                }
                title={
                  enabled
                    ? `Desativar catraca C${idx + 1}`
                    : `Ativar catraca C${idx + 1}`
                }
              >
                {enabled ? `C${idx + 1}` : `C${idx + 1} ✕`}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Tempo na catraca */}
        <div className="flex min-w-[245px] shrink-0 flex-col justify-between gap-2.5 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
              Tempo na catraca
            </span>
            <span className="font-pixel text-[10px] text-[#d8b4fe]">
              {config.turnstileServiceTimeSec.toFixed(2)} seg
            </span>
          </div>

          {openEditor === "turnstileTime" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                step="0.01"
                min="2"
                max="180"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  applyNumberConfig("turnstileServiceTimeSec", 2, 180)
                }
                className="w-20 rounded border border-[#d8b4fe]/60 bg-[#150d30] px-2 py-1 text-[11px] text-white outline-none"
              />
              <span className="text-[10px] text-slate-400">seg</span>
              <button
                type="button"
                onClick={() =>
                  applyNumberConfig("turnstileServiceTimeSec", 2, 180)
                }
                className="font-pixel cursor-pointer rounded bg-[#10b981] px-2 py-1 text-[8px] text-[#020617]"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                toggleEditor(
                  "turnstileTime",
                  config.turnstileServiceTimeSec.toFixed(2)
                )
              }
              className="font-pixel w-fit cursor-pointer rounded-[4px] border border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] px-2.5 py-1.5 text-[9px] text-[#fbcfe8] transition-colors hover:bg-[rgba(255,42,133,0.5)]"
            >
              Alterar tempo
            </button>
          )}
        </div>

        {/* 4. Tempo no Buffet (apenas animação visual) */}
        <div className="flex min-w-[235px] shrink-0 flex-col justify-between gap-2.5 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
              Tempo no Buffet
            </span>
            <span className="font-pixel text-[10px] text-[#d8b4fe]">
              {config.buffetServiceTimeSec} seg
            </span>
          </div>

          {openEditor === "buffetTime" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="900"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  applyNumberConfig("buffetServiceTimeSec", 10, 900)
                }
                className="w-20 rounded border border-[#d8b4fe]/60 bg-[#150d30] px-2 py-1 text-[11px] text-white outline-none"
              />
              <span className="text-[10px] text-slate-400">seg</span>
              <button
                type="button"
                onClick={() =>
                  applyNumberConfig("buffetServiceTimeSec", 10, 900)
                }
                className="font-pixel cursor-pointer rounded bg-[#10b981] px-2 py-1 text-[8px] text-[#020617]"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                toggleEditor("buffetTime", String(config.buffetServiceTimeSec))
              }
              className="font-pixel w-fit cursor-pointer rounded-[4px] border border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] px-2.5 py-1.5 text-[9px] text-[#fbcfe8] transition-colors hover:bg-[rgba(255,42,133,0.5)]"
            >
              Alterar tempo
            </button>
          )}
        </div>

        {/* 5. Sistema inicial N0 (Lq + Catracas) */}
        <div className="flex min-w-[265px] shrink-0 flex-col justify-between gap-2.5 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
              {timeSec === 0 ? "Sistema inicial (N₀)" : "No sistema (L)"}
            </span>
            <span
              className="font-pixel text-[10px] text-[#d8b4fe]"
              title={`Fila externa Lq = ${externalQueueCount}`}
            >
              {timeSec === 0 ? config.initialQueue : systemNCount} alunos
            </span>
          </div>

          {openEditor === "initialQueue" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="300"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyAddQueue()}
                className="w-20 rounded border border-[#d8b4fe]/60 bg-[#150d30] px-2 py-1 text-[11px] text-white outline-none"
              />
              <button
                type="button"
                onClick={applyAddQueue}
                className="font-pixel cursor-pointer rounded bg-[#10b981] px-2 py-1 text-[8px] text-[#020617]"
              >
                {timeSec === 0 ? "DEFINIR" : "+ADD"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                toggleEditor(
                  "initialQueue",
                  timeSec === 0 ? String(config.initialQueue) : "5"
                )
              }
              className="font-pixel w-fit cursor-pointer rounded-[4px] border border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] px-2.5 py-1.5 text-[9px] text-[#fbcfe8] transition-colors hover:bg-[rgba(255,42,133,0.5)]"
            >
              Adicionar mais alunos
            </button>
          )}
        </div>

        {/* 6. Buffet (visualização) */}
        <div className="flex min-w-[250px] shrink-0 flex-col justify-between gap-2.5 rounded-[4px] border border-[rgba(59,37,121,0.6)] bg-[#1e1442] p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono-tech text-[12px] font-semibold text-[#cbd5e1]">
              No Buffet (visual)
            </span>
            <span className="font-pixel text-[10px] text-[#d8b4fe]">
              {buffetCurrentCount} alunos
            </span>
          </div>

          {openEditor === "buffetQueue" ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="0"
                max="300"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyAddBuffet()}
                className="w-20 rounded border border-[#d8b4fe]/60 bg-[#150d30] px-2 py-1 text-[11px] text-white outline-none"
              />
              <button
                type="button"
                onClick={applyAddBuffet}
                className="font-pixel cursor-pointer rounded bg-[#10b981] px-2 py-1 text-[8px] text-[#020617]"
              >
                {timeSec === 0 ? "DEFINIR" : "+ADD"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() =>
                toggleEditor(
                  "buffetQueue",
                  timeSec === 0 ? String(config.initialBuffet) : "3"
                )
              }
              className="font-pixel w-fit cursor-pointer rounded-[4px] border border-[rgba(255,42,133,0.6)] bg-[rgba(255,42,133,0.3)] px-2.5 py-1.5 text-[9px] text-[#fbcfe8] transition-colors hover:bg-[rgba(255,42,133,0.5)]"
            >
              Adicionar mais alunos
            </button>
          )}
        </div>
      </div>

      {/* Injeção de Falhas */}
      <div className="mt-3 flex flex-col gap-2">
        <span className="font-pixel text-[10px] tracking-[0.5px] text-[#ff3366]">
          INJEÇÃO DE FALHAS
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({ turnstileFault: !config.turnstileFault })
            }
            className={`arcade-btn-inset relative flex cursor-pointer flex-col items-start rounded-[4px] border-2 px-3.5 py-2.5 text-left shadow-[0_4px_0_0_#990026] transition-all active:translate-y-0.5 ${
              config.turnstileFault
                ? "animate-pulse-alert border-[#ffe600] bg-[#991b1b]"
                : "border-[#ef4444] bg-[rgba(69,10,10,0.65)] hover:bg-[rgba(127,29,29,0.75)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] text-[#fecaca]">
                PANE CATRACA
              </span>
              {config.turnstileFault && (
                <span className="font-pixel rounded bg-[#ffe600] px-1.5 py-0.5 text-[7px] text-black">
                  ATIVO
                </span>
              )}
            </div>
            <span className="font-mono-tech mt-0.5 text-[10px] text-[#fca5a5]">
              {config.turnstileFault
                ? "1 catraca pausada — clique p/ reparar"
                : "Falha no leitor qr code"}
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onUpdateConfig({ buffetPaused: !config.buffetPaused })
            }
            className={`arcade-btn-inset relative flex cursor-pointer flex-col items-start rounded-[4px] border-2 px-3.5 py-2.5 text-left shadow-[0_4px_0_0_#990026] transition-all active:translate-y-0.5 ${
              config.buffetPaused
                ? "animate-pulse-alert border-[#ffe600] bg-[#991b1b]"
                : "border-[#ef4444] bg-[rgba(69,10,10,0.65)] hover:bg-[rgba(127,29,29,0.75)]"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-pixel text-[9px] text-[#fecaca]">
                PARAR BUFFET
              </span>
              {config.buffetPaused && (
                <span className="font-pixel rounded bg-[#ffe600] px-1.5 py-0.5 text-[7px] text-black">
                  ATIVO
                </span>
              )}
            </div>
            <span className="font-mono-tech mt-0.5 text-[10px] text-[#fca5a5]">
              {config.buffetPaused
                ? "Saída visual pausada — clique p/ retomar"
                : "Pausa visual (não bloqueia catraca)"}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
