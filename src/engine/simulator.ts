/**
 * Motor de Simulação da Fila do Restaurante Universitário (UFOPA)
 *
 * Arquitetura pura em TypeScript:
 * - Sistema principal modelado: Fase 1 (Fila Externa: Lq) + Fase 2 (Catracas: c servidores)
 *   - Estado L (stateN) = alunos na fila externa + alunos em atendimento nas catracas
 *   - Sem limite de capacidade K e sem bloqueio pelo buffet
 * - Fase 3 (Buffet): elemento exclusivamente visual/animação pós-catraca (não interfere em L, W ou vazão)
 * - Passo discreto: Δt = 1s
 * - Cadeia de Markov (nascimento e morte discretizada)
 * - Gerador pseudoaleatório determinístico Mulberry32 para reprodutibilidade entre cenários
 */

export const DEFAULT_SEED = 20261113;
export const DT_SECONDS = 1;
export const ONE_HOUR_SECONDS = 3600;
export const LONG_QUEUE_THRESHOLD = 10;
export const MAX_TURNSTILES = 5;

export type ArrivalMode = "constant" | "peak_wave";
export type SimSpeed = 1 | 2 | 5;
export type TurnstileStatus = "ok" | "wait" | "off" | "fault";
export type WavePhase = "constante" | "calma" | "pico";

export interface SimConfig {
  /** Taxa de chegada λ em modo constante (alunos/min). Base oficial: 302 / 60 ≈ 5.0333 */
  lambda: number;
  /** Taxa de chegada λ no trecho calmo do Modo Onda de Pico (12:45–13:00). Padrão: 4.13 */
  calmLambda: number;
  /** Taxa de chegada λ no trecho de pico do Modo Onda de Pico (12:00–12:45). Padrão: 5.33 */
  peakLambda: number;
  /** Modo de chegada: constante ou onda de pico */
  arrivalMode: ArrivalMode;
  /** Quais das 5 catracas (C1..C5) estão habilitadas */
  turnstileEnabled: [boolean, boolean, boolean, boolean, boolean];
  /** Tempo médio de atendimento em cada catraca (seg). Base oficial: 3579 / 282 ≈ 12.6915s */
  turnstileServiceTimeSec: number;
  /** Tempo médio visual de permanência no buffet (seg) — apenas animação pós-catraca */
  buffetServiceTimeSec: number;
  /** Quantidade inicial N0 no sistema principal (fila externa + catraca) às 12:00:00. Padrão: 10 */
  initialQueue: number;
  /** Quantidade inicial visual de alunos se servindo no buffet às 12:00:00. Padrão: 0 */
  initialBuffet: number;
  /** Injeção de falha: pausa 1 catraca ativa temporariamente */
  turnstileFault: boolean;
  /** Injeção visual: pausa a saída visual do buffet (nunca bloqueia as catracas) */
  buffetPaused: boolean;
  /** Semente fixa para o gerador pseudoaleatório Mulberry32 */
  seed: number;
}

export const DEFAULT_CONFIG: SimConfig = {
  lambda: 302 / 60, // 5.0333 pessoas/min (302 chegadas em 60 min)
  calmLambda: 4.13, // Trecho calmo: 12:45–13:00 (62 chegadas / 15 min)
  peakLambda: 5.33, // Trecho de pico: 12:00–12:45 (240 chegadas / 45 min)
  arrivalMode: "constant",
  turnstileEnabled: [true, false, false, false, false], // 1 catraca ativa
  turnstileServiceTimeSec: 3579 / 282, // 12.6915s -> μ ≈ 4.7276/min, ρ1 ≈ 106.47%, ρ2 ≈ 53.23%
  buffetServiceTimeSec: 263, // 4.39 min médios (somente animação visual pós-catraca)
  initialQueue: 10, // N0 = 10 no sistema inicial (9 em Lq + 1 na C-01)
  initialBuffet: 0, // 0 alunos visualmente no buffet às 12:00:00
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
  /** Verdadeiro para os N0 alunos que já estavam no sistema em t=0 (horário real de chegada desconhecido) */
  isInitial?: boolean;
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
  /** Total de pessoas no sistema principal: L = stateN (fila externa + catracas) */
  stateN: number;
  /** Alunos apenas na visualização do buffet (fora do sistema principal) */
  buffetCount: number;
}

