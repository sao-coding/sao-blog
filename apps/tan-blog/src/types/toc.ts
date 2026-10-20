export interface TocItem {
  value: string
  href?: string
  depth?: number
  numbering?: number[]
  parent?: string
  children?: TocItem[]
}
