import { env } from '@sao-blog/env/server'

/**
 * 取得用戶端真實 IP。
 *
 * 原則：只信任「最外層代理」寫入的標頭（CLIENT_IP_HEADER）。
 * - cf-connecting-ip / x-real-ip 這類單值標頭：代理會直接覆寫，取那個值。
 * - x-forwarded-for：用戶端可以自己帶這個標頭，代理只會在「後面」追加，
 *   所以要從右往左看，略過 TRUSTED_PROXIES 裡的代理，取第一個不是代理的位址。
 *   （舊版取最左邊那個，等於讓用戶端自己決定 IP。）
 * 沒有標頭時退回 socket 位址。
 *
 * 前提：API 連接埠不能讓外部直接連到，否則任何標頭都能偽造。
 */
export function getClientIp(headers: Headers, socketIp?: string | null): string | null {
  const header = env.CLIENT_IP_HEADER.toLowerCase()
  const raw = headers.get(header)

  if (raw) {
    if (header === 'x-forwarded-for') {
      const chain = raw.split(',').map(normalize).filter(Boolean)
      for (let i = chain.length - 1; i >= 0; i--) {
        const hop = chain[i]!
        if (!isTrustedProxy(hop)) return hop
      }
      // 整條都是代理（或只有一個值且是代理）：最左邊就是用戶端
      if (chain[0]) return chain[0]
    } else {
      const ip = normalize(raw.split(',')[0] ?? '')
      if (ip) return ip
    }
  }

  return socketIp ? normalize(socketIp) : null
}

// 剝除 IPv4-mapped IPv6 前綴，例如 ::ffff:127.0.0.1 -> 127.0.0.1
const normalize = (ip: string) => ip.trim().replace(/^::ffff:/i, '')

function isTrustedProxy(ip: string): boolean {
  return env.TRUSTED_PROXIES.some((entry) => (entry.includes('/') ? inCidr(ip, entry) : entry === ip))
}

/** 只支援 IPv4 CIDR；IPv6 代理請寫完整位址 */
function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/')
  const bits = Number(bitsStr)
  const a = ipv4ToInt(ip)
  const b = range ? ipv4ToInt(range) : null
  if (a === null || b === null || !Number.isInteger(bits) || bits < 0 || bits > 32) return false
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0
  return (a & mask) === (b & mask)
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const v = Number(p)
    if (!/^\d{1,3}$/.test(p) || v > 255) return null
    n = n * 256 + v
  }
  return n >>> 0
}