export interface MarkovTelemetry {
  /** Estado atual L = n = fila externa (Lq) + passando nas catracas */
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
  /** Tempo médio total no sistema principal W = Wq + tempo na catraca (segundos) */
  avgTotalTimeSec: number;
  /** Referência teórica L = λ · W (exclusivamente Fila Externa + Catracas) */
  littleL: number;
  /** L médio observado (média temporal de stateN) */
  observedAvgL: number;
  /** L atual no sistema principal (stateN) */
  currentL: number;
  /** Lq médio observado (média temporal da fila externa) */
  observedAvgLq: number;
  /** Se o sistema principal está matematicamente estável (ρ_catracas < 1) */
  isStable: boolean;
  /** Rótulo teórico (sem afirmar validação numérica) */
  referenceLabel: string;
}

export interface TimeDistribution {
  queuePct: number;
  turnstilePct: number;
  avgQueueSec: number;
  avgTurnstileSec: number;
  avgTotalSec: number;
}

export interface SimKPIs {
  /** Utilização das catracas: ρ_catracas = λ / (c * μ) */
  rhoTurnstiles: number;
  /** Alerta de saturação nas catracas (ρ >= 1) */
  turnstileOverloaded: boolean;
  /** Pico máximo do sistema principal L (stateN) */
  maxN: number;
  /** Instante (segundos) em que ocorreu o pico máximo de L */
  maxNTimeSec: number;
  /** Pico máximo da fila externa Lq */
  maxQueue: number;
  /** Fração do tempo (%) em que L (stateN) >= 10 */
  longQueuePct: number;
  /** Amostragem minuto a minuto (0..60): quantos minutos registraram L >= 10 */
  longQueueMinuteCount: number;
  /** Total de registros minuto a minuto coletados até o momento */
  minuteSampleCount: number;
  /** Percentual de minutos amostrados com L >= 10 */
  longQueueMinutePct: number;
  /** Vazão efetiva de saída das catracas (alunos/min) */
  throughputPerMin: number;
}

