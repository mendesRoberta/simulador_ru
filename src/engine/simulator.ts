/**
 * Motor de Simulação da Fila do Restaurante Universitário (UFOPA)
 *
 * Arquitetura pura em TypeScript (sem dependências de UI/React):
 * - Sistema em 2 etapas (Tandem):
 *   Fase 1 (Fila Externa) -> Fase 2 (Catracas: c servidores) -> Fase 3 (Buffet: K vagas simultâneas)
 * - Passo discreto: Δt = 1s
 * - Cadeia de Markov para Fase 1 + 2 (estado n = fila externa + passando nas catracas)
 * - Gerador pseudoaleatório determinístico Mulberry32 para reprodutibilidade entre cenários
 */

export const DEFAULT_SEED = 20261113;
export const DT_SECONDS = 1;
export const ONE_HOUR_SECONDS = 3600;
export const LONG_QUEUE_THRESHOLD = 10;
export const MAX_TURNSTILES = 5;

export type ArrivalMode = "constant" | "peak_wave";
export type SimSpeed = 1 | 2 | 5;
export type TurnstileStatus = "ok" | "wait" | "off" | "fault" | "blocked";
export type WavePhase = "constante" | "calma" | "pico";

export interface SimConfig {
  /** Taxa de chegada λ em modo constante (alunos/min). Padrão aferição 13/11/2026: 4.66 */
  lambda: number;
  /** Taxa de chegada λ na fase calma do Modo Onda de Pico (0-15 min e 40-60 min). Padrão: 3.5 */
  calmLambda: number;
  /** Taxa de chegada λ na fase de pico do Modo Onda de Pico (15-40 min). Padrão: 4.9 */
  peakLambda: number;
  /** Modo de chegada: constante ou onda de pico */
  arrivalMode: ArrivalMode;
  /** Quais das 5 catracas (C1..C5) estão habilitadas */
  turnstileEnabled: [boolean, boolean, boolean, boolean, boolean];
  /** Tempo médio de atendimento em cada catraca (segundos). Padrão: 12s */
  turnstileServiceTimeSec: number;
  /** Tempo médio de permanência no buffet (segundos). Padrão: 207s (3.45 min) */
  buffetServiceTimeSec: number;
  /** Capacidade máxima de vagas simultâneas no buffet (K). Padrão: 18 */
  buffetCapacity: number;
  /** Quantidade inicial de alunos na fila externa (n0). Padrão: 5 */
  initialQueue: number;
  /** Quantidade inicial de alunos já servindo no buffet. Padrão: 0 */
  initialBuffet: number;
  /** Injeção de falha: pausa 1 catraca ativa temporariamente */
  turnstileFault: boolean;
  /** Injeção de falha: pausa a saída do buffet (gera bloqueio na fila) */
  buffetPaused: boolean;
  /** Semente fixa para o gerador pseudoaleatório Mulberry32 */
  seed: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  lambda: 4.66,
  calmLambda: 3.5,
  peakLambda: 4.9,
  arrivalMode: "constant",
  turnstileEnabled: [true, false, false, false, false],
  turnstileServiceTimeSec: 12,
  buffetServiceTimeSec: 207,
  buffetCapacity: 18,
  initialQueue: 5,
  initialBuffet: 0,
  turnstileFault: false,
  buffetPaused: false,
  seed: DEFAULT_SEED,
};

export interface Student {
  id: number;
  arrivedAt: number;
  enteredTurnstileAt: number | null;
  enteredBuffetAt: number | null;
  exitedAt: number | null;
}

export interface TurnstileSlot {
  index: number; // 1..5
  code: string; // C-01..C-05
  enabled: boolean;
  faulted: boolean;
  status: TurnstileStatus;
  student: Student | null;
  label: string;
}

export interface HistoryPoint {
  timeSec: number;
  /** Alunos esperando na fila externa (Lq) */
  queueLength: number;
  /** Estado n da Cadeia de Markov (fila externa + catracas) */
  stateN: number;
  /** Alunos atualmente no buffet */
  buffetCount: number;
  /** Total de alunos no sistema (L) */
  totalInSystem: number;
}

