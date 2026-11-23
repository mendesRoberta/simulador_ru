"use client";

import Image from "next/image";
import { formatClock, type SimSpeed, type WavePhase } from "@/engine/simulator";

interface TopBarHUDProps {
  timeSec: number;
  servedCount: number;
  isRunning: boolean;
  speed: SimSpeed;
  isOneHourComplete: boolean;
  wavePhase: WavePhase;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onChangeSpeed: (speed: SimSpeed) => void;
  onSimulateOneHour: () => void;
  onBackToStart: () => void;
}

export function TopBarHUD({
  timeSec,
  servedCount,
  isRunning,
  speed,
  isOneHourComplete,
  wavePhase,
  onStart,
  onPause,
  onReset,
  onChangeSpeed,
  onSimulateOneHour,
  onBackToStart,
}: TopBarHUDProps) {
  return (
    <header className="arcade-card-shadow w-full rounded-[8px] border-x-3 border-b-4 border-t-3 border-[#ff2a85] bg-[rgba(45,31,88,0.85)] px-4 py-3.5 backdrop-blur-[8px] sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* LCD Clock */}
          <div className="font-pixel text-[10px] uppercase tracking-[0.5px] text-[#cbd5e1] sm:text-[11px]">
            TEMPO:{formatClock(timeSec)}
          </div>

          {/* Atendidos Badge */}
          <div className="flex items-center gap-2 rounded-[4px] border border-[#3b2579] bg-[rgba(30,20,66,0.85)] px-3 py-1.5">
            <span className="font-mono-tech text-[12px] font-bold text-[#e2e8f0]">
              {servedCount} ATENDIDOS
            </span>
          </div>

          {/* Indicador de Onda de Pico / 1h Concluída */}
          {wavePhase !== "constante" && (
            <div
              className={
                wavePhase === "pico"
                  ? "font-pixel rounded-[4px] border border-[#ff2a85] bg-[#ff2a85]/25 px-2.5 py-1 text-[9px] text-[#fbcfe8]"
                  : "font-pixel rounded-[4px] border border-[#00f0ff]/60 bg-[#00f0ff]/15 px-2.5 py-1 text-[9px] text-[#00f0ff]"
              }
            >
              {wavePhase === "pico" ? "ONDA: PICO" : "ONDA: CALMA"}
            </div>
          )}

          {isOneHourComplete && (
            <div className="font-pixel rounded-[4px] border border-[#ffe600] bg-[#ffe600]/20 px-2.5 py-1 text-[9px] text-[#ffe600]">
              1H SIMULADA
            </div>
          )}

          {/* Arcade Main Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStart}
              className={`arcade-btn-inset font-pixel flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-[#10b981] px-3.5 py-2.5 text-[10px] text-[#020617] drop-shadow-[0_4px_0_#009e3f] transition-transform hover:brightness-105 active:translate-y-0.5 ${
                isRunning ? "ring-2 ring-white/70" : ""
              }`}
            >
              <Image
                src="/assets/icon-play.svg"
                alt=""
                aria-hidden="true"
                width={7}
                height={9}
                unoptimized
                className="h-[9px] w-[7px] shrink-0"
              />
              <span>INICIAR</span>
            </button>

            <button
              type="button"
              onClick={onPause}
              className={`arcade-btn-inset font-pixel flex cursor-pointer items-center rounded-[4px] bg-[#fbbf24] px-3.5 py-2.5 text-[10px] text-[#020617] drop-shadow-[0_4px_0_#b39b00] transition-transform hover:brightness-105 active:translate-y-0.5 ${
                !isRunning && timeSec > 0 ? "ring-2 ring-white/70" : ""
              }`}
            >
              PAUSAR
            </button>

            <button
              type="button"
              onClick={onReset}
              className="arcade-btn-inset font-pixel flex cursor-pointer items-center rounded-[4px] bg-[#06b6d4] px-3 py-2.5 text-[10px] text-[#020617] drop-shadow-[0_4px_0_#009099] transition-transform hover:brightness-105 active:translate-y-0.5"
            >
              REINICIAR
            </button>

            {/* Speed Toggle */}
            <div className="ml-1 flex items-center rounded-[4px] border border-[#3b2579] bg-[#1e1442] p-[3px]">
              {([1, 2, 5] as SimSpeed[]).map((spd) => {
                const active = !isOneHourComplete && speed === spd;
                return (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onChangeSpeed(spd)}
                    className={`font-pixel cursor-pointer rounded-[4px] px-2 py-1 text-[10px] transition-colors ${
                      active
                        ? "bg-[#ff2a85] text-white shadow-sm"
                        : "text-[#94a3b8] hover:text-white"
                    }`}
                  >
                    {spd}X
                  </button>
                );
              })}
              <button
                type="button"
                onClick={onSimulateOneHour}
                className={`font-pixel cursor-pointer rounded-[4px] px-2.5 py-1 text-[10px] transition-colors ${
                  isOneHourComplete
                    ? "bg-[#ff2a85] text-white shadow-sm"
                    : "text-[#94a3b8] hover:text-white"
                }`}
                title="Executa 3600 segundos (1 hora) instantaneamente e congela os KPIs finais"
              >
                Simular 1h
              </button>
            </div>
          </div>
        </div>

        {/* Botão de retorno à Tela Start */}
        <button
          type="button"
          onClick={onBackToStart}
          className="font-pixel cursor-pointer rounded-[4px] border border-[#3b2579] bg-[#1e1442] px-3 py-2 text-[9px] text-[#cbd5e1] transition-colors hover:border-[#00f0ff] hover:text-[#00f0ff]"
        >
          ← INÍCIO
        </button>
      </div>
    </header>
  );
}
