// 產出 registry.schema.json：Web / React Native / Kotlin 各端實作 MDX 元件的共同規格
import { writeFileSync } from 'node:fs'
import { getRegistryJsonSchema } from '../src/registry'

const out = new URL('../registry.schema.json', import.meta.url)
writeFileSync(out, `${JSON.stringify(getRegistryJsonSchema(), null, 2)}\n`)
console.log(`wrote ${out.pathname}`)