export interface SimSnapshot {
  config: SimConfig;
  timeSec: number;
  /** Total de alunos que concluíram a passagem na catraca */
  servedCount: number;
  externalQueue: Student[];
  turnstiles: TurnstileSlot[];
  /** Apenas visualização/animação pós-catraca */
  buffetStudents: Student[];
  /** Catracas habilitadas pelo usuário (1..5), define o badge M/M/c */
  activeTurnstileCount: number;
  /** Catracas efetivamente operando (descontando Pane Catraca) */
  effectiveTurnstileCount: number;
  markov: MarkovTelemetry;
  little: LittleLawMetrics;
  distribution: TimeDistribution;
  kpis: SimKPIs;
  history: HistoryPoint[];
  /** Amostragem exata minuto a minuto (60 registros em Simular 1h, alinhada à aferição) */
  minuteSamples: HistoryPoint[];
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
 * No Modo Onda de Pico (aferição oficial 12:00–13:00):
 * - 0 a 45 min (12:00–12:45): Pico (padrão 5.33 al/min)
 * - 45 a 60 min (12:45–13:00): Calma (padrão 4.13 al/min)
 */
export function getArrivalRateAtTime(
  config: SimConfig,
  timeSec: number
): { lambda: number; wavePhase: WavePhase } {
  if (config.arrivalMode === "constant") {
    return { lambda: config.lambda, wavePhase: "constante" };
  }
  const minuteInHour = (timeSec / 60) % 60;
  if (minuteInHour < 45) {
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
 * Converte tempo simulado em horário de almoço do RU (aferição 12h00 às 13h00).
 */
export function formatLunchClock(elapsedSec: number, startHour = 12): string {
  const totalMin = startHour * 60 + Math.floor(elapsedSec / 60);
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

export class RUSimulator {
  private config: SimConfig;
  private rng: () => number;
  /** PRNG separado para escolher aleatoriamente entre catracas ocupadas (M/M/c, c > 1) */
  private serviceSlotRng: () => number;
  /** PRNG separado para a animação visual do buffet, garantindo 0 interferência na Cadeia de Markov principal */
  private buffetRng: () => number;

  private timeSec = 0;
  private nextStudentId = 1;
  /** Concluíram a catraca (saída do sistema principal) */
  private servedCount = 0;
  /** Concluíram a catraca com horário de chegada conhecido (exclui os N0 alunos iniciais de t=0) */
  private timedServedCount = 0;
  private totalArrivals = 0;

  private externalQueue: Student[] = [];
  private turnstileOccupants: (Student | null)[] = [null, null, null, null, null];
  /** Apenas visual/animação pós-catraca (sem capacidade K e sem bloqueio) */
  private buffetStudents: Student[] = [];

  // Acumuladores temporais do sistema principal (L = stateN, Lq = externalQueue)
  private sumN = 0;
  private sumQueue = 0;
  private longQueueTicks = 0;

  // Acumuladores empíricos de quem concluiu a catraca (W = Wq + tempo na catraca)
  private completedQueueSec = 0;
  private completedTurnstileSec = 0;
  private completedTotalSec = 0;

  // Picos
  private maxN = 0;
  private maxNTimeSec = 0;
  private maxQueue = 0;

  // Histórico amostrado para o gráfico + amostragem minuto a minuto (60 registros em 1h)
  private history: HistoryPoint[] = [];
  private minuteSamples: HistoryPoint[] = [];
  private isOneHourComplete = false;

  constructor(initialConfig?: Partial<SimConfig>) {
    this.config = this.sanitizeConfig({ ...DEFAULT_CONFIG, ...initialConfig });
    this.rng = mulberry32(this.config.seed);
    this.serviceSlotRng = mulberry32((this.config.seed ^ 0x85ebca6b) >>> 0);
    this.buffetRng = mulberry32((this.config.seed ^ 0x9e3779b9) >>> 0);
    this.initializeState();
  }

  private sanitizeConfig(cfg: SimConfig): SimConfig {
    const enabled: [boolean, boolean, boolean, boolean, boolean] = [
      ...cfg.turnstileEnabled,
    ] as [boolean, boolean, boolean, boolean, boolean];
    // Garante pelo menos 1 catraca configurada como ativa (M/M/1 .. M/M/5)
    if (!enabled.some(Boolean)) {
      enabled[0] = true;
    }
    return {
      ...cfg,
      lambda: Math.max(0.1, Math.min(60, Number(cfg.lambda) || DEFAULT_CONFIG.lambda)),
      calmLambda: Math.max(0.1, Math.min(60, Number(cfg.calmLambda) || DEFAULT_CONFIG.calmLambda)),
      peakLambda: Math.max(0.1, Math.min(60, Number(cfg.peakLambda) || DEFAULT_CONFIG.peakLambda)),
      turnstileEnabled: enabled,
      turnstileServiceTimeSec: Math.max(
        2,
        Math.min(180, Number(cfg.turnstileServiceTimeSec) || DEFAULT_CONFIG.turnstileServiceTimeSec)
      ),
      buffetServiceTimeSec: Math.max(
        10,
        Math.min(900, Number(cfg.buffetServiceTimeSec) || DEFAULT_CONFIG.buffetServiceTimeSec)
      ),
      initialQueue: Math.max(0, Math.min(300, Math.round(Number(cfg.initialQueue) || 0))),
      initialBuffet: Math.max(0, Math.min(300, Math.round(Number(cfg.initialBuffet) || 0))),
      seed: Number.isFinite(cfg.seed) ? cfg.seed : DEFAULT_SEED,
    };
  }

  private initializeState(): void {
    this.rng = mulberry32(this.config.seed);
    this.serviceSlotRng = mulberry32((this.config.seed ^ 0x85ebca6b) >>> 0);
    this.buffetRng = mulberry32((this.config.seed ^ 0x9e3779b9) >>> 0);
    this.timeSec = 0;
    this.nextStudentId = 1;
    this.servedCount = 0;
    this.timedServedCount = 0;
    this.totalArrivals = 0;
    this.externalQueue = [];
    this.turnstileOccupants = [null, null, null, null, null];
    this.buffetStudents = [];

    this.sumN = 0;
    this.sumQueue = 0;
    this.longQueueTicks = 0;

    this.completedQueueSec = 0;
    this.completedTurnstileSec = 0;
    this.completedTotalSec = 0;
    this.isOneHourComplete = false;

    // Popula alunos visuais iniciais no buffet (sem limite K)
    for (let i = 0; i < this.config.initialBuffet; i++) {
      this.buffetStudents.push({
        id: this.nextStudentId++,
        arrivedAt: 0,
        enteredTurnstileAt: 0,
        enteredBuffetAt: 0,
        exitedAt: null,
        isInitial: true,
      });
    }

    // Popula condição inicial N0 = 10 no sistema principal e aloca imediatamente nas catracas ativas
    // Marcados com isInitial: true para não distorcer W/Wq (horário real de chegada antes das 12h é desconhecido)
    for (let i = 0; i < this.config.initialQueue; i++) {
      this.externalQueue.push({
        id: this.nextStudentId++,
        arrivedAt: 0,
        enteredTurnstileAt: null,
        enteredBuffetAt: null,
        exitedAt: null,
        isInitial: true,
      });
    }

    this.reconcileTurnstiles();

    const n0 = this.getStateN();
    this.maxN = n0;
    this.maxNTimeSec = 0;
    this.maxQueue = this.externalQueue.length;

    const initialPoint: HistoryPoint = {
      timeSec: 0,
      queueLength: this.externalQueue.length,
      stateN: n0,
      buffetCount: this.buffetStudents.length,
    };

    this.history = [initialPoint];
    // Inclui amostra inicial em t = 0 (12h00) para alinhar os 60 registros de campo (12h00..12h59)
    this.minuteSamples = [initialPoint];
  }

  /**
   * Identifica o índice (0..4) da catraca atualmente em pane, caso `turnstileFault` esteja ativo.
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

    for (let i = MAX_TURNSTILES - 1; i >= 0; i--) {
      if (!operationalSet.has(i) && this.turnstileOccupants[i] !== null) {
        const displaced = this.turnstileOccupants[i]!;
        this.turnstileOccupants[i] = null;
        this.externalQueue.unshift(displaced);
      }
    }

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

  /** Estado L = stateN: total de pessoas no sistema principal (fila externa + catracas) */
  private getStateN(): number {
    return this.externalQueue.length + this.getInTurnstilesCount();
  }

  /**
   * Calcula as probabilidades da Cadeia de Markov do sistema principal (Fila Externa + Catracas).
   * Sem limite de capacidade K e sem bloqueio pelo buffet.
   */
  private computeMarkovTelemetry(): MarkovTelemetry {
    const { lambda: currentLambda, wavePhase } = getArrivalRateAtTime(
      this.config,
      this.timeSec
    );
    const n = this.getStateN();
    const effectiveTurnstiles = this.getOperationalIndices().length;
    const muPerTurnstile = 60 / this.config.turnstileServiceTimeSec;

    // Probabilidade de chegada (subir estado): a = λ * (Δt / 60)
    let probUp = currentLambda * (DT_SECONDS / 60);

    // Probabilidade de conclusão na catraca (descer estado): s = min(n, c) * μ * (Δt / 60)
    // Nunca é bloqueada pelo buffet.
    let probDown =
      n > 0 && effectiveTurnstiles > 0
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

    // 1. Transição da Cadeia de Markov do Sistema Principal (Fila Externa + Catracas)
    const u = this.rng();
    if (u < markov.probUp) {
      // Chegada (L -> L + 1)
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
      // Conclusão na catraca (L -> L - 1): término oficial do sistema modelado
      // Em M/M/c (c > 1), tempos exponenciais independentes implicam mesma probabilidade
      // de conclusão entre todas as catracas ocupadas (escolha aleatória uniforme)
      const occupiedSlots: number[] = [];
      for (let i = 0; i < MAX_TURNSTILES; i++) {
        if (this.turnstileOccupants[i] !== null) {
          occupiedSlots.push(i);
        }
      }

      if (occupiedSlots.length > 0) {
        const chosenSlot =
          occupiedSlots.length === 1
            ? occupiedSlots[0]
            : occupiedSlots[Math.floor(this.serviceSlotRng() * occupiedSlots.length)];

        const student = this.turnstileOccupants[chosenSlot]!;
        this.turnstileOccupants[chosenSlot] = null;
        student.enteredBuffetAt = nextTime;

        // Contabiliza saída do sistema principal (catraca concluída)
        this.servedCount += 1;

        // Só acumula tempos médios (Wq, serviço e W) para discentes que chegaram em t > 0
        // (exclui os N0 alunos iniciais cujo horário real de chegada antes das 12h é desconhecido)
        if (!student.isInitial) {
          this.timedServedCount += 1;
          const tTurnstile = student.enteredTurnstileAt ?? student.arrivedAt;
          const waitQ = Math.max(0, tTurnstile - student.arrivedAt);
          const waitC = Math.max(0, nextTime - tTurnstile);

          this.completedQueueSec += waitQ;
          this.completedTurnstileSec += waitC;
          this.completedTotalSec += waitQ + waitC;
        }

        // Envia apenas para a animação visual do buffet (sem limite K)
        this.buffetStudents.push(student);
      }
    }

    // Avança o relógio e sincroniza catracas livres imediatamente
    this.timeSec = nextTime;
    this.reconcileTurnstiles();

    // 2. Fase 3 (Buffet — somente animação visual pós-catraca, não afeta métricas do sistema)
    if (!this.config.buffetPaused && this.buffetStudents.length > 0) {
      const pExitBuffet = Math.min(1, DT_SECONDS / this.config.buffetServiceTimeSec);
      const remaining: Student[] = [];
      for (const student of this.buffetStudents) {
        if (this.buffetRng() < pExitBuffet) {
          student.exitedAt = this.timeSec;
        } else {
          remaining.push(student);
        }
      }
      this.buffetStudents = remaining;
    }

    // 3. Atualiza acumuladores estatísticos do sistema principal (L e Lq)
    const queueLen = this.externalQueue.length;
    const stateN = this.getStateN();
    const buffetLen = this.buffetStudents.length;

    this.sumQueue += queueLen;
    this.sumN += stateN;

    if (stateN >= LONG_QUEUE_THRESHOLD) {
      this.longQueueTicks += 1;
    }

    if (stateN > this.maxN) {
      this.maxN = stateN;
      this.maxNTimeSec = this.timeSec;
    }
    if (queueLen > this.maxQueue) {
      this.maxQueue = queueLen;
    }

    // Amostragem minuto a minuto de 12h00 até 12h59 (t = 0, 60, ..., 3540 -> 60 registros exatos)
    if (this.timeSec % 60 === 0 && this.timeSec <= 3540) {
      this.minuteSamples.push({
        timeSec: this.timeSec,
        queueLength: queueLen,
        stateN,
        buffetCount: buffetLen,
      });
    }

    // Amostra o histórico a cada 5 segundos (ou nos primeiros 10s a cada segundo) para o gráfico
    if (this.timeSec <= 10 || this.timeSec % 5 === 0) {
      this.history.push({
        timeSec: this.timeSec,
        queueLength: queueLen,
        stateN,
        buffetCount: buffetLen,
      });
      if (this.history.length > 1500) {
        this.history = this.history.filter(
          (_, idx) => idx % 2 === 0 || idx === this.history.length - 1
        );
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
   * instantaneamente, registra os 60 pontos minuto a minuto e congela os KPIs finais.
   */
  public simulateOneHour(): SimSnapshot {
    this.initializeState();
    for (let i = 0; i < ONE_HOUR_SECONDS; i++) {
      this.step();
    }
    const last = this.history[this.history.length - 1];
    if (!last || last.timeSec !== ONE_HOUR_SECONDS) {
      this.history.push({
        timeSec: this.timeSec,
        queueLength: this.externalQueue.length,
        stateN: this.getStateN(),
        buffetCount: this.buffetStudents.length,
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
    const stateN = this.getStateN();
    if (stateN > this.maxN) {
      this.maxN = stateN;
      this.maxNTimeSec = this.timeSec;
    }
    if (this.externalQueue.length > this.maxQueue) {
      this.maxQueue = this.externalQueue.length;
    }
    return this.getSnapshot();
  }

  public addStudentsToBuffet(count: number): SimSnapshot {
    const toAdd = Math.max(0, Math.min(100, Math.round(count)));
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

    // Utilização teórica das catracas: ρ_catracas = λ / (c * μ)
    const cEff = markov.effectiveTurnstiles;
    const totalTurnstileRate = cEff * markov.muPerTurnstile; // al/min
    const rhoTurnstiles =
      totalTurnstileRate > 0 ? markov.currentLambda / totalTurnstileRate : Infinity;

    // Tempos médios exclusivamente do sistema principal (quem chegou em t > 0 e concluiu a catraca)
    let avgQueueSec: number;
    let avgTurnstileSec: number;

    if (this.timedServedCount > 0) {
      avgQueueSec = this.completedQueueSec / this.timedServedCount;
      avgTurnstileSec = this.completedTurnstileSec / this.timedServedCount;
    } else if (this.timeSec > 0 && this.sumQueue > 0) {
      const lambdaSec = Math.max(1e-6, markov.currentLambda / 60);
      avgQueueSec = this.sumQueue / this.timeSec / lambdaSec;
      avgTurnstileSec = this.config.turnstileServiceTimeSec;
    } else {
      // t = 0: estimativa inicial com base em Lq inicial
      const capRateSec = Math.max(1e-6, (cEff * markov.muPerTurnstile) / 60);
      avgQueueSec = this.externalQueue.length / capRateSec;
      avgTurnstileSec = this.config.turnstileServiceTimeSec;
    }

    const avgTotalSec = Math.max(1e-6, avgQueueSec + avgTurnstileSec);
    const queuePct = (avgQueueSec / avgTotalSec) * 100;
    const turnstilePct = Math.max(0, 100 - queuePct);

    // Lei de Little (Referência Teórica) — exclusivamente Fila Externa + Catraca (sem buffet)
    const lambdaEffectivePerSec =
      this.timeSec >= 30 && this.totalArrivals > 0
        ? this.totalArrivals / this.timeSec
        : markov.currentLambda / 60;
    const lambdaEffectivePerMin = lambdaEffectivePerSec * 60;
    const littleL = lambdaEffectivePerSec * avgTotalSec;
    const currentL = markov.n;
    const observedAvgL = this.timeSec > 0 ? this.sumN / this.timeSec : currentL;
    const observedAvgLq =
      this.timeSec > 0 ? this.sumQueue / this.timeSec : this.externalQueue.length;
    const isStable = rhoTurnstiles < 1;

    const referenceLabel = !isStable
      ? "Regime instável (ρ ≥ 1)"
      : "Referência teórica (L = λ·W)";

    // Fila Longa (L = stateN >= 10): fração por segundo + amostragem minuto a minuto
    const longQueuePct =
      this.timeSec > 0
        ? (this.longQueueTicks / this.timeSec) * 100
        : markov.n >= LONG_QUEUE_THRESHOLD
          ? 100
          : 0;

    const minuteSampleCount = this.minuteSamples.length;
    const longQueueMinuteCount = this.minuteSamples.filter(
      (p) => p.stateN >= LONG_QUEUE_THRESHOLD
    ).length;
    const longQueueMinutePct =
      minuteSampleCount > 0 ? (longQueueMinuteCount / minuteSampleCount) * 100 : longQueuePct;

    // Vazão efetiva de saída das catracas (alunos/min)
    const throughputPerMin =
      this.timeSec > 0 ? (this.servedCount / this.timeSec) * 60 : 0;

    return {
      config: this.getConfig(),
      timeSec: this.timeSec,
      servedCount: this.servedCount,
      externalQueue: this.externalQueue.map((s) => ({ ...s })),
      turnstiles,
      buffetStudents: this.buffetStudents.map((s) => ({ ...s })),
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
        observedAvgLq,
        isStable,
        referenceLabel,
      },
      distribution: {
        queuePct,
        turnstilePct,
        avgQueueSec,
        avgTurnstileSec,
        avgTotalSec,
      },
      kpis: {
        rhoTurnstiles,
        turnstileOverloaded: rhoTurnstiles >= 1,
        maxN: this.maxN,
        maxNTimeSec: this.maxNTimeSec,
        maxQueue: this.maxQueue,
        longQueuePct,
        longQueueMinuteCount,
        minuteSampleCount,
        longQueueMinutePct,
        throughputPerMin,
      },
      history: this.history.slice(),
      minuteSamples: this.minuteSamples.slice(),
      isOneHourComplete: this.isOneHourComplete,
    };
  }
}
