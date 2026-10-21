import React from 'react'

/**
 * 容器元件（Tabs、Accordion、Carousel、Steps、Benchmark）用來取子項目的 children。
 *
 * MDX 會把寫在同一行的子元件當成行內元素、包進一個 <p>：
 *   <Tab label="npm">npm install</Tab>        → <p><Tab …/></p>
 *   <Slide>![圖](/a.jpg)</Slide>              → <p><Slide …/></p>
 * 直接 filter 子元件就會整個漏掉。這裡先把只是包裝用的 <p> 攤平，再交給各元件辨識。
 */
export function flattenItems(children: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(children).flatMap((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === 'p'
      ? React.Children.toArray(child.props.children)
      : [child]
  )
}
