// utils/index.ts
import fs from "fs";
import path from "path";

export function calculateSomeHow(source: string): string {
  // 假設這裡是計算閱讀時間的邏輯
  const words = source.split(/\s+/).length;
  return `${Math.ceil(words / 200)}`; // 200字/分鐘
}

export async function getSourceSomeHow(): Promise<string> {
  // 取得專案根目錄
  const filePath = path.join(process.cwd(), "src/utils/test.md");
  console.log("Reading MDX source from:", filePath);
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (err) {
    return "讀取 test.md 失敗";
  }
}
