import {
  acceptChallenge,
  advanceSpectator,
  createInitialState,
  enterSpectatorMode,
  formatLedger,
  goBack,
  quitChallenge,
  restartGame,
  startGame,
  type Challenge,
  type GameState,
} from '../../generated/game-core'
import { challenges } from '../../generated/challenges'

type Screen = 'intro' | 'challenge' | 'result'

interface PageData {
  gameState: GameState
  screen: Screen
  spectator: boolean
  busy: boolean
  transitionVisible: boolean
  transitionReceipt: string
  transitionCost: string
  progressText: string
  progressPercent: number
  challenge: Challenge
  ledgerCash: string
  ledgerTime: string
  ledgerRisk: string
  resultStamp: string
  resultMeta: string
  resultTitle: string
  resultConclusion: string
  canSpectate: boolean
}

const emptyChallenge: Challenge = {
  id: '',
  stage: 0,
  category: '',
  title: '',
  question: '',
  acceptLabel: '',
  quitLabel: '',
  delta: { listedCashCny: 0, pendingCashItems: 0, pendingTimeItems: 0, riskPoints: 0 },
  receipt: '',
  costText: '',
  costItems: [],
  sourceKeys: [],
}

function deriveView(gameState: GameState): Omit<PageData, 'busy' | 'transitionVisible' | 'transitionReceipt' | 'transitionCost'> {
  const spectator = gameState.phase === 'spectating'
  const hasChallenge = (gameState.phase === 'playing' || spectator) && gameState.currentIndex < challenges.length
  const screen: Screen = gameState.phase === 'intro' ? 'intro' : hasChallenge ? 'challenge' : 'result'
  const challenge = challenges[gameState.currentIndex] ?? emptyChallenge
  const ledger = formatLedger(gameState.lockedResult?.ledger ?? gameState.ledger)
  const result = gameState.lockedResult
  const stopped = result?.stoppedAtIndex === null ? '全 12 关完成' : `停在第 ${(result?.stoppedAtIndex ?? 0) + 1} 关`
  const spectatorFinished = spectator && gameState.currentIndex >= challenges.length

  return {
    gameState,
    screen,
    spectator,
    progressText: `${gameState.currentIndex + 1} / ${challenges.length}`,
    progressPercent: Math.round(((gameState.currentIndex + 1) / challenges.length) * 100),
    challenge,
    ledgerCash: ledger.cash,
    ledgerTime: ledger.time,
    ledgerRisk: ledger.risk,
    resultStamp: spectatorFinished ? '围观结束' : result?.completedCount === challenges.length ? 'SURVIVED' : 'RESULT LOCKED',
    resultMeta: result ? `${stopped} · 成绩 ${result.completedCount} / ${challenges.length}` : '',
    resultTitle: result?.title ?? '',
    resultConclusion: result?.conclusion ?? '',
    canSpectate: gameState.phase === 'locked' && result?.stoppedAtIndex !== null && (result?.stoppedAtIndex ?? challenges.length) < challenges.length - 1,
  }
}

function freshData(): PageData {
  return {
    ...deriveView(createInitialState()),
    busy: false,
    transitionVisible: false,
    transitionReceipt: '',
    transitionCost: '',
  }
}

let transitionTimer: number | null = null

Page({
  data: freshData(),

  onLoad() {
    wx.hideShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    })
    this.applyState(createInitialState())
  },

  onUnload() {
    if (transitionTimer !== null) clearTimeout(transitionTimer)
    transitionTimer = null
  },

  applyState(gameState: GameState) {
    this.setData({
      ...deriveView(gameState),
      busy: false,
      transitionVisible: false,
      transitionReceipt: '',
      transitionCost: '',
    })
  },

  start() {
    this.applyState(startGame())
  },

  accept() {
    if (this.data.busy || this.data.gameState.phase !== 'playing') return
    const challenge = challenges[this.data.gameState.currentIndex]
    if (!challenge) return
    const nextState = acceptChallenge(this.data.gameState, challenges)
    this.setData({
      busy: true,
      transitionVisible: true,
      transitionReceipt: challenge.receipt,
      transitionCost: challenge.costText,
    })
    transitionTimer = setTimeout(() => {
      transitionTimer = null
      this.applyState(nextState)
    }, 600)
  },

  quit() {
    if (this.data.busy || this.data.gameState.phase !== 'playing') return
    this.applyState(quitChallenge(this.data.gameState, challenges))
  },

  back() {
    if (this.data.busy) return
    this.applyState(goBack(this.data.gameState, challenges))
  },

  spectate() {
    this.applyState(enterSpectatorMode(this.data.gameState, challenges.length))
  },

  spectatorNext() {
    this.applyState(advanceSpectator(this.data.gameState, challenges.length))
  },

  restart() {
    if (transitionTimer !== null) clearTimeout(transitionTimer)
    transitionTimer = null
    this.applyState(restartGame())
  },
})
