"use client"

import { useModalStack } from '@/hooks/use-modal-stack'

export default function HomePage() {
  const { openDialog } = useModalStack()
  return (
    <main className="container mx-auto px-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">首頁</h1>
        <p className="text-lg text-muted-foreground text-center">
          歡迎來到我的網站！這裡展示了帶有動畫圖示的導航標題。
        </p>
        <button
          className="mt-6 px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark transition"
          onClick={() => openDialog({
            title: '測試對話框',
            description: '這是一個測試對話框，用於展示 useModalStack 的功能。',
            content: (
              <div>
                <p>這是對話框的內容。你可以在這裡放置任何你想要的內容。</p>
                <button
                  className="mt-4 px-3 py-1 bg-secondary text-white rounded hover:bg-secondary-dark transition"
                  onClick={() => openDialog({
                    title: '內部對話框',
                    description: '這是另一個對話框，從第一個對話框中打開。',
                    content: (
                      <div>
                        <p>你已經打開了第二個對話框！這證明了 useModalStack 可以處理多層對話框。</p>
                        <button
                          className="mt-4 px-3 py-1 bg-secondary text-white rounded hover:bg-secondary-dark transition"
                          onClick={() => openDialog({
                            title: '第三層對話框',
                            description: '這是第三層對話框，從第二個對話框中打開。',
                            content: (
                              <div>
                                <p>你已經打開了第三層對話框！這證明了 useModalStack 的堆疊功能。</p>
                              </div>
                            ),
                          })}
                        >
                          打開第三層對話框
                        </button>
                      </div>
                    ),
                  })}
                >
                  點擊我
                </button>
              </div>
            ),
          })}
        >
          打開對話框
        </button>
      </div>
    </main>
  );
}