export interface MarkovTelemetry {
  /** Estado atual n = fila externa + passando nas catracas */
  n: number;
  /** Passo discreto Δt (segundos) */
  dt: number;
  /** Probabilidade de subir (chegada): a */
  probUp: number;
  /** Probabilidade de descer (saída das catracas): s */
  probDown: number;
  /** Probabilidade de permanecer no mesmo estado: p_fica = 1 - a - s */
  probStay: number;
  /** Taxa de chegada vigente λ (alunos/min) */
  currentLambda: number;
  /** Taxa de serviço por catraca μ = 60 / T_catraca (alunos/min) */
  muPerTurnstile: number;
  /** Número de catracas operacionais (ativas menos pane) */
  effectiveTurnstiles: number;
  /** Fase atual da onda de chegadas */
  wavePhase: WavePhase;
}

export interface LittleLawMetrics {
  /** Taxa λ efetiva em alunos/segundo */
  lambdaEffectivePerSec: number;
  /** Taxa λ efetiva em alunos/minuto */
  lambdaEffectivePerMin: number;
  /** Tempo médio total no sistema W (segundos) */
  avgTotalTimeSec: number;
  /** L teórico pela Lei de Little (L = λ * W) */
  littleL: number;
  /** L médio observado integrado ao longo do tempo */
  observedAvgL: number;
  /** Total de discentes atualmente no sistema */
  currentL: number;
  /** Se o sistema está matematicamente estável (ρ < 1 em ambas as etapas) */
  isStable: boolean;
  /** Status de conformidade com a Lei de Little */
  conformanceLabel: string;
}

export interface TimeDistribution {
  queuePct: number;
  turnstilePct: number;
  buffetPct: number;
  avgQueueSec: number;
  avgTurnstileSec: number;
  avgBuffetSec: number;
  avgTotalSec: number;
}

export interface SimKPIs {
  /** Utilização das catracas: ρ_catracas = λ / (c * μ) */
  rhoTurnstiles: number;
  /** Utilização do buffet: ρ_buffet = λ / (K * (60 / T_buffet)) */
  rhoBuffet: number;
  /** Alerta de saturação nas catracas (ρ >= 1) */
  turnstileOverloaded: boolean;
  /** Alerta de saturação no buffet (ρ >= 1) */
  buffetOverloaded: boolean;
  /** Pico máximo de alunos na fila externa */
  maxQueue: number;
  /** Instante (segundos) em que ocorreu o pico máximo */
  maxQueueTimeSec: number;
  /** Pico máximo do estado n (fila externa + catracas) */
  maxN: number;
  /** Fração do tempo (%) em que n >= 10 */
  longQueuePct: number;
  /** Vazão efetiva de saída do buffet (refeições/min) */
  throughputPerMin: number;
}

export interface SimSnapshot {
  config: SimConfig;
  timeSec: number;
  servedCount: number;
  externalQueue: Student[];
  turnstiles: TurnstileSlot[];
  buffetStudents: Student[];
  buffetBlocked: boolean;
  /** Catracas habilitadas pelo usuário (1..5), define o badge M/M/c */
  activeTurnstileCount: number;
  /** Catracas efetivamente operando (descontando Pane Catraca) */
  effectiveTurnstileCount: number;
  markov: MarkovTelemetry;
  little: LittleLawMetrics;
  distribution: TimeDistribution;
  kpis: SimKPIs;
  history: HistoryPoint[];
  isOneHourComplete: boolean;
}

/**
 * Gerador pseudoaleatório Mulberry32 com semente fixa de 32 bits.
 * Produz números uniformemente distribuídos no intervalo [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function nextRandom(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calcula a taxa de chegada vigente λ (alunos/min) e a fase no tempo t (segundos).
 * No Modo Onda de Pico:
 * - 0 a 15 min e 40 a 60 min: Calma (padrão 3.5 al/min)
 * - 15 a 40 min: Pico (padrão 4.9 al/min)
 */
