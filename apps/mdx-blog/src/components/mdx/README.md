# 可覆寫/擴充的 MDX 元件系統

這個 MDX 元件系統允許你在不同頁面中自由覆寫、禁用或添加 MDX 元件，提供極大的彈性。

## 核心概念

### 1. 預設 MDX 元件 (`defaultMDXComponents`)

系統提供一套預設的 MDX 元件，包含：

- 基本 HTML 元素的樣式化版本 (h1-h6, code 等)
- 自訂元件 (Count, Mermaid, Echarts)
- wrapper 元件

### 2. 深度合併策略

使用 `mergeMDXComponents()` 函式來合併預設元件與自訂覆寫：

- 覆寫現有元件
- 添加新元件
- 使用 `null` 或 `false` 禁用特定元件

## 使用方式

### 基本用法

```tsx
import { createMDXComponents } from '@/components/mdx'

// 使用預設元件
const components = createMDXComponents()

// 添加自訂元件
const customComponents = createMDXComponents({
  CustomQuote: ({ children }) => (
    <blockquote className="custom-style">{children}</blockquote>
  ),
})

// 禁用特定元件
const limitedComponents = createMDXComponents({
  Count: null, // 禁用 Count 元件
  Mermaid: false, // 同樣禁用 Mermaid
})
```

### 在頁面中使用

#### 在 evaluate() 階段配置

```tsx
import { evaluate } from 'next-mdx-remote-client/rsc'
import { createMergedComponents } from '@/components/mdx/mdx-renderer'
import { CustomQuote } from '@/components/mdx/renderers'

const pageComponents = createMergedComponents({
  CustomQuote,
  Count: null, // 禁用互動元件
})

const { content, error } = await evaluate({
  source,
  options: getMdxOptions(source),
  components: pageComponents,
})
```

#### 在 MdxRenderer 階段配置

```tsx
<MdxRenderer
  content={content}
  error={error}
  components={{
    Count: null, // 禁用 Count 元件
    CustomHighlight: ({ children }) => (
      <span className="bg-yellow-200 px-1">{children}</span>
    ),
  }}
/>
```

## 實際範例

### 日記頁面 - 禁用互動元件

```tsx
// src/app/(blog)/notes/[id]/page.tsx
const noteComponents = createMergedComponents({
  Count: null, // 日記不需要互動功能
})

const { content, error } = await evaluate({
  source,
  options: getBasicMdxOptions(source),
  components: noteComponents,
})
```

### 文章頁面 - 添加自訂元件

```tsx
// src/app/(blog)/posts/[slug]/page.tsx
import { CustomQuote } from '@/components/mdx/renderers'

const postComponents = createMergedComponents({
  CustomQuote,
  BlogHighlight: ({ children }) => (
    <span className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
      {children}
    </span>
  ),
})
```

## 建立自訂元件

### 1. 建立元件檔案

```tsx
// src/components/mdx/renderers/my-component.tsx
'use client'

export interface MyComponentProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
}

export const MyComponent = ({
  children,
  variant = 'primary',
}: MyComponentProps) => {
  const variantClasses = {
    primary: 'bg-blue-100 border-blue-500',
    secondary: 'bg-gray-100 border-gray-500',
  }

  return (
    <div className={`p-4 border-l-4 ${variantClasses[variant]}`}>
      {children}
    </div>
  )
}
```

### 2. 更新 renderers/index.tsx

```tsx
// src/components/mdx/renderers/index.tsx
export * from './my-component'
```

### 3. 在頁面中使用

```tsx
import { MyComponent } from '@/components/mdx/renderers'

const components = createMDXComponents({
  MyComponent,
})
```

## API 參考

### `createMDXComponents(overrides?)`

建立包含覆寫的 MDX 元件對象。

**參數:**

- `overrides?: MDXComponentOverrides` - 要覆寫或添加的元件

**回傳:**

- `MDXComponents` - 合併後的元件對象

### `mergeMDXComponents(baseComponents, overrides)`

深度合併兩個 MDX 元件對象。

**參數:**

- `baseComponents: MDXComponents` - 基礎元件
- `overrides: MDXComponentOverrides` - 覆寫元件

**回傳:**

- `MDXComponents` - 合併後的元件對象

### `createMergedComponents(overrides?)`

便利函式，直接合併預設元件與覆寫。

**參數:**

- `overrides?: MDXComponentOverrides` - 要覆寫或添加的元件

**回傳:**

- `MDXComponents` - 合併後的元件對象

## 型別定義

```tsx
type MDXComponentOverrides = {
  [K in keyof MDXComponents]?: MDXComponents[K] | null | false
}
```

- 使用 `null` 或 `false` 來禁用元件
- 使用有效的 React 元件來覆寫或添加元件

## 最佳實踐

1. **按頁面類型分組元件**: 為不同類型的頁面（文章、日記、文檔）建立專用的元件配置
2. **動態配置**: 根據 frontmatter 或其他條件動態禁用或啟用元件
3. **效能考量**: 只在需要時匯入自訂元件，避免不必要的 bundle 大小
4. **型別安全**: 使用 TypeScript 介面確保元件 props 的型別安全
5. **向後相容**: 保持預設配置的穩定，新功能通過覆寫添加

## 故障排除

### 元件沒有顯示

- 確認元件已正確匯入
- 檢查是否在覆寫中意外設為 `null`
- 驗證元件名稱拼寫正確

### TypeScript 錯誤

- 確保自訂元件有正確的型別定義
- 使用 `MDXComponentOverrides` 型別來獲得更好的型別檢查

### 樣式問題

- 確認使用了正確的 CSS 類別
- 檢查 dark mode 兼容性
- 驗證 prose 類別是否影響自訂元件
