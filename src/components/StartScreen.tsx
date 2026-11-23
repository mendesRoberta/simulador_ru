"use client";

import Image from "next/image";
import { useRef } from "react";

interface StartScreenProps {
  onStart: () => void;
}

export function StartScreen({ onStart }: StartScreenProps) {
  const objetivoRef = useRef<HTMLElement | null>(null);

  const handleScrollToObjetivo = () => {
    objetivoRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  return (
    <div className="ru-mesh-bg relative flex min-h-screen w-full flex-col overflow-x-hidden">
      {/* Dobra principal: chassi arcade 16-bit centralizado */}
      <main className="relative z-10 flex flex-1 flex-col">
        <div className="flex min-h-screen w-full items-center justify-center px-4 py-14 sm:px-8">
          <section className="relative flex w-full max-w-[1060px] flex-col items-center justify-center overflow-hidden rounded-[24px] border-4 border-white/90 bg-gradient-to-b from-[rgba(122,106,230,0.9)] to-[rgba(88,72,194,0.95)] px-6 py-12 shadow-[0_12px_35px_0_rgba(32,22,59,0.55)] backdrop-blur-[12px] sm:px-16 sm:py-14">
            {/* Corner Accent Studs */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-3 font-mono text-xs text-white/50"
            >
              ◆
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-3 font-mono text-xs text-white/50"
            >
              ◆
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 left-4 font-mono text-xs text-white/50"
            >
              ◆
            </span>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute bottom-3 right-4 font-mono text-xs text-white/50"
            >
              ◆
            </span>

            {/* Título principal */}
            <div className="mb-8 flex max-w-[780px] flex-col items-center text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.65)]">
              <h1 className="font-pixel text-[22px] leading-[1.4] tracking-[1px] text-white sm:text-[34px] lg:text-[42px]">
                <span className="block">Simulador da fila</span>
                <span className="block">do</span>
                <span className="mt-2 block text-[#ffe347] drop-shadow-[0_4px_0_#43328e]">
                  Restaurante
                </span>
                <span className="block text-[#ffe347] drop-shadow-[0_4px_0_#43328e]">
                  Universitário
                </span>
              </h1>
            </div>

            {/* Botões principais */}
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-9">
              <button
                type="button"
                onClick={onStart}
                className="arcade-start-btn-inset font-pixel relative flex h-[54px] cursor-pointer items-center justify-center rounded-[4px] border-2 border-black bg-[#00f29b] px-7 text-[12px] uppercase tracking-[0.7px] text-[#020617] transition-transform hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0.5 sm:text-[14px]"
              >
                ▶ INICIAR SIMULAÇÃO
              </button>

              <button
                type="button"
                onClick={handleScrollToObjetivo}
                className="arcade-start-btn-inset font-pixel relative flex h-[54px] cursor-pointer items-center justify-center rounded-[4px] border-2 border-black bg-[#6b5ecd] px-6 text-[11px] uppercase tracking-[0.6px] text-white transition-transform hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 sm:text-[12px]"
              >
                SAIBA MAIS
              </button>
            </div>
          </section>
        </div>

        {/* Seção inferior: Objetivo Acadêmico (7:958) + Prato do Dia (8:993) */}
        <section
          ref={objetivoRef}
          id="objetivo-academico"
          aria-labelledby="objetivo-academico-title"
          className="mx-auto flex w-full max-w-[1060px] flex-col items-center justify-between gap-12 px-4 pb-28 pt-8 sm:px-8 lg:flex-row lg:items-center lg:gap-10"
        >
          {/* Esquerda: Card Objetivo Acadêmico */}
          <div className="flex w-full max-w-[584px] flex-col gap-4 rounded-[12px] border-4 border-[#130924] bg-[rgba(45,31,88,0.9)] p-7 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.22),0_8px_10px_-6px_rgba(0,0,0,0.18)] backdrop-blur-[12px] sm:p-8">
            <div className="w-full border-b-2 border-[rgba(165,148,249,0.3)] pb-3.5">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/assets/icon-arrow-cyan.svg"
                  alt=""
                  aria-hidden="true"
                  width={8}
                  height={10}
                  unoptimized
                  className="h-[10px] w-[8px] shrink-0"
                />
                <h2
                  id="objetivo-academico-title"
                  className="font-pixel text-[11px] leading-[16px] text-[#38efff] sm:text-[12px]"
                >
                  OBJETIVO ACADÊMICO
                </h2>
              </div>
            </div>

            <p className="font-inter text-[16px] font-normal leading-[28px] text-[#f1f5f9] sm:text-[18px]">
              Este sistema foi desenvolvido com o propósito de simular a fila do
              restaurante universitário da{" "}
              <strong className="font-bold text-white underline decoration-[#ff5493] decoration-2 underline-offset-4 [text-decoration-skip-ink:none]">
                Universidade Federal do Oeste do Pará (Ufopa)
              </strong>
              , como requisito para a disciplina de{" "}
              <span className="font-semibold text-[#ffe347]">
                Avaliação de Desempenho
              </span>
              .
            </p>
          </div>

          {/* Direita: Polaroid Pixel Art do Prato do Dia */}
          <div className="relative flex shrink-0 items-center justify-center py-4">
            <div className="relative flex w-[320px] flex-col gap-3 rounded-[12px] border-4 border-[#0f172a] bg-white p-5 drop-shadow-[0_20px_20px_rgba(19,9,36,0.65)] sm:w-[356px] sm:p-6">
              {/* Fita adesiva decorativa superior */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-[-13px] -translate-x-1/2"
              >
                <div className="h-[24px] w-[96px] -rotate-2 border border-[#fde047] bg-[rgba(254,240,138,0.85)] shadow-xs" />
              </div>

              {/* Selo flutuante superior direito: ★ NOTA 10! */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-[-18px] top-[-22px] z-20 rotate-12"
              >
                <div className="rounded-[2px] border-2 border-black bg-[#ffe347] px-3 py-2 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.2)]">
                  <span className="font-pixel block whitespace-nowrap text-[9px] leading-[13.5px] text-[#020617]">
                    ★ NOTA 10!
                  </span>
                </div>
              </div>

              {/* Selo flutuante inferior esquerdo: ENERGIA TOTAL */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-18px] left-[-16px] z-20 -rotate-6"
              >
                <div className="rounded-[4px] border-2 border-black bg-[#ff5493] px-3 py-1.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.25)]">
                  <span className="font-pixel block whitespace-nowrap text-[9px] leading-[13.5px] text-white">
                    ENERGIA TOTAL
                  </span>
                </div>
              </div>

              {/* Moldura interna com ilustração pixel art do prato */}
              <div className="relative flex aspect-square w-full flex-col items-center justify-start overflow-hidden rounded-[8px] border-2 border-[#e2e8f0] bg-[#f8fafc] p-2.5">
                <div className="relative mt-1 h-[215px] w-[182px] sm:h-[230px] sm:w-[193px]">
                  <Image
                    src="/assets/prato-do-dia.png"
                    alt="Ilustração em pixel art do prato do dia do Restaurante Universitário: arroz, feijão, ovo, salada e proteína"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>

                {/* Pill escura inferior: PRATO DO DIA */}
                <div className="absolute bottom-3 left-3 right-3 rounded-[4px] border border-[rgba(255,227,71,0.6)] bg-[rgba(19,9,36,0.88)] px-2.5 py-2 text-center shadow-md">
                  <p className="font-pixel text-[10px] leading-[15px] uppercase text-[#ffe347]">
                    PRATO DO DIA
                  </p>
                  <p className="font-vt mt-0.5 text-[14px] leading-[16px] tracking-[0.3px] text-[#6ee7b7]">
                    ARROZ + FEIJÃO + OVO + SALADA + PROTEÍNA
                  </p>
                </div>
              </div>

              {/* Barra inferior do polaroid: HP +100% e Ufopa Tapajós */}
              <div className="flex w-full items-center justify-between pt-0.5">
                <span className="font-pixel text-[10px] leading-[15px] text-[#ff5493]">
                  HP +100%
                </span>
                <span className="font-vt rounded-[4px] bg-[#f3e8ff] px-2.5 py-0.5 text-[15px] leading-[16px] text-[#581c87]">
                  Ufopa Tapajós
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé com créditos da equipe e instituição */}
      <footer className="relative z-10 w-full border-t-4 border-black bg-[rgba(19,9,36,0.95)] px-6 pb-4 pt-5">
        <div className="mx-auto flex max-w-[1040px] flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-[#a594f9]">
            <span className="font-pixel text-[10px] uppercase tracking-[0.5px]">
              PLAYERS
            </span>
          </div>

          <div className="font-pixel flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[10px] leading-[18px] tracking-[0.3px] text-white sm:text-[12px]">
            <span>Ana Clara Lages Maia</span>
            <span className="text-[#ff5493]">•</span>
            <span>Andressa Dias de Sousa</span>
            <span className="text-[#ff5493]">•</span>
            <span>Matheus Calderaro Maciel</span>
            <span className="text-[#ff5493]">•</span>
            <span>Roberta Mendes Monteiro</span>
          </div>

          <p className="font-vt pt-1 text-[18px] tracking-[0.5px] text-[#94a3b8]">
            UNIVERSIDADE FEDERAL DO OESTE DO PARÁ - 2026
          </p>
        </div>
      </footer>
    </div>
  );
}