export function getArrivalRateAtTime(
  config: SimConfig,
  timeSec: number
): { lambda: number; wavePhase: WavePhase } {
  if (config.arrivalMode === "constant") {
    return { lambda: config.lambda, wavePhase: "constante" };
  }
  const minuteInHour = (timeSec / 60) % 60;
  if (minuteInHour >= 15 && minuteInHour < 40) {
    return { lambda: config.peakLambda, wavePhase: "pico" };
  }
  return { lambda: config.calmLambda, wavePhase: "calma" };
}

/**
 * Formata segundos em HH:MM:SS para o relógio LCD do HUD.
 */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Formata segundos de espera de um aluno para exibição compacta abaixo do sprite.
 */
export function formatWaitCompact(waitSec: number): string {
  const s = Math.max(0, Math.floor(waitSec));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

/**
 * Converte tempo simulado em horário de almoço do RU (início às 11h00).
 */
export function formatLunchClock(elapsedSec: number, startHour = 11): string {
  const totalMin = startHour * 60 + Math.floor(elapsedSec / 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

export class RUSimulator {
  private config: SimConfig;
  private rng: () => number;

  private timeSec = 0;
  private nextStudentId = 1;
  private servedCount = 0;
  private totalArrivals = 0;

  private externalQueue: Student[] = [];
  private turnstileOccupants: (Student | null)[] = [null, null, null, null, null];
  private buffetStudents: Student[] = [];

  // Acumuladores temporais para métricas exatas
  private sumL = 0;
  private sumQueue = 0;
  private sumTurnstile = 0;
  private sumBuffet = 0;
  private longQueueTicks = 0;

  // Acumuladores empíricos de alunos que completaram o percurso
  private completedQueueSec = 0;
  private completedTurnstileSec = 0;
  private completedBuffetSec = 0;
  private completedTotalSec = 0;

  // Picos
  private maxQueue = 0;
  private maxQueueTimeSec = 0;
  private maxN = 0;

  // Histórico amostrado para o gráfico
  private history: HistoryPoint[] = [];
  private isOneHourComplete = false;

  constructor(initialConfig?: Partial<SimConfig>) {
    this.config = this.sanitizeConfig({ ...DEFAULT_CONFIG, ...initialConfig });
    this.rng = mulberry32(this.config.seed);
    this.initializeState();
  }

  private sanitizeConfig(cfg: SimConfig): SimConfig {
    const enabled: [boolean, boolean, boolean, boolean, boolean] = [
      ...cfg.turnstileEnabled,
    ] as [boolean, boolean, boolean, boolean, boolean];
    // Garante pelo menos 1 catraca configurada como ativa
    if (!enabled.some(Boolean)) {
      enabled[0] = true;
    }
    return {
      ...cfg,
      lambda: Math.max(0.1, Math.min(60, Number(cfg.lambda) || DEFAULT_CONFIG.lambda)),
      calmLambda: Math.max(0.1, Math.min(60, Number(cfg.calmLambda) || DEFAULT_CONFIG.calmLambda)),
      peakLambda: Math.max(0.1, Math.min(60, Number(cfg.peakLambda) || DEFAULT_CONFIG.peakLambda)),
      turnstileEnabled: enabled,
      turnstileServiceTimeSec: Math.max(2, Math.min(180, Number(cfg.turnstileServiceTimeSec) || DEFAULT_CONFIG.turnstileServiceTimeSec)),
      buffetServiceTimeSec: Math.max(10, Math.min(900, Number(cfg.buffetServiceTimeSec) || DEFAULT_CONFIG.buffetServiceTimeSec)),
      buffetCapacity: Math.max(1, Math.min(300, Math.round(Number(cfg.buffetCapacity) || DEFAULT_CONFIG.buffetCapacity))),
      initialQueue: Math.max(0, Math.min(300, Math.round(Number(cfg.initialQueue) || 0))),
      initialBuffet: Math.max(0, Math.min(300, Math.round(Number(cfg.initialBuffet) || 0))),
      seed: Number.isFinite(cfg.seed) ? cfg.seed : DEFAULT_SEED,
    };
  }

  private initializeState(): void {
    this.rng = mulberry32(this.config.seed);
    this.timeSec = 0;
    this.nextStudentId = 1;
    this.servedCount = 0;
    this.totalArrivals = 0;
    this.externalQueue = [];
    this.turnstileOccupants = [null, null, null, null, null];
    this.buffetStudents = [];

    this.sumL = 0;
    this.sumQueue = 0;
    this.sumTurnstile = 0;
    this.sumBuffet = 0;
    this.longQueueTicks = 0;

    this.completedQueueSec = 0;
    this.completedTurnstileSec = 0;
    this.completedBuffetSec = 0;
    this.completedTotalSec = 0;
    this.isOneHourComplete = false;

    // Popula alunos iniciais no buffet (respeitando capacidade K)
    const initBuffet = Math.min(this.config.initialBuffet, this.config.buffetCapacity);
    for (let i = 0; i < initBuffet; i++) {
      this.buffetStudents.push({
        id: this.nextStudentId++,
        arrivedAt: 0,
        enteredTurnstileAt: 0,
        enteredBuffetAt: 0,
        exitedAt: null,
      });
    }

    // Popula fila inicial n0 (Fase 1 + 2)
    for (let i = 0; i < this.config.initialQueue; i++) {
      this.externalQueue.push({
        id: this.nextStudentId++,
        arrivedAt: 0,
        enteredTurnstileAt: null,
        enteredBuffetAt: null,
        exitedAt: null,
      });
    }

    this.reconcileTurnstiles();

    const n0 = this.getStateN();
    this.maxQueue = this.externalQueue.length;
    this.maxQueueTimeSec = 0;
    this.maxN = n0;

    this.history = [
      {
        timeSec: 0,
        queueLength: this.externalQueue.length,
        stateN: n0,
        buffetCount: this.buffetStudents.length,
        totalInSystem: n0 + this.buffetStudents.length,
      },
    ];
  }

  /**
   * Identifica o índice (0..4) da catraca atualmente em pane, caso `turnstileFault` esteja ativo.
   * Pausa a última catraca habilitada (ex.: se C1..C3 ativas, C3 sofre pane; se só C1 ativa, C1 sofre pane).
   */
  private getFaultedTurnstileIndex(): number {
    if (!this.config.turnstileFault) return -1;
    for (let i = MAX_TURNSTILES - 1; i >= 0; i--) {
      if (this.config.turnstileEnabled[i]) {
        return i;
      }
    }
    return -1;
  }

  private getOperationalIndices(): number[] {
    const faultIdx = this.getFaultedTurnstileIndex();
    const indices: number[] = [];
    for (let i = 0; i < MAX_TURNSTILES; i++) {
      if (this.config.turnstileEnabled[i] && i !== faultIdx) {
        indices.push(i);
      }
    }
    return indices;
  }

  /**
   * Sincroniza os ocupantes das catracas com o conjunto operacional atual:
   * - Se uma catraca foi desativada ou entrou em pane, devolve o discente à frente da fila externa.
   * - Se há catraca operacional livre e fila externa > 0, puxa o próximo discente.
   */
  private reconcileTurnstiles(): void {
    const operationalSet = new Set(this.getOperationalIndices());

    // Devolve alunos de catracas que pararam de operar para a frente da fila
    for (let i = MAX_TURNSTILES - 1; i >= 0; i--) {
      if (!operationalSet.has(i) && this.turnstileOccupants[i] !== null) {
        const displaced = this.turnstileOccupants[i]!;
        this.turnstileOccupants[i] = null;
        this.externalQueue.unshift(displaced);
      }
    }

    // Aloca próximos alunos nas catracas operacionais livres
    for (const idx of operationalSet) {
      if (this.turnstileOccupants[idx] === null && this.externalQueue.length > 0) {
        const next = this.externalQueue.shift()!;
        if (next.enteredTurnstileAt === null) {
          next.enteredTurnstileAt = this.timeSec;
        }
        this.turnstileOccupants[idx] = next;
      }
    }
  }

  private getInTurnstilesCount(): number {
    let count = 0;
    for (let i = 0; i < MAX_TURNSTILES; i++) {
      if (this.turnstileOccupants[i] !== null) count++;
    }
    return count;
  }

  private getStateN(): number {
    return this.externalQueue.length + this.getInTurnstilesCount();
  }

  /**
   * Calcula as probabilidades da Cadeia de Markov para o estado atual (Fase 1 + 2).
   */
  private computeMarkovTelemetry(): MarkovTelemetry {
    const { lambda: currentLambda, wavePhase } = getArrivalRateAtTime(
      this.config,
      this.timeSec
    );
    const n = this.getStateN();
    const effectiveTurnstiles = this.getOperationalIndices().length;
    const muPerTurnstile = 60 / this.config.turnstileServiceTimeSec;
    const buffetBlocked = this.buffetStudents.length >= this.config.buffetCapacity;

    // Probabilidade de chegada (subir estado): a = λ * (Δt / 60)
    let probUp = currentLambda * (DT_SECONDS / 60);

    // Probabilidade de saída das catracas (descer estado): s = min(n, c) * μ * (Δt / 60)
    // Se n = 0, c_eff = 0 ou buffet bloqueado (lotado em K), s = 0
    let probDown =
      n > 0 && effectiveTurnstiles > 0 && !buffetBlocked
        ? Math.min(n, effectiveTurnstiles) * muPerTurnstile * (DT_SECONDS / 60)
        : 0;

    // Segurança numérica caso o usuário insira parâmetros extremos onde a + s > 1
    const sum = probUp + probDown;
    if (sum > 1) {
      probUp = probUp / sum;
      probDown = probDown / sum;
    }

    const probStay = Math.max(0, 1 - probUp - probDown);

    return {
      n,
      dt: DT_SECONDS,
      probUp,
      probDown,
      probStay,
      currentLambda,
      muPerTurnstile,
      effectiveTurnstiles,
      wavePhase,
    };
  }

  /**
   * Avança a simulação em exatamente 1 passo discreto (Δt = 1 segundo).
   */
  public step(): SimSnapshot {
    this.isOneHourComplete = false;
    this.reconcileTurnstiles();

    const markov = this.computeMarkovTelemetry();
    const nextTime = this.timeSec + DT_SECONDS;

    // 1. Transição da Cadeia de Markov (Fase 1 + Fase 2)
    const u = this.rng();
    if (u < markov.probUp) {
      // Chegada (n -> n + 1)
      const student: Student = {
        id: this.nextStudentId++,
        arrivedAt: nextTime,
        enteredTurnstileAt: null,
        enteredBuffetAt: null,
        exitedAt: null,
      };
      this.externalQueue.push(student);
      this.totalArrivals += 1;
    } else if (u < markov.probUp + markov.probDown) {
      // Serviço concluído na catraca (n -> n - 1): move discente mais antigo nas catracas para o buffet
      let oldestSlot = -1;
      let oldestTime = Infinity;
      for (let i = 0; i < MAX_TURNSTILES; i++) {
        const occupant = this.turnstileOccupants[i];
        if (occupant !== null) {
          const tEnter = occupant.enteredTurnstileAt ?? occupant.arrivedAt;
          if (tEnter < oldestTime) {
            oldestTime = tEnter;
            oldestSlot = i;
          }
        }
      }

      if (oldestSlot !== -1) {
        const student = this.turnstileOccupants[oldestSlot]!;
        this.turnstileOccupants[oldestSlot] = null;
        student.enteredBuffetAt = nextTime;
        this.buffetStudents.push(student);
      }
    }

    // Avança o relógio e sincroniza catracas livres imediatamente
    this.timeSec = nextTime;
    this.reconcileTurnstiles();

    // 2. Fase 3 (Buffet com K vagas simultâneas)
    if (!this.config.buffetPaused && this.buffetStudents.length > 0) {
      const pExitBuffet = Math.min(1, DT_SECONDS / this.config.buffetServiceTimeSec);
      const remaining: Student[] = [];
      for (const student of this.buffetStudents) {
        if (this.rng() < pExitBuffet) {
          student.exitedAt = this.timeSec;
          this.servedCount += 1;

          const tTurnstile = student.enteredTurnstileAt ?? student.arrivedAt;
          const tBuffet = student.enteredBuffetAt ?? tTurnstile;
          const waitQ = Math.max(0, tTurnstile - student.arrivedAt);
          const waitC = Math.max(0, tBuffet - tTurnstile);
          const waitB = Math.max(0, this.timeSec - tBuffet);

          this.completedQueueSec += waitQ;
          this.completedTurnstileSec += waitC;
          this.completedBuffetSec += waitB;
          this.completedTotalSec += waitQ + waitC + waitB;
        } else {
          remaining.push(student);
        }
      }
      this.buffetStudents = remaining;
    }

    // 3. Atualiza acumuladores estatísticos e histórico
    const queueLen = this.externalQueue.length;
    const inTurnstiles = this.getInTurnstilesCount();
    const stateN = queueLen + inTurnstiles;
    const buffetLen = this.buffetStudents.length;
    const totalL = stateN + buffetLen;

    this.sumQueue += queueLen;
    this.sumTurnstile += inTurnstiles;
    this.sumBuffet += buffetLen;
    this.sumL += totalL;

    if (stateN >= LONG_QUEUE_THRESHOLD) {
      this.longQueueTicks += 1;
    }

    if (queueLen > this.maxQueue) {
      this.maxQueue = queueLen;
      this.maxQueueTimeSec = this.timeSec;
    }
    if (stateN > this.maxN) {
      this.maxN = stateN;
    }

    // Amostra o histórico a cada 5 segundos (ou nos primeiros 10s a cada segundo) para manter o gráfico leve e preciso
    if (this.timeSec <= 10 || this.timeSec % 5 === 0) {
      this.history.push({
        timeSec: this.timeSec,
        queueLength: queueLen,
        stateN,
        buffetCount: buffetLen,
        totalInSystem: totalL,
      });
      // Limita tamanho em simulações muito longas (> 2h) preservando resolução
      if (this.history.length > 1500) {
        this.history = this.history.filter((_, idx) => idx % 2 === 0 || idx === this.history.length - 1);
      }
    }

    return this.getSnapshot();
  }

  public stepMany(seconds: number): SimSnapshot {
    const steps = Math.max(1, Math.floor(seconds));
    for (let i = 0; i < steps; i++) {
      this.step();
    }
    return this.getSnapshot();
  }

  /**
   * Modo "Simular 1h": reinicia com a semente fixa atual, executa 3600 passos (60 min)
   * instantaneamente, plota a série completa de 60 minutos e congela os KPIs finais.
   */
  public simulateOneHour(): SimSnapshot {
    this.initializeState();
    for (let i = 0; i < ONE_HOUR_SECONDS; i++) {
      this.step();
    }
    // Garante ponto final exato em t = 3600
    const last = this.history[this.history.length - 1];
    if (!last || last.timeSec !== ONE_HOUR_SECONDS) {
      const q = this.externalQueue.length;
      const n = this.getStateN();
      const b = this.buffetStudents.length;
      this.history.push({
        timeSec: this.timeSec,
        queueLength: q,
        stateN: n,
        buffetCount: b,
        totalInSystem: n + b,
      });
    }
    this.isOneHourComplete = true;
    return this.getSnapshot();
  }

  public reset(newConfig?: Partial<SimConfig>): SimSnapshot {
    if (newConfig) {
      this.config = this.sanitizeConfig({ ...this.config, ...newConfig });
    }
    this.initializeState();
    return this.getSnapshot();
  }

  public updateConfig(partial: Partial<SimConfig>): SimSnapshot {
    this.config = this.sanitizeConfig({ ...this.config, ...partial });
    this.reconcileTurnstiles();
    return this.getSnapshot();
  }

  public addStudentsToQueue(count: number): SimSnapshot {
    const n = Math.max(1, Math.min(100, Math.round(count)));
    for (let i = 0; i < n; i++) {
      this.externalQueue.push({
        id: this.nextStudentId++,
        arrivedAt: this.timeSec,
        enteredTurnstileAt: null,
        enteredBuffetAt: null,
        exitedAt: null,
      });
      this.totalArrivals += 1;
    }
    this.reconcileTurnstiles();
    if (this.externalQueue.length > this.maxQueue) {
      this.maxQueue = this.externalQueue.length;
      this.maxQueueTimeSec = this.timeSec;
    }
    const stateN = this.getStateN();
    if (stateN > this.maxN) {
      this.maxN = stateN;
    }
    return this.getSnapshot();
  }

  public addStudentsToBuffet(count: number): SimSnapshot {
    const freeSlots = Math.max(0, this.config.buffetCapacity - this.buffetStudents.length);
    const toAdd = Math.max(0, Math.min(freeSlots, Math.round(count)));
    for (let i = 0; i < toAdd; i++) {
      this.buffetStudents.push({
        id: this.nextStudentId++,
        arrivedAt: this.timeSec,
        enteredTurnstileAt: this.timeSec,
        enteredBuffetAt: this.timeSec,
        exitedAt: null,
      });
    }
    return this.getSnapshot();
  }

  public getConfig(): SimConfig {
    return {
      ...this.config,
      turnstileEnabled: [...this.config.turnstileEnabled] as [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
      ],
    };
  }

  public getSnapshot(): SimSnapshot {
    const markov = this.computeMarkovTelemetry();
    const activeTurnstileCount = this.config.turnstileEnabled.filter(Boolean).length;
    const faultIdx = this.getFaultedTurnstileIndex();
    const buffetBlocked = this.buffetStudents.length >= this.config.buffetCapacity;

    // Monta slots visuais das 5 catracas numeradas dinamicamente (C-01 .. C-05)
    const turnstiles: TurnstileSlot[] = [];
    for (let i = 0; i < MAX_TURNSTILES; i++) {
      const code = `C-${String(i + 1).padStart(2, "0")}`;
      const enabled = this.config.turnstileEnabled[i];
      const faulted = i === faultIdx;
      const student = this.turnstileOccupants[i];

      let status: TurnstileStatus;
      let label: string;

      if (!enabled) {
        status = "off";
        label = "Manutenção";
      } else if (faulted) {
        status = "fault";
        label = "Pane leitor QR";
      } else if (buffetBlocked) {
        status = "blocked";
        label = student ? `Discente #${student.id} (Bloq.)` : "Buffet lotado";
      } else if (student) {
        const readingTime = this.timeSec - (student.enteredTurnstileAt ?? this.timeSec);
        if (readingTime >= Math.ceil(this.config.turnstileServiceTimeSec * 0.65)) {
          status = "wait";
          label = "Lendo QR Code...";
        } else {
          status = "ok";
          label = `Discente #${student.id}`;
        }
      } else {
        status = "ok";
        label = "Livre";
      }

      turnstiles.push({
        index: i + 1,
        code,
        enabled,
        faulted,
        status,
        student: student ? { ...student } : null,
        label,
      });
    }

    // Utilizações teóricas instantâneas
    const cEff = markov.effectiveTurnstiles;
    const totalTurnstileRate = cEff * markov.muPerTurnstile; // al/min
    const rhoTurnstiles =
      totalTurnstileRate > 0 ? markov.currentLambda / totalTurnstileRate : Infinity;

    const totalBuffetRate = this.config.buffetPaused
      ? 0
      : this.config.buffetCapacity * (60 / this.config.buffetServiceTimeSec);
    const rhoBuffet =
      totalBuffetRate > 0 ? markov.currentLambda / totalBuffetRate : Infinity;

    // Distribuição temporal (Fila Externa vs Catraca vs Buffet)
    let avgQueueSec: number;
    let avgTurnstileSec: number;
    let avgBuffetSec: number;

    if (this.servedCount >= 3) {
      avgQueueSec = this.completedQueueSec / this.servedCount;
      avgTurnstileSec = this.completedTurnstileSec / this.servedCount;
      avgBuffetSec = this.completedBuffetSec / this.servedCount;
    } else if (this.timeSec > 0 && this.sumL > 0) {
      // Estimativa consistente durante o aquecimento antes dos primeiros términos no buffet
      const lambdaSec = Math.max(1e-6, markov.currentLambda / 60);
      const obsAvgQ = this.sumQueue / this.timeSec;
      avgQueueSec = obsAvgQ / lambdaSec;
      avgTurnstileSec = this.config.turnstileServiceTimeSec;
      avgBuffetSec = this.config.buffetServiceTimeSec;
    } else {
      // t = 0: estimativa inicial com base na fila inicial n0
      const capRateSec = Math.max(1e-6, (cEff * markov.muPerTurnstile) / 60);
      avgQueueSec = this.externalQueue.length / capRateSec;
      avgTurnstileSec = this.config.turnstileServiceTimeSec;
      avgBuffetSec = this.config.buffetServiceTimeSec;
    }

    const avgTotalSec = Math.max(1e-6, avgQueueSec + avgTurnstileSec + avgBuffetSec);
    const queuePct = (avgQueueSec / avgTotalSec) * 100;
    const turnstilePct = (avgTurnstileSec / avgTotalSec) * 100;
    const buffetPct = Math.max(0, 100 - queuePct - turnstilePct);

    // Lei de Little: L = λ * W
    const lambdaEffectivePerSec =
      this.timeSec >= 30 && this.totalArrivals > 0
        ? this.totalArrivals / this.timeSec
        : markov.currentLambda / 60;
    const lambdaEffectivePerMin = lambdaEffectivePerSec * 60;
    const littleL = lambdaEffectivePerSec * avgTotalSec;
    const currentL = markov.n + this.buffetStudents.length;
    const observedAvgL = this.timeSec > 0 ? this.sumL / this.timeSec : currentL;
    const isStable = rhoTurnstiles < 1 && rhoBuffet < 1;

    let conformanceLabel = "(Aquecendo)";
    if (!isStable) {
      conformanceLabel = "(Instável: ρ ≥ 1)";
    } else if (this.servedCount >= 5) {
      const relDiff = Math.abs(littleL - observedAvgL) / Math.max(1, observedAvgL);
      conformanceLabel = relDiff <= 0.25 ? "(Em conformidade)" : "(Regime transitório)";
    } else if (this.timeSec === 0) {
      conformanceLabel = "(Pronto para iniciar)";
    }

    const longQueuePct =
      this.timeSec > 0
        ? (this.longQueueTicks / this.timeSec) * 100
        : markov.n >= LONG_QUEUE_THRESHOLD
          ? 100
          : 0;

    const throughputPerMin =
      this.timeSec > 0 ? (this.servedCount / this.timeSec) * 60 : 0;

    return {
      config: this.getConfig(),
      timeSec: this.timeSec,
      servedCount: this.servedCount,
      externalQueue: this.externalQueue.map((s) => ({ ...s })),
      turnstiles,
      buffetStudents: this.buffetStudents.map((s) => ({ ...s })),
      buffetBlocked,
      activeTurnstileCount,
      effectiveTurnstileCount: cEff,
      markov,
      little: {
        lambdaEffectivePerSec,
        lambdaEffectivePerMin,
        avgTotalTimeSec: avgTotalSec,
        littleL,
        observedAvgL,
        currentL,
        isStable,
        conformanceLabel,
      },
      distribution: {
        queuePct,
        turnstilePct,
        buffetPct,
        avgQueueSec,
        avgTurnstileSec,
        avgBuffetSec,
        avgTotalSec,
      },
      kpis: {
        rhoTurnstiles,
        rhoBuffet,
        turnstileOverloaded: rhoTurnstiles >= 1,
        buffetOverloaded: rhoBuffet >= 1,
        maxQueue: this.maxQueue,
        maxQueueTimeSec: this.maxQueueTimeSec,
        maxN: this.maxN,
        longQueuePct,
        throughputPerMin,
      },
      history: this.history.slice(),
      isOneHourComplete: this.isOneHourComplete,
    };
  }
}
