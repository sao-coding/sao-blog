/**
 * IP 地理位置解析
 *
 * 使用 ip2region（離線 xdb 資料庫，與 Artalk / Twikoo / Waline 同方案）。
 * 整個 xdb 載入記憶體後查詢，單次查詢約 10 微秒等級，無外網依賴、無速率限制。
 *
 * @module lib/ip-region
 */

import { isValidIp, newWithBuffer } from 'ip2region-ts'
// 以 import attribute 內嵌 xdb：
// - 開發 / `bun run`：解析為磁碟上的真實路徑
// - `bun build --compile`（Docker 部署）：xdb 會被內嵌進單一執行檔
// 若改用套件的 defaultDbFile（指向 node_modules），distroless 映像沒有 node_modules 會讀不到。
// 必須用 Bun.file() 讀取，fs.readFileSync 無法讀取編譯後的內嵌虛擬路徑。
// @ts-ignore -- 資產匯入無對應型別宣告；執行期由 Bun 解析為檔案路徑字串
import xdbFile from 'ip2region-ts/data/ip2region.xdb' with { type: 'file' }

// 整個 xdb 載入記憶體的 singleton searcher（lazy 初始化，避免啟動時阻塞）
let searcherPromise: Promise<ReturnType<typeof newWithBuffer>> | null = null

function getSearcher() {
  if (!searcherPromise) {
    searcherPromise = (async () => {
      const bytes = await Bun.file(xdbFile).arrayBuffer()
      return newWithBuffer(Buffer.from(bytes))
    })()
  }
  return searcherPromise
}

/**
 * 判斷是否為內網 / 保留 / 回送位址（不需查詢、也查不到歸屬地）
 */
function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return true
  // 私有 IPv4 區段
  if (/^10\./.test(ip)) return true
  if (/^192\.168\./.test(ip)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return true
  if (/^169\.254\./.test(ip)) return true // link-local
  // 唯一本地 IPv6
  if (/^f[cd][0-9a-f]{2}:/i.test(ip)) return true
  return false
}

/**
 * 將 ip2region 的 region 字串格式化為可顯示的歸屬地
 *
 * region 格式為「國家|區域|省份|城市|ISP」，未知欄位為 "0"。
 * - 中國：顯示「省份 城市」
 * - 其他國家：顯示「國家」
 *
 * @example "中国|0|广东省|深圳市|电信" -> "广东省 深圳市"
 * @example "美国|0|0|0|0" -> "美国"
 */
function formatRegion(region: string | null): string | null {
  if (!region) return null
  const segments = region.split('|')
  const country = segments[0]
  const province = segments[2]
  const city = segments[3]

  // ip2region 對內網會回傳 "内网IP" 之類，視為無歸屬地
  if (region.includes('内网') || region.includes('保留')) return null

  const meaningful = [country, province, city].filter(
    (part) => part && part !== '0'
  )
  if (meaningful.length === 0) return null

  // 國內：省 + 市較有意義；國外：通常只有國家
  if (country === '中国') {
    const local = [province, city].filter((p) => p && p !== '0')
    if (local.length > 0) {
      // 去除相鄰重複（直轄市常出現省市同名）
      const dedup = local.filter((p, i) => p !== local[i - 1])
      return dedup.join(' ')
    }
    return country
  }

  // 國外或無法判斷：去重後組合
  const dedup = meaningful.filter((p, i) => p !== meaningful[i - 1])
  return dedup.join(' ')
}

/**
 * 解析 IP 對應的地理位置
 *
 * @param ip - 來源 IP（IPv4 / IPv6）
 * @returns 歸屬地字串，無法解析或為內網時回傳 null
 */
export async function resolveIpLocation(
  ip: string | null | undefined
): Promise<string | null> {
  if (!ip) return null
  if (isPrivateIp(ip)) return null
  if (!isValidIp(ip)) return null

  try {
    const searcher = await getSearcher()
    const result = await searcher.search(ip)
    return formatRegion(result.region)
  } catch {
    // 查詢失敗不應阻擋留言流程
    return null
  }
}
