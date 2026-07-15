import assert from 'node:assert/strict'
import test from 'node:test'
import sourceChallenges from '../content/challenges.json'
import * as webCore from '../packages/game-core/src/index.ts'
import { challenges as miniChallenges } from '../miniprogram/generated/challenges.ts'
import * as miniCore from '../miniprogram/generated/game-core.ts'

test('Web 与小程序加载完全相同的题库', () => {
  assert.deepEqual(miniChallenges, sourceChallenges)
})

test('Web 与小程序核心对 12 关产生相同结果', () => {
  let webState = webCore.startGame()
  let miniState = miniCore.startGame()
  for (let index = 0; index < sourceChallenges.length; index += 1) {
    webState = webCore.acceptChallenge(webState, sourceChallenges)
    miniState = miniCore.acceptChallenge(miniState, miniChallenges)
  }
  assert.deepEqual(miniState, webState)
})
