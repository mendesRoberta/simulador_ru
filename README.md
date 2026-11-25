# Simulador da Fila do Restaurante Universitário — UFOPA

Simulador estocástico interativo com estética **16-bit arcade** desenvolvido para modelar, visualizar e avaliar o desempenho do atendimento na entrada do **Restaurante Universitário da Universidade Federal do Oeste do Pará (UFOPA)** — Campus Tapajós, como requisito da disciplina de **Avaliação de Desempenho (2026)**.

---

## Contexto e Objetivo Acadêmico

A partir de dados reais coletados em campo durante **1 hora de almoço (`12h00` às `13h00`)**, este projeto modela o sistema de acesso ao RU por meio de **Teoria das Filas (`M/M/c`)** e **Cadeia de Markov de Nascimento e Morte discretizada**, permitindo:

- Diagnosticar matematicamente o gargalo atual com **1 catraca ativa (`M/M/1`)**, onde a taxa de chegada supera a capacidade de serviço ($\rho_1 \approx 106{,}47\% \ge 1$).
- Comparar de forma **100% reproduzível** cenários de intervenção (abertura de `2` até `5` catracas, redução do tempo de leitura do QR Code, ondas de pico e falhas operacionais).
- Visualizar em tempo real (`1X`, `2X`, `5X`) ou instantaneamente (`Simular 1h`) a evolução do sistema, tempos de espera e indicadores de desempenho.

---

## Modelagem Matemática

### 1. Fronteira do Sistema Principal (`M/M/c`)
O sistema principal modelado compreende **Fila Externa + Catracas**, sem limite de capacidade $K$:

$$\text{Chegadas (Poisson, }\lambda\text{)} \;\longrightarrow\; \underbrace{\text{Fase 1: Fila Externa }(L_q) \;\longrightarrow\; \text{Fase 2: Catracas }(c\text{ servidores, }\mu)}_{\text{Sistema Principal }(L,\; W)} \;\longrightarrow\; \text{Fase 3: Buffet (visual)}$$

- **$L$ (`stateN`):** total de discentes no sistema principal ($L_q$ aguardando na fila externa + discentes em atendimento nas catracas).
- **$L_q$ (`queueLength`):** discentes aguardando exclusivamente na fila externa.
- **Término do atendimento:** ocorre no instante em que o discente **conclui a passagem na catraca**, contabilizando `servedCount`, vazão e os tempos $W_q$, serviço e $W = W_q + T_{\text{catraca}}$.
- **Fase 3 (Buffet):** atua apenas como animação visual pós-catraca, utilizando um gerador pseudoaleatório isolado (`buffetRng`) sem bloquear as catracas nem interferir nas métricas do modelo.

### 2. Cadeia de Markov Discretizada ($\Delta t = 1\text{s}$)
A cada segundo, o estado $n = L \in \{0, 1, 2, \dots\}$ transita segundo as probabilidades:

- **Subir ($n \to n + 1$, chegada):**
  $$a = \lambda \cdot \frac{\Delta t}{60}$$
- **Descer ($n \to n - 1$, conclusão na catraca):**
  $$s = \min(n, c_{\text{efetivo}}) \cdot \mu \cdot \frac{\Delta t}{60}, \quad \text{onde } \mu = \frac{60}{T_{\text{catraca}}}$$
- **Permanecer ($n \to n$):**
  $$p_{\text{fica}} = 1 - a - s$$

Quando há múltiplas catracas ocupadas ($c > 1$), a catraca que conclui o atendimento é sorteada uniformemente entre as ocupadas (`serviceSlotRng`), respeitando a **propriedade sem memória** de tempos exponenciais independentes.

### 3. Rigor Estatístico e Reprodutibilidade
- **PRNG Determinístico (`Mulberry32`):** substitui `Math.random()` usando semente fixa (`20261113`), garantindo que comparações entre `M/M/1`, `M/M/2` e `Modo Onda de Pico` usem a mesma sequência estocástica base.
- **Tratamento de censura à esquerda ($N_0 = 10$):** os 10 discentes que já se encontravam no sistema às `12h00` (`Lq = 9` + `1` na `C-01`) participam normalmente da ocupação $L$ e da vazão, mas não entram nas médias de $W_q$ e $W$ por terem horário real de chegada anterior às `12h00` desconhecido.
- **Amostragem minuto a minuto (`12h00`–`12h59`):** registra exatamente 60 pontos (`t = 0s, 60s, ..., 3540s`) para comparação direta com os 60 registros da aferição em campo.

---

## Parâmetros Oficiais da Aferição (`12h00`–`13h00`)

| Parâmetro | Valor Padrão | Descrição |
|---|---|---|
| **Taxa de chegada ($\lambda$)** | `302 / 60` (`5.0333 al/min`) | 302 chegadas observadas em 60 minutos |
| **Onda de Pico (`12h00–12h45`)** | `5.33 al/min` | 240 chegadas nos primeiros 45 minutos |
| **Onda Calma (`12h45–13h00`)** | `4.13 al/min` | 62 chegadas nos últimos 15 minutos |
| **Tempo médio na catraca** | `3579 / 282` (`12.6915 seg`) | Taxa de serviço $\mu \approx 4.7276\text{ al/min}$ por catraca |
| **Catracas ativas ($c$)** | `1` (ajustável de `1` a `5`) | $\rho_1 \approx 106.47\%$ (instável) · $\rho_2 \approx 53.23\%$ (estável) |
| **Estado inicial ($N_0$)** | `10 alunos` | `9` na fila externa ($L_q$) + `1` em atendimento na `C-01` |

