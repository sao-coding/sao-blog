// AI 摘要（預留，尚未實作）。
//
// 之後要做時只需要改這個檔：
// - 依環境變數（例如 FC_AI_API_KEY、FC_AI_MODEL）建立 summarizer；沒設定就回傳 null，整個步驟略過
// - 只處理 needsSummary 為 true 的文章（新文章，或內容雜湊變了），單次最多 FC_AI_MAX 篇
// - 成功時把 article.summary 換成 AI 結果、summarySource 設 'ai'、summaryModel 設模型名稱；
//   失敗就保留 feed 摘要，下次再試
// 後端 ingest 已經支援 'ai' 來源，也會保留手動編輯過的摘要，不需要再改 API。

export interface SummaryTarget {
  title: string
  /** 去掉 HTML 的內文 */
  text: string
  /** 沒有可沿用的 AI / 手動摘要（新文章或內容改過） */
  needsSummary: boolean
  summary: string | null
  summarySource: 'ai' | 'feed' | 'none'
  summaryModel: string | null
}

/** 目前不做任何事；回傳實際呼叫 AI 的篇數 */
export async function applyAiSummaries(_targets: SummaryTarget[]): Promise<number> {
  return 0
}
