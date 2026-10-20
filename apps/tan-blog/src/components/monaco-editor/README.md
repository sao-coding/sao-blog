# Monaco 編輯器元件

這是一個重構後的 Monaco 編輯器元件，包含工具列和快捷鍵功能，專為 Markdown 編輯設計。

## 元件結構

```
monaco-editor/
├── monaco-editor.tsx        # 主編輯器元件
├── monaco-toolbar.tsx       # 工具列元件
├── monaco-shortcuts.tsx     # 快捷鍵處理
├── monaco-text-helper.ts    # 文字處理工具類
├── monaco-editor-example.tsx # 使用範例
├── types.ts                 # 型別定義
└── index.ts                 # 統一導出
```

## 使用方式

### 基本使用

```tsx
import { MonacoEditor } from '@/components/monaco-editor'

function MyComponent() {
  const [content, setContent] = useState('')

  return (
    <MonacoEditor value={content} onChange={setContent} language="markdown" />
  )
}
```

### 自定義配置

```tsx
<MonacoEditor
  value={content}
  onChange={setContent}
  language="markdown"
  theme="vs-light"
  height="600px"
  showToolbar={true}
  options={{
    fontSize: 16,
    minimap: { enabled: false },
    wordWrap: 'on',
  }}
/>
```

## 支援的快捷鍵

| 快捷鍵                 | 功能     | 說明                                             |
| ---------------------- | -------- | ------------------------------------------------ |
| `Ctrl/Cmd + S`         | (未處理) | 建議由外部 UI 或作業系統處理，編輯器內部不再攔截 |
| `Ctrl/Cmd + B`         | 切換粗體 | 在選中文字周圍切換 `**`，已有粗體則移除          |
| `Ctrl/Cmd + I`         | 切換斜體 | 在選中文字周圍切換 `*`，已有斜體則移除           |
| `Ctrl/Cmd + K`         | 切換連結 | 切換 `[text](url)` 格式，已有連結則移除          |
| `Ctrl/Cmd + Shift + G` | 插入圖片 | 插入 `![alt](url)` 格式                          |

## 智能切換功能

編輯器支援智能格式切換：

- **粗體切換**：選中 `**文字**` 再按 `Ctrl+B` 會變成 `文字`
- **斜體切換**：選中 `*文字*` 再按 `Ctrl+I` 會變成 `文字`
- **連結切換**：選中 `[文字](url)` 再按 `Ctrl+K` 會變成 `文字`
- **圖片插入**：始終插入新的圖片標記

## 快捷鍵實現

快捷鍵使用 Monaco 編輯器的 `onKeyDown` 事件來處理，這樣可以確保：

- 正確的事件處理和清理
- 避免與瀏覽器默認快捷鍵衝突
- 支援 Windows (Ctrl) 和 macOS (Cmd) 兩種修飾鍵
- 智能檢測已有格式並進行切換

## 工具列功能

工具列提供視覺化的按鈕來執行相同的操作：

- **B** - 粗體格式
- **I** - 斜體格式
- **🔗** - 插入連結
- **🖼️** - 插入圖片
  -- **💾** - (已移除) 儲存按鈕已從工具列移除，請使用外部儲存介面或檔案系統操作

## API 參考

### MonacoEditorProps

```tsx
interface MonacoEditorProps {
  value: string // 編輯器內容
  onChange: (value: string | undefined) => void // 內容變更回調
  language?: string // 語言模式，預設 "markdown"
  theme?: string // 主題，預設 "vs-dark"
  height?: string // 高度，預設 "400px"
  options?: any // Monaco 編輯器選項
  onSave?: () => void // 儲存回調
  showToolbar?: boolean // 是否顯示工具列，預設 true
}
```

### MonacoTextHelper

文字處理工具類，提供以下方法：

- `applyBold()` - 應用粗體格式
- `applyItalic()` - 應用斜體格式
- `insertLink()` - 插入連結
- `insertImage()` - 插入圖片
- `getValue()` - 取得編輯器內容
- `setValue(value: string)` - 設置編輯器內容

## 自定義樣式

元件使用 Tailwind CSS 類別，您可以通過以下方式自定義樣式：

```tsx
// 自定義工具列樣式
<MonacoToolbar className="bg-blue-50 border-blue-200" />

// 自定義編輯器容器
<div className="custom-editor-container">
  <MonacoEditor {...props} />
</div>
```

## 擴展功能

### 添加新的快捷鍵

1. 在 `types.ts` 中定義新的動作
2. 在 `monaco-shortcuts.tsx` 中註冊快捷鍵
3. 在 `monaco-text-helper.ts` 中實現處理邏輯
4. 在工具列中添加對應按鈕

### 添加新的工具列按鈕

1. 在 `monaco-toolbar.tsx` 中添加新按鈕
2. 定義對應的回調函數
3. 在主編輯器元件中連接處理邏輯

## 注意事項

- 快捷鍵僅在編輯器有焦點時生效
- 工具列按鈕在編輯器未載入時會被禁用
- 所有文字操作都會保持編輯器的 undo/redo 歷史
- 支援選中文字的智能包裝和佔位符插入
