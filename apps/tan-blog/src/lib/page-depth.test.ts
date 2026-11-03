import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizePath, pageMove, placeOf } from './page-depth.ts'

describe('placeOf', () => {
  it('各區是第一層、子列表第二層、內頁第三層', () => {
    assert.deepEqual(placeOf('/'), { depth: 1, section: 0, path: '/' })
    assert.equal(placeOf('/timeline')?.depth, 1)
    assert.deepEqual(placeOf('/categories/web'), { depth: 2, section: 1, path: '/categories/web' })
    assert.deepEqual(placeOf('/categories'), { depth: 2, section: 1, path: '/categories' })
    assert.equal(placeOf('/notes/topics')?.depth, 2)
    assert.equal(placeOf('/notes/topics/travel')?.depth, 2)
    assert.equal(placeOf('/fcircle')?.section, 5)
    assert.equal(placeOf('/posts/hello')?.depth, 3)
    assert.equal(placeOf('/notes/42')?.depth, 3)
  })
  it('去掉語系前綴與結尾斜線', () => {
    assert.equal(normalizePath('/en'), '/')
    assert.equal(normalizePath('/ja/posts/'), '/posts')
    assert.equal(normalizePath('/en/notes/3?x=1#h'), '/notes/3')
    // 不是語系前綴的路徑不動
    assert.equal(normalizePath('/english'), '/english')
  })
  it('不認得的頁回 null', () => {
    assert.equal(placeOf('/login'), null)
    assert.equal(placeOf('/posts/a/b'), null)
  })
})

describe('pageMove', () => {
  it('同層照 nav 順序：往右邊的區字往左走', () => {
    assert.equal(pageMove('/posts', '/notes'), 'left')
    assert.equal(pageMove('/friends', '/'), 'right')
    assert.equal(pageMove('/', '/timeline'), 'left')
  })
  it('往深處字往下、回淺處字往上', () => {
    assert.equal(pageMove('/posts', '/posts/hello'), 'down')
    assert.equal(pageMove('/posts/hello', '/posts'), 'up')
    assert.equal(pageMove('/', '/notes/12'), 'down')
    assert.equal(pageMove('/notes', '/notes/topics'), 'down')
    assert.equal(pageMove('/notes/topics/travel', '/notes/7'), 'down')
    assert.equal(pageMove('/categories/web', '/posts'), 'up')
    assert.equal(pageMove('/fcircle', '/friends'), 'up')
  })
  it('i18n 前綴不影響方向', () => {
    assert.equal(pageMove('/en/posts', '/en/notes'), 'left')
    assert.equal(pageMove('/ja/posts/hello', '/ja/posts'), 'up')
    assert.equal(pageMove('/en', '/en/posts/hello'), 'down')
  })
  it('子列表：不同區照區的順序，同一區照 nav 第二欄的順序', () => {
    assert.equal(pageMove('/categories/web', '/fcircle'), 'left')
    assert.equal(pageMove('/notes/topics', '/categories/web'), 'right')
    const childOrder = ['/posts', '/categories/life', '/categories/web', '/notes', '/notes/topics/a', '/notes/topics']
    assert.equal(pageMove('/categories/life', '/categories/web', { childOrder }), 'left')
    assert.equal(pageMove('/en/categories/web', '/en/categories/life', { childOrder }), 'right')
    assert.equal(pageMove('/notes/topics', '/notes/topics/a', { childOrder }), 'right')
    // 不在 nav 裡（例如收進「其他 N 類」的分類）：當成往前
    assert.equal(pageMove('/categories/web', '/categories/zzz', { childOrder }), 'left')
  })
  it('上一篇／下一篇：下一篇往左、上一篇往右', () => {
    assert.equal(pageMove('/posts/a', '/posts/b', { hint: 'next' }), 'left')
    assert.equal(pageMove('/posts/b', '/posts/a', { hint: 'prev' }), 'right')
    // 日記沒有提示時比流水號：比較新的是下一篇
    assert.equal(pageMove('/notes/12', '/notes/13'), 'left')
    assert.equal(pageMove('/ja/notes/13', '/ja/notes/12'), 'right')
    // 不同區的內頁照區的順序
    assert.equal(pageMove('/notes/3', '/posts/a'), 'right')
  })
  it('同一頁（篩選、分頁、切語系）與不認得的頁只淡入', () => {
    assert.equal(pageMove('/posts', '/posts/'), 'fade')
    assert.equal(pageMove('/posts', '/en/posts'), 'fade')
    assert.equal(pageMove('/posts', '/login'), 'fade')
  })
})
