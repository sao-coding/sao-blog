import React, { useState } from "react";
import { MonacoEditor } from "@/components/monaco-editor";

export function MonacoEditorExample() {
  const [content, setContent] = useState(`# Markdown 編輯器範例

這是一個支援快捷鍵的 **Markdown** 編輯器。

## 支援的快捷鍵

- \`Ctrl/Cmd + S\`：儲存
- \`Ctrl/Cmd + B\`：**粗體**
- \`Ctrl/Cmd + I\`：*斜體*
- \`Ctrl/Cmd + K\`：[連結](https://example.com)
- \`Ctrl/Cmd + Shift + G\`：![圖片](image-url)

## 工具列功能

您也可以使用上方的工具列按鈕來快速插入格式。

試試選中一些文字，然後按 **Ctrl+B** 來加粗！
`);

  // Save functionality removed from toolbar; use external UI to save if needed

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Monaco Editor 範例</h2>
        <p className="text-muted-foreground">
          這個編輯器支援快捷鍵和工具列功能
        </p>
      </div>

      <MonacoEditor
        value={content}
        onChange={(value) => setContent(value || "")}
        language="markdown"
        height="500px"
        showToolbar={true}
        theme="vs-dark"
      />

      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">預覽</h3>
        <div className="border rounded p-4 bg-muted/50">
          <pre className="whitespace-pre-wrap text-sm">{content}</pre>
        </div>
      </div>
    </div>
  );
}
