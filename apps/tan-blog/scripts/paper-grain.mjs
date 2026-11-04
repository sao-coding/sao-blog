// 紙的細顆粒：128px 無縫拼貼的 PNG，只有 alpha（RGB 全黑）。
// 網站用它當 mask，顏色由 CSS token 決定（見 styles.css 的 body::after）。
// 產生 public/paper-grain.png：node scripts/paper-grain.mjs public/paper-grain.png（固定種子，每次產出一樣）
import fs from 'node:fs'
import zlib from 'node:zlib'

const W = 128
let seed = 20261104
const rnd = () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// 兩層疊加：逐點亂數（細砂）＋ 2px 見方的亂數（略粗的纖維團）；取模運算讓邊界無縫
const fine = Float32Array.from({ length: W * W }, rnd)
const coarse = Float32Array.from({ length: (W / 2) * (W / 2) }, rnd)
const alpha = Buffer.alloc(W * W)
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const f = fine[y * W + x]
    const c = coarse[(y >> 1) * (W / 2) + (x >> 1)]
    // 偏向稀疏：多數點很淡、少數點較深，才像紙漿裡的顆粒而不是電視雜訊
    const v = Math.pow(f * 0.65 + c * 0.35, 2.2)
    alpha[y * W + x] = Math.round(Math.min(1, v * 1.6) * 255)
  }
}

// 手寫 PNG（灰階＋alpha，8bit），免依賴
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const c = Buffer.alloc(4)
  c.writeUInt32BE(crc(td))
  return Buffer.concat([len, td, c])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(W, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 4 // grayscale + alpha
const raw = Buffer.alloc((W * 2 + 1) * W)
for (let y = 0; y < W; y++) {
  const o = y * (W * 2 + 1)
  raw[o] = 0
  for (let x = 0; x < W; x++) {
    raw[o + 1 + x * 2] = 0
    raw[o + 2 + x * 2] = alpha[y * W + x]
  }
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
const out = process.argv[2]
if (!out) throw new Error('usage: node scripts/paper-grain.mjs <out.png>')
fs.writeFileSync(out, png)
console.log(`${out}: ${png.length} bytes`)