---

## Funcionalidades da Interface

- **Tela Inicial (`Start`):** apresentação do projeto, seção *Objetivo Acadêmico* e card ilustrado em pixel art do *Prato do Dia*.
- **Controles de Execução (HUD):** relógio digital, contador de atendidos, `Iniciar`, `Pausar`, `Reiniciar` (restaura integralmente os padrões oficiais), velocidades `1X`, `2X`, `5X` e **`Simular 1h`** (executa 3.600 passos instantaneamente).
- **Barra de Parâmetros e Injeção de Falhas:**
  - Edição em tempo real de $\lambda$, `Modo Onda de Pico`, ativação individual das catracas `C1`–`C5` (com atualização dinâmica do badge `M/M/1`..`M/M/5`), tempo na catraca e adição manual de alunos.
  - Simulação de falha operacional com **`Pane Catraca`** (pausa 1 catraca ativa e realoca o discente sem perda de estado).
- **Painel Analítico em SVG Nativo:**
  - **Histórico do Sistema ao Vivo ($L$):** série temporal das `12h00` às `13h00`, linha de referência $L \ge 10$, destaque da janela de pico e marcador do máximo em alunos.
  - **Distribuição Temporal ($W$):** gráfico donut concêntrico comparando a fração de tempo em Fila Externa ($W_q$) vs. Catraca (Serviço).
  - **KPIs:** utilização $\rho_{\text{catracas}}$ (com alerta visual quando $\rho \ge 1$), $L_q$ complementar, pico `Max L` com horário e `Sistema com L ≥ 10` (`X/60 min`).
  - **Telemetria da Cadeia de Markov & Lei de Little (Referência Teórica):** exibição instantânea de $n$, $\mu$, transições (`Sobe`, `Desce`, `Fica`) e referência $L = \lambda \cdot W$.

---

## Arquitetura do Projeto

O motor matemático é totalmente desacoplado da camada visual, escrito em TypeScript puro sem bibliotecas externas de simulação ou gráficos:

```text
simulador_ru/
├── public/assets/                 # Sprites SVG e ilustrações pixel art
└── src/
    ├── engine/
    │   └── simulator.ts           # Motor puro (RUSimulator, Mulberry32, Markov e KPIs)
    ├── components/
    │   ├── SimulatorApp.tsx       # Orquestração de estado e loop de tempo real
    │   ├── StartScreen.tsx        # Tela inicial, Objetivo Acadêmico e Prato do Dia
    │   ├── TopBarHUD.tsx          # Relógio, contador e controles de velocidade
    │   ├── ParametersBar.tsx      # Parâmetros M/M/c, Onda de Pico e Pane Catraca
    │   ├── SimulationArena.tsx    # Arena visual (Fila Externa, Catracas C-01..C-05 e Buffet)
    │   ├── AnalyticsSection.tsx   # Gráficos SVG, KPIs, Cadeia de Markov e Lei de Little
    │   └── GhostSprite.tsx        # Componente dos sprites animados
    └── app/
        ├── layout.tsx             # Fontes (Press Start 2P, Chivo Mono, VT323, Inter)
        ├── globals.css            # Estilização tema arcade e animações suaves
        └── page.tsx               # Página raiz da aplicação
```

### Tecnologias Utilizadas
- **Next.js 16** (App Router + Turbopack)
- **React 19** (React Compiler habilitado)
- **TypeScript 5**
- **Tailwind CSS 4**

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js** `>= 20` e **npm**

### 1. Rodar a aplicação web
```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```
Acesse [http://localhost:3000](http://localhost:3000) no navegador.

Para gerar e testar a build de produção:
```bash
npm run build
npm run start
```

### 2. Executar o motor isoladamente via Node.js (sem interface)
Como `src/engine/simulator.ts` não possui dependências de UI, é possível rodar experimentos em lote direto no terminal (Node.js 22+):

```bash
node --experimental-strip-types -e "import { RUSimulator, DEFAULT_CONFIG } from './src/engine/simulator.ts'; const s = new RUSimulator(DEFAULT_CONFIG).simulateOneHour(); console.log({ atendidos: s.servedCount, maxL: s.kpis.maxN, minLge10: s.kpis.longQueueMinuteCount + '/60', W_seg: Number(s.little.avgTotalTimeSec.toFixed(1)) });"
```

---

## Equipe

- **Ana Clara Lages Maia**
- **Andressa Dias de Sousa**
- **Matheus Calderaro Maciel**
- **Roberta Mendes Monteiro**

**Universidade Federal do Oeste do Pará (UFOPA)** — *Disciplina de Avaliação de Desempenho · 2026*
