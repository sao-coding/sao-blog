/**
 * IP 歸屬地（MaxMind GeoLite2-City）
 *
 * - mmdb 不放進 repo、也不打包進映像：授權條款不允許轉發，而且要定期更新。
 * - 伺服器啟動時檢查 GEOIP_DB_PATH，沒有或超過 UPDATE_AFTER 就用 license key 下載最新版，
 *   之後每天檢查一次（MaxMind 每週二、五更新）。下載寫到暫存檔再 rename，避免讀到一半的檔案。
 * - GeoLite2 有 zh-CN 名稱但沒有繁中，用 OpenCC 轉成台灣用字；沒有中文名稱時退回英文。
 * - 沒設定 MAXMIND_ACCOUNT_ID / MAXMIND_LICENSE_KEY 時整個功能關閉，歸屬地一律為 null。
 *
 * @module lib/geoip
 */

import { mkdir, rename, stat, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { Reader, type CityResponse } from 'maxmind'
import * as OpenCC from 'opencc-js/cn2t'
import { env } from '@sao-blog/env/server'

const DOWNLOAD_URL = 'https://download.maxmind.com/geoip/databases/GeoLite2-City/download?suffix=tar.gz'
const UPDATE_AFTER_MS = 3 * 24 * 60 * 60 * 1000
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000

const toTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' })

let reader: Reader<CityResponse> | null = null
let loading: Promise<void> | null = null

const configured = () => Boolean(env.MAXMIND_ACCOUNT_ID && env.MAXMIND_LICENSE_KEY)

/** 從 tar 取出第一個 .mmdb（MaxMind 的壓縮檔裡是 GeoLite2-City_YYYYMMDD/GeoLite2-City.mmdb） */
function extractMmdb(tar: Buffer): Buffer | null {
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*$/, '')
    if (!name) break
    const size = parseInt(header.subarray(124, 136).toString('utf8').replace(/\0.*$/, '').trim() || '0', 8)
    const start = offset + 512
    if (name.endsWith('.mmdb')) return tar.subarray(start, start + size)
    offset = start + Math.ceil(size / 512) * 512
  }
  return null
}

async function download(): Promise<void> {
  const auth = Buffer.from(`${env.MAXMIND_ACCOUNT_ID}:${env.MAXMIND_LICENSE_KEY}`).toString('base64')
  // 會 302 轉到 R2 的預簽網址；fetch 跟隨轉址時會自動拿掉 Authorization
  const res = await fetch(DOWNLOAD_URL, { headers: { Authorization: `Basic ${auth}` }, signal: AbortSignal.timeout(120_000) })
  if (!res.ok) throw new Error(`GeoLite2 下載失敗：HTTP ${res.status}`)
  const mmdb = extractMmdb(gunzipSync(Buffer.from(await res.arrayBuffer())))
  if (!mmdb) throw new Error('GeoLite2 壓縮檔裡找不到 .mmdb')

  // 先驗證能被讀取，再取代舊檔
  const next = new Reader<CityResponse>(mmdb)
  await mkdir(dirname(env.GEOIP_DB_PATH), { recursive: true })
  const tmp = `${env.GEOIP_DB_PATH}.download`
  await writeFile(tmp, mmdb)
  await rename(tmp, env.GEOIP_DB_PATH)
  reader = next
  console.info(`[geoip] 已更新 GeoLite2-City（${(mmdb.length / 1024 / 1024).toFixed(1)} MB）`)
}

async function loadFromDisk(): Promise<number | null> {
  try {
    const info = await stat(env.GEOIP_DB_PATH)
    reader = new Reader<CityResponse>(Buffer.from(await Bun.file(env.GEOIP_DB_PATH).arrayBuffer()))
    return info.mtimeMs
  } catch {
    return null
  }
}

/** 載入本機檔，太舊或不存在就下載；失敗只記 log，不影響留言流程 */
async function refresh() {
  const mtime = reader ? null : await loadFromDisk()
  const age = mtime === null ? Infinity : Date.now() - mtime
  if (reader && mtime !== null && age < UPDATE_AFTER_MS) return
  try {
    if (!reader || age >= UPDATE_AFTER_MS) await download()
  } catch (error) {
    console.error('[geoip]', error instanceof Error ? error.message : error)
  }
}

let timer: ReturnType<typeof setInterval> | null = null

/** 伺服器啟動時呼叫一次；之後每天自動檢查更新 */
export function initGeoIp() {
  if (!configured() || loading) return
  loading = refresh()
  timer ??= setInterval(() => {
    // 定期檢查：比對檔案時間，超過 UPDATE_AFTER 才重新下載
    void stat(env.GEOIP_DB_PATH)
      .then((s) => (Date.now() - s.mtimeMs >= UPDATE_AFTER_MS ? download() : undefined))
      .catch(() => download())
      .catch((e) => console.error('[geoip]', e instanceof Error ? e.message : e))
  }, CHECK_INTERVAL_MS)
  timer.unref?.()
}

/** 內網 / 保留 / 回送位址：不需要查，也查不到 */
function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true
  if (/^(10|127)\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  if (/^169\.254\./.test(ip)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return true // CGNAT
  if (/^f[cd][0-9a-f]{2}:/i.test(ip) || /^fe80:/i.test(ip)) return true
  return false
}

type Names = { [locale: string]: string | undefined } | undefined

function displayName(names: Names): string | null {
  const zh = names?.['zh-CN']
  if (zh) return toTraditional(zh)
  return names?.en ?? null
}

/**
 * 查 IP 歸屬地，回傳「國家 省／州 城市」（相鄰重複會去掉，例如「新加坡 新加坡」→「新加坡」）。
 * 無法解析、內網、或 GeoLite2 未啟用時回傳 null。
 */
export async function resolveIpLocation(ip: string | null | undefined): Promise<string | null> {
  if (!ip || isPrivateIp(ip)) return null
  if (!reader) {
    initGeoIp()
    await loading
  }
  if (!reader) return null

  try {
    const result = reader.get(ip)
    if (!result) return null
    const parts = [
      displayName(result.country?.names as Names) ?? displayName(result.registered_country?.names as Names),
      displayName(result.subdivisions?.[0]?.names as Names),
      displayName(result.city?.names as Names),
    ].filter((p): p is string => Boolean(p))
    const dedup = parts.filter((p, i) => p !== parts[i - 1])
    return dedup.length ? dedup.join(' ') : null
  } catch {
    // 查詢失敗不應擋住留言
    return null
  }
}
