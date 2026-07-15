import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const entries = [
  { route: 'minimal', theme: 'minimal', title: 'SBTI 式极简版' },
  { route: 'paper', theme: 'paper', title: '纸张账单版' },
  { route: 'cyber', theme: 'cyber', title: '极简赛博版' },
]

test('三个 H5 版本拥有独立入口并加载同一个游戏运行时', async () => {
  for (const entry of entries) {
    const html = await readFile(new URL(`../web/${entry.route}/index.html`, import.meta.url), 'utf8')
    assert.match(html, new RegExp(`<body data-theme="${entry.theme}">`))
    assert.match(html, new RegExp(`<title>${entry.title}`))
    assert.match(html, /src="\/src\/main\.ts"/)
  }
})

test('版本选择页只链接三个本地静态入口', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8')
  for (const entry of entries) assert.match(html, new RegExp(`href="/${entry.route}/"`))
  assert.doesNotMatch(html, /https?:\/\//)
})
