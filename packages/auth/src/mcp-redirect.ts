/**
 * MCP 動態註冊（/mcp/register）的 redirect_uri 白名單。
 *
 * better-auth 的 MCP plugin 開放任何人註冊 client、redirect_uri 填什麼都收，
 * 而且授權時不會顯示同意畫面（除非 client 自己帶 prompt=consent）。
 * 等於任何網站都能註冊一個指向自己的 client，再騙已登入的管理員點授權連結，
 * 授權碼就會直接送到對方手上、換成有管理員權限的 MCP token。
 * 限制只能註冊這些 redirect_uri，授權碼就只會送回已知的 AI 客戶端。
 *
 * - 遠端：必須是 https，且主機名稱完全符合 ALLOWED_HOSTS（要接其他 AI 工具就加在這裡）
 * - 本機：localhost / 127.0.0.1 / [::1] 任何 port（Claude Code、桌面版的本機 callback）
 */
const ALLOWED_HOSTS = new Set(["claude.ai", "claude.com", "chatgpt.com"]);
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function isAllowedMcpRedirect(uri: string): boolean {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (LOOPBACK_HOSTS.has(url.hostname)) {
    return url.protocol === "http:" || url.protocol === "https:";
  }
  return url.protocol === "https:" && ALLOWED_HOSTS.has(url.hostname.toLowerCase());
}
