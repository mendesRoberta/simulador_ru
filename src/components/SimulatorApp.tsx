"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_CONFIG,
  RUSimulator,
  type SimConfig,
  type SimSnapshot,
  type SimSpeed,
} from "@/engine/simulator";
import { StartScreen } from "./StartScreen";
import { TopBarHUD } from "./TopBarHUD";
import { ParametersBar } from "./ParametersBar";
import { SimulationArena } from "./SimulationArena";
import { AnalyticsSection } from "./AnalyticsSection";

type ViewMode = "start" | "simulator";

export function SimulatorApp() {
  const [view, setView] = useState<ViewMode>("start");
  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState<SimSpeed>(1);
  const [snapshot, setSnapshot] = useState<SimSnapshot>(() =>
    new RUSimulator(DEFAULT_CONFIG).getSnapshot()
  );

  const simRef = useRef<RUSimulator | null>(null);

  const getSim = (): RUSimulator => {
    if (!simRef.current) {
      simRef.current = new RUSimulator(DEFAULT_CONFIG);
    }
    return simRef.current;
  };

  // Loop de tempo discreto (Δt = 1s por passo; intervalo ajustado por 1X / 2X / 5X)
  useEffect(() => {
    if (view !== "simulator" || !isRunning) return;

    const intervalMs = Math.round(1000 / speed);
    const id = window.setInterval(() => {
      const next = getSim().step();
      setSnapshot(next);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [view, isRunning, speed]);

  const handleEnterSimulator = () => {
    setView("simulator");
  };

  const handleBackToStart = () => {
    setIsRunning(false);
    setView("start");
  };

  const handleStart = () => {
    if (snapshot.isOneHourComplete) {
      const fresh = getSim().reset();
      setSnapshot(fresh);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    const fresh = getSim().reset();
    setSnapshot(fresh);
  };

  const handleChangeSpeed = (nextSpeed: SimSpeed) => {
    setSpeed(nextSpeed);
    if (snapshot.isOneHourComplete) {
      const fresh = getSim().reset();
      setSnapshot(fresh);
    }
  };

  const handleSimulateOneHour = () => {
    setIsRunning(false);
    const result = getSim().simulateOneHour();
    setSnapshot(result);
  };

  const handleUpdateConfig = (partial: Partial<SimConfig>) => {
    const sim = getSim();
    // Se t === 0 e o usuário alterou fila inicial ou fila inicial do buffet, reinicializa o estado t=0
    const needsReinit =
      snapshot.timeSec === 0 &&
      ("initialQueue" in partial || "initialBuffet" in partial);

    const updated = needsReinit ? sim.reset(partial) : sim.updateConfig(partial);
    setSnapshot(updated);
  };

  const handleToggleTurnstile = (index: number) => {
    const current = getSim().getConfig().turnstileEnabled;
    const enabledCount = current.filter(Boolean).length;
    // Mantém pelo menos 1 catraca habilitada (para desligar temporariamente use "Pane Catraca")
    if (current[index] && enabledCount <= 1) return;

    const next: [boolean, boolean, boolean, boolean, boolean] = [...current];
    next[index] = !next[index];
    handleUpdateConfig({ turnstileEnabled: next });
  };

  const handleAddQueueStudents = (count: number) => {
    const updated = getSim().addStudentsToQueue(count);
    setSnapshot(updated);
  };

  const handleAddBuffetStudents = (count: number) => {
    const updated = getSim().addStudentsToBuffet(count);
    setSnapshot(updated);
  };

  if (view === "start") {
    return <StartScreen onStart={handleEnterSimulator} />;
  }

  return (
    <div className="ru-mesh-bg relative min-h-screen w-full overflow-x-hidden">
      <div className="relative z-10 mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-3 py-4 sm:px-6 sm:py-5">
        {/* TopBar HUD */}
        <TopBarHUD
          timeSec={snapshot.timeSec}
          servedCount={snapshot.servedCount}
          isRunning={isRunning}
          speed={speed}
          isOneHourComplete={snapshot.isOneHourComplete}
          wavePhase={snapshot.markov.wavePhase}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          onChangeSpeed={handleChangeSpeed}
          onSimulateOneHour={handleSimulateOneHour}
          onBackToStart={handleBackToStart}
        />

        {/* Barra de Parâmetros + Injeção de Falhas */}
        <ParametersBar
          config={snapshot.config}
          activeTurnstileCount={snapshot.activeTurnstileCount}
          currentLambda={snapshot.markov.currentLambda}
          buffetCurrentCount={snapshot.buffetStudents.length}
          externalQueueCount={snapshot.externalQueue.length}
          timeSec={snapshot.timeSec}
          onUpdateConfig={handleUpdateConfig}
          onToggleTurnstile={handleToggleTurnstile}
          onAddQueueStudents={handleAddQueueStudents}
          onAddBuffetStudents={handleAddBuffetStudents}
        />

        {/* Arena Visual Arcade (Fase 1 -> Fase 2 -> Fase 3) */}
        <SimulationArena snapshot={snapshot} />

        {/* Telemetria, Gráficos, Lei de Little, KPIs e Cadeia de Markov */}
        <AnalyticsSection snapshot={snapshot} />
      </div>
    </div>
  );
}
