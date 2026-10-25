// export * from "./auth";
// export {};

import {
  pgTable,
  varchar,
  boolean,
  integer,
  timestamp,
  primaryKey,
  index,
  text,
  uuid,
  pgEnum,
  jsonb,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

// 內容語系（DB 為單一來源；tan-blog 的 Paraglide 以 zh-Hant 對應 zh-TW）
export const SUPPORTED_LOCALES = ['zh-TW', 'en', 'ja'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'zh-TW'
export const localeEnum = pgEnum('locale', SUPPORTED_LOCALES)
// 譯文來源：人工 / AI
export const translationSourceEnum = pgEnum('translation_source', ['human', 'ai'])

// 分類表
export const categories = pgTable(
  'categories',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 100 }).notNull().unique(),
    slug: varchar('slug', { length: 100 }).notNull().unique(),
    description: text('description'),
    color: varchar('color', { length: 7 }), // 顏色代碼 #RRGGBB

    // 支援階層分類
    parentId: uuid('parent_id'),

    // 管理功能
    sortOrder: integer('sort_order').default(0).notNull(),
    postCount: integer('post_count').default(0).notNull(), // 文章數量統計

    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('categories_name_idx').on(table.name),
    index('categories_slug_idx').on(table.slug),
    index('categories_parent_idx').on(table.parentId),
    index('categories_sort_idx').on(table.sortOrder),
  ]
)

// 標籤表
export const tags = pgTable(
  'tags',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 50 }).notNull().unique(),
    slug: varchar('slug', { length: 50 }).notNull().unique(),
    description: text('description'),
    color: varchar('color', { length: 7 }), // 顏色代碼 #RRGGBB

    // 管理功能
    postCount: integer('post_count').default(0).notNull(), // 使用此標籤的文章數量統計

    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('tags_name_idx').on(table.name),
    index('tags_slug_idx').on(table.slug),
    index('tags_post_count_idx').on(table.postCount),
  ]
)

// 使用 PostgreSQL 原生 enum 型別定義文章狀態
export const postStatusEnum = pgEnum('post_status', [
  'draft',
  'published',
  'archived',
])

export const posts = pgTable(
  'posts',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    slug: varchar('slug', { length: 256 }).notNull().unique(),
    title: varchar('title', { length: 512 }).notNull(),
    summary: text('summary'), // 文章摘要
    content: text('content').notNull(), // MDX content

    // 作者關聯
    authorId: uuid('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // 分類關聯（每個文章只有一個分類）
    categoryId: uuid('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),

    // 媒體
    cover: text('cover'),

    // 文章狀態和發布設定（使用原生 enum 型別）
    status: postStatusEnum('status').notNull().default('draft'),

    // 發布時間設定
    // publishedAt removed: schedule handled by external scheduler/system

    // 統計數據
    viewCount: integer('view_count').default(0).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    commentCount: integer('comment_count').default(0).notNull(),

    // Publication controls
    copyright: boolean('copyright').default(true).notNull(),

    // Pin / sticky ordering
    pin: boolean('pin').default(false).notNull(),
    pinOrder: integer('pin_order').default(0).notNull(),

    // 設定選項
    // comments: boolean('comments').default(true).notNull(),
    // 允許留言
    allowComments: boolean('allow_comments').default(true).notNull(),

    // 原文語系（post_translations 中 isSource 的那筆）
    defaultLocale: localeEnum('default_locale').notNull().default('zh-TW'),

    // 時間戳
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('posts_slug_idx').on(table.slug),
    index('posts_author_idx').on(table.authorId),
    index('posts_category_idx').on(table.categoryId),
    index('posts_status_idx').on(table.status),
    index('posts_created_idx').on(table.createdAt),
    index('posts_pin_order_idx').on(table.pinOrder),
    index('posts_pin_idx').on(table.pin),
  ]
)

// 文章標籤關聯表（多對多）
export const postTags = pgTable(
  'post_tags',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('post_tags_post_idx').on(table.postId),
    index('post_tags_tag_idx').on(table.tagId),
    // 確保同一篇文章不能重複添加同一個標籤
    index('post_tags_unique_idx').on(table.postId, table.tagId),
  ]
)

// 專欄
export const topics = pgTable('topics', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: varchar('name', { length: 100 }).notNull().unique(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  introduce: varchar('introduce', { length: 100 }).notNull(), // 簡介：必填，最多 100 字符
  description: varchar('description', { length: 400 }), // 描述：可選，最多 400 字符，預設空字串
  color: varchar('color', { length: 7 }), // 顏色代碼 #RRGGBB
  noteCount: integer('note_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => [
  index('topics_slug_idx').on(table.slug),
])

// 日記
export const notes = pgTable('notes', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  title: varchar('title', { length: 256 }).notNull(),
  // 心情
  mood: varchar('mood', { length: 100 }).notNull(),
  // 天氣
  weather: varchar('weather', { length: 100 }).notNull(),
  // 標籤
  bookmark: boolean('bookmark').default(false).notNull(),
  // 經緯度
  coordinates: varchar('coordinates', { length: 100 }),
  // 位置
  location: varchar('location', { length: 256 }),
  status: boolean('status').default(false).notNull(), // true: published, false: draft
  // 內容
  content: text('content').notNull(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  // 綁定專欄ID 可以不一定要有對應專欄
  topicId: uuid('topic_id').references(() => topics.id, {
    onDelete: 'set null',
  }),
  // 原文語系（note_translations 中 isSource 的那筆）
  defaultLocale: localeEnum('default_locale').notNull().default('zh-TW'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
}, (table) => [
  // 日記幾乎都以 status 過濾、createdAt 排序，補上索引避免全表掃描
  index('notes_status_idx').on(table.status),
  index('notes_created_idx').on(table.createdAt),
  index('notes_status_created_idx').on(table.status, table.createdAt),
  index('notes_author_idx').on(table.authorId),
  index('notes_topic_idx').on(table.topicId),
])

// ─── 多語言內容 ─────────────────────────────────────────────────────────────
// 每篇文章 / 日記的每個語言版本一筆。isSource 那筆是原文（locale = 主表 defaultLocale）。
// - content：MDX 原文（source of truth）
// - compiled / toc / plainText / readingTime：@sao-blog/mdx 的編譯結果（compiled 為 { v, tree } hast JSON）
// - compiledHash：compiled 對應的 content sha256，不等於目前 content 的 hash 即需重編
// - sourceHash：翻譯當下原文 content 的 sha256（原文為自身 hash），與原文目前 hash 不同 → 譯文過期

export const postTranslations = pgTable(
  'post_translations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: varchar('title', { length: 512 }).notNull(),
    summary: text('summary'),
    content: text('content').notNull(),
    compiled: jsonb('compiled'),
    toc: jsonb('toc'),
    plainText: text('plain_text'),
    readingTime: integer('reading_time'),
    // 該語言版本是否發布；前台可見 = posts.status 與此欄皆為 published
    status: postStatusEnum('status').notNull().default('draft'),
    isSource: boolean('is_source').notNull().default(false),
    translatedBy: translationSourceEnum('translated_by').notNull().default('human'),
    sourceHash: varchar('source_hash', { length: 64 }),
    compiledHash: varchar('compiled_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('post_translations_post_locale_uidx').on(table.postId, table.locale),
    index('post_translations_locale_status_idx').on(table.locale, table.status),
  ]
)

export const noteTranslations = pgTable(
  'note_translations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    noteId: uuid('note_id')
      .notNull()
      .references(() => notes.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    title: varchar('title', { length: 256 }).notNull(),
    content: text('content').notNull(),
    compiled: jsonb('compiled'),
    toc: jsonb('toc'),
    plainText: text('plain_text'),
    readingTime: integer('reading_time'),
    // mood / weather 是固定選項值（UI 標籤由 Paraglide 翻譯），留在 notes 主表
    status: boolean('status').notNull().default(false), // true: published
    isSource: boolean('is_source').notNull().default(false),
    translatedBy: translationSourceEnum('translated_by').notNull().default('human'),
    sourceHash: varchar('source_hash', { length: 64 }),
    compiledHash: varchar('compiled_hash', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('note_translations_note_locale_uidx').on(table.noteId, table.locale),
    index('note_translations_locale_status_idx').on(table.locale, table.status),
  ]
)

// 分類名稱翻譯；categories.name 保留為原文名（後台顯示、unique 檢查），前台讀翻譯、fallback 到原文
export const categoryTranslations = pgTable(
  'category_translations',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    locale: localeEnum('locale').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex('category_translations_category_locale_uidx').on(table.categoryId, table.locale),
  ]
)

// 想法（隨手記錄當下的心情、碎碎念）
export const thinkings = pgTable(
  'thinkings',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // 想法內容（支援 markdown）
    content: text('content').notNull(),
    // 是否發表（false 為私密草稿，不顯示於前台）
    status: boolean('status').default(true).notNull(),
    // 可選：將此想法發表於某篇日記（/notes/xxx）
    noteId: uuid('note_id').references(() => notes.id, {
      onDelete: 'set null',
    }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('thinkings_created_at_idx').on(table.createdAt),
    index('thinkings_note_idx').on(table.noteId),
    index('thinkings_author_idx').on(table.authorId),
  ]
)

export const commentRefTypeEnum = pgEnum('comment_ref_type', ['post', 'note', 'page', 'recently'])
export const commentSourceEnum = pgEnum('comment_source', ['google', 'github', 'credential'])
// 審核狀態：待審 / 已通過 / 垃圾（過濾器或管理員判定）/ 已拒絕。公開頁面只顯示 approved
export const commentStatusEnum = pgEnum('comment_status', ['pending', 'approved', 'spam', 'rejected'])
// 封鎖清單類型：IP、Email、關鍵字（命中的留言直接標成垃圾）
export const commentBlockTypeEnum = pgEnum('comment_block_type', ['ip', 'email', 'keyword'])

export const comments = pgTable(
  'comments',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    refType: commentRefTypeEnum('ref_type').notNull(),
    refId: uuid('ref_id').notNull(), // 文章或日記的 ID
    displayUsername: varchar('display_username', { length: 100 }).notNull(),
    email: varchar('email', { length: 256 }).notNull(),
    website: varchar('website', { length: 512 }),
    content: text('content').notNull(),
    thread: uuid('thread'),
    likes: integer('likes').default(0).notNull(),
    dislikes: integer('dislikes').default(0).notNull(),
    deleted: boolean('deleted').default(false).notNull(),
    pin: boolean('pin').default(false).notNull(),
    source: commentSourceEnum('source').notNull(),
    // 若為已登入使用者，存放對應 user.id；訪客則為 null
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    ip: varchar('ip', { length: 45 }), // 支援 IPv6
    agent: varchar('agent', { length: 512 }),
    location: varchar('location', { length: 256 }), // 根據 IP 解析出的地理位置
    // 既有留言視為已通過，所以 default 是 approved；新留言由 API 依信任規則決定
    status: commentStatusEnum('status').default('approved').notNull(),
    // 自動判定的原因（link / keyword / duplicate / honeypot / blocked / new-user…），方便後台說明
    flagReason: varchar('flag_reason', { length: 64 }),
    moderatedAt: timestamp('moderated_at', { withTimezone: true }),
    moderatedBy: uuid('moderated_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('comments_status_idx').on(table.status),
    index('comments_ref_id_idx').on(table.refId),
    index('comments_thread_idx').on(table.thread),
    index('comments_created_at_idx').on(table.createdAt),
    index('comments_ref_created_idx').on(table.refId, table.createdAt),
    index('comments_user_idx').on(table.userId),
    index('comments_source_idx').on(table.source),
  ]
)

export const commentBlocklist = pgTable(
  'comment_blocklist',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    type: commentBlockTypeEnum('type').notNull(),
    // ip / email 存正規化（小寫、去空白）後的值；keyword 比對時不分大小寫
    value: varchar('value', { length: 512 }).notNull(),
    note: varchar('note', { length: 256 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [uniqueIndex('comment_blocklist_type_value_idx').on(table.type, table.value)]
)

// 後台可調整的設定（key → JSON）。目前只有 'security'：留言審核、內容過濾與限流規則，
// 讀取與預設值見 packages/db/src/settings.ts
export const appSettings = pgTable('app_settings', {
  key: varchar('key', { length: 64 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
})

export const commentLikes = pgTable(
  'comment_likes',
  {
    userId: varchar('user_id', { length: 256 }).notNull(),
    commentId: uuid('comment_id').notNull(),
    like: boolean('like').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.commentId] }),
    index('comment_idx').on(table.commentId),
  ]
)

// 文章按讚（一人一篇一次，再按取消）；posts.like_count 是它的計數快取
export const postLikes = pgTable(
  'post_likes',
  {
    userId: varchar('user_id', { length: 256 }).notNull(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.postId] }),
    index('post_likes_post_idx').on(table.postId),
  ]
)

export const user = pgTable('user', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text('role'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
})

export const session = pgTable('session', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  impersonatedBy: text('impersonated_by'),
})

export const account = pgTable('account', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
})

export const verification = pgTable('verification', {
  id: uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp('updated_at').$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
})

export const apikey = pgTable(
  'apikey',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text('name'),
    start: text('start'),
    prefix: text('prefix'),
    key: text('key').notNull(),
    // Better Auth api-key plugin：舊版 userId 已改為通用的 referenceId（可指向 user 或 organization）
    configId: text('config_id').default('default'),
    referenceId: uuid('reference_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    refillInterval: integer('refill_interval'),
    refillAmount: integer('refill_amount'),
    lastRefillAt: timestamp('last_refill_at'),
    enabled: boolean('enabled').default(true),
    rateLimitEnabled: boolean('rate_limit_enabled').default(true),
    rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
    rateLimitMax: integer('rate_limit_max').default(10),
    requestCount: integer('request_count'),
    remaining: integer('remaining'),
    lastRequest: timestamp('last_request'),
    expiresAt: timestamp('expires_at'),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
    permissions: text('permissions'),
    metadata: text('metadata'),
  },
  (table) => [index('apikey_reference_id_idx').on(table.referenceId)]
)

// Better Auth mcp plugin：OAuth 2.0 client（供 Claude 等 MCP client 透過 DCR 自行註冊）
export const oauthApplication = pgTable(
  'oauth_application',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: text('name'),
    icon: text('icon'),
    metadata: text('metadata'),
    clientId: text('client_id').unique(),
    clientSecret: text('client_secret'),
    redirectUrls: text('redirect_urls'),
    type: text('type'),
    disabled: boolean('disabled').default(false),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [index('oauth_application_user_id_idx').on(table.userId)]
)

// Better Auth mcp plugin：OAuth access/refresh token
export const oauthAccessToken = pgTable(
  'oauth_access_token',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    accessToken: text('access_token').unique(),
    refreshToken: text('refresh_token').unique(),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    clientId: text('client_id').references(() => oauthApplication.clientId, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
  },
  (table) => [
    index('oauth_access_token_client_id_idx').on(table.clientId),
    index('oauth_access_token_user_id_idx').on(table.userId),
  ]
)

// Better Auth mcp plugin：使用者對某個 OAuth client 的授權同意紀錄
export const oauthConsent = pgTable(
  'oauth_consent',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    clientId: text('client_id').references(() => oauthApplication.clientId, {
      onDelete: 'cascade',
    }),
    userId: uuid('user_id').references(() => user.id, { onDelete: 'cascade' }),
    scopes: text('scopes'),
    createdAt: timestamp('created_at'),
    updatedAt: timestamp('updated_at'),
    consentGiven: boolean('consent_given'),
  },
  (table) => [
    index('oauth_consent_client_id_idx').on(table.clientId),
    index('oauth_consent_user_id_idx').on(table.userId),
  ]
)

// 儲存空間設定（S3 相容，例如 RustFS / MinIO / R2）
export const storageConfigs = pgTable(
  'storage_configs',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 100 }).notNull(),
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    region: varchar('region', { length: 100 }).default('us-east-1').notNull(),
    bucket: varchar('bucket', { length: 200 }).notNull(),
    accessKeyId: varchar('access_key_id', { length: 500 }).notNull(),
    secretAccessKey: varchar('secret_access_key', { length: 500 }).notNull(),
    // 對外可存取的網址前綴，留空則 fallback 為 endpoint/bucket
    publicUrl: varchar('public_url', { length: 500 }),
    forcePathStyle: boolean('force_path_style').default(true).notNull(),
    isActive: boolean('is_active').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index('storage_configs_active_idx').on(table.isActive)]
)

// 上傳檔案的分類，決定儲存路徑前綴與檔案管理介面的分區
export const fileCategoryEnum = pgEnum('file_category', [
  'image',
  'document',
  'other',
])

// 已上傳的檔案（存於 S3 相容儲存空間）
export const files = pgTable(
  'files',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // 儲存空間內的完整路徑，例如 images/2026/07/<uuid>.png
    key: varchar('key', { length: 1000 }).notNull().unique(),
    filename: varchar('filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 200 }).notNull(),
    size: integer('size').notNull(),
    category: fileCategoryEnum('category').notNull(),
    // 上傳當下解析好的公開網址
    url: varchar('url', { length: 1500 }).notNull(),
    uploaderId: uuid('uploader_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('files_category_idx').on(table.category),
    index('files_created_at_idx').on(table.createdAt),
  ]
)

// Relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'categories_self',
  }),
  children: many(categories, {
    relationName: 'categories_self',
  }),
  posts: many(posts),
  translations: many(categoryTranslations),
}))

export const tagsRelations = relations(tags, ({ many }) => ({
  postTags: many(postTags),
}))

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(user, {
    fields: [posts.authorId],
    references: [user.id],
  }),
  category: one(categories, {
    fields: [posts.categoryId],
    references: [categories.id],
  }),
  postTags: many(postTags),
  translations: many(postTranslations),
}))

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}))

export const commentsRelations = relations(comments, ({ one, many }) => ({
  parent: one(comments, {
    fields: [comments.thread],
    references: [comments.id],
    relationName: 'comments_thread',
  }),
  replies: many(comments, {
    relationName: 'comments_thread',
  }),
  user: one(user, {
    fields: [comments.userId],
    references: [user.id],
  }),
}))

export const postTranslationsRelations = relations(postTranslations, ({ one }) => ({
  post: one(posts, {
    fields: [postTranslations.postId],
    references: [posts.id],
  }),
}))

export const notesRelations = relations(notes, ({ many }) => ({
  translations: many(noteTranslations),
}))

export const noteTranslationsRelations = relations(noteTranslations, ({ one }) => ({
  note: one(notes, {
    fields: [noteTranslations.noteId],
    references: [notes.id],
  }),
}))

export const categoryTranslationsRelations = relations(categoryTranslations, ({ one }) => ({
  category: one(categories, {
    fields: [categoryTranslations.categoryId],
    references: [categories.id],
  }),
}))

// 友鏈 / 朋友圈：同一張表，circle_enabled 決定是否抓 feed
export const friendStatusEnum = pgEnum('friend_status', ['pending', 'approved', 'rejected', 'hidden'])
export const friendFetchStatusEnum = pgEnum('friend_fetch_status', ['ok', 'error', 'not_modified'])
// manual = 後台改過，聚合器永不覆蓋
export const summarySourceEnum = pgEnum('summary_source', ['ai', 'feed', 'manual', 'none'])

export const friends = pgTable(
  'friends',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    name: varchar('name', { length: 100 }).notNull(),
    url: varchar('url', { length: 500 }).notNull().unique(), // 正規化後的首頁
    avatar: varchar('avatar', { length: 500 }),
    description: varchar('description', { length: 200 }),
    feedUrl: varchar('feed_url', { length: 500 }), // 空值時由 <link rel="alternate"> 自動發現
    email: varchar('email', { length: 255 }), // 不公開
    backlinkUrl: varchar('backlink_url', { length: 500 }), // 對方放置本站友鏈的頁面
    // 卡片主色 #rrggbb：對方首頁的 theme-color，沒有就取頭像主色（lib/friend-accent.ts）
    accentColor: varchar('accent_color', { length: 7 }),

    // 審核與顯示
    status: friendStatusEnum('status').default('pending').notNull(),
    circleEnabled: boolean('circle_enabled').default(true).notNull(),
    group: varchar('group', { length: 50 }).default('friend').notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    reviewNote: text('review_note'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => user.id, { onDelete: 'set null' }),

    // 防垃圾，不公開
    applyIp: varchar('apply_ip', { length: 45 }),
    applyUa: varchar('apply_ua', { length: 500 }),

    // 聚合器回寫
    fetchStatus: friendFetchStatusEnum('fetch_status'),
    fetchError: text('fetch_error'),
    failCount: integer('fail_count').default(0).notNull(),
    lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
    etag: varchar('etag', { length: 200 }),
    lastModified: varchar('last_modified', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('friends_status_idx').on(table.status),
    index('friends_group_sort_idx').on(table.group, table.sortOrder),
  ]
)

// 朋友圈文章，兼 AI 摘要快取（以 link 為鍵）
export const friendArticles = pgTable(
  'friend_articles',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    friendId: uuid('friend_id')
      .notNull()
      .references(() => friends.id, { onDelete: 'cascade' }),
    link: varchar('link', { length: 1000 }).notNull().unique(), // 正規化後（去 utm 等參數）
    title: varchar('title', { length: 300 }).notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }),
    summary: text('summary'), // 純文字
    summarySource: summarySourceEnum('summary_source').default('none').notNull(),
    summaryModel: varchar('summary_model', { length: 100 }),
    contentHash: varchar('content_hash', { length: 64 }),
    hidden: boolean('hidden').default(false).notNull(),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('friend_articles_friend_pub_idx').on(table.friendId, table.publishedAt),
    index('friend_articles_pub_idx').on(table.publishedAt),
  ]
)

export const friendsRelations = relations(friends, ({ many }) => ({
  articles: many(friendArticles),
}))

export const friendArticlesRelations = relations(friendArticles, ({ one }) => ({
  friend: one(friends, {
    fields: [friendArticles.friendId],
    references: [friends.id],
  }),
}))

// Convenience exported select-model types so other packages can import them directly
export type PostModel = InferSelectModel<typeof posts>
export type CategoryModel = InferSelectModel<typeof categories>
export type TagModel = InferSelectModel<typeof tags>
export type UserModel = InferSelectModel<typeof user>
export type StorageConfigModel = InferSelectModel<typeof storageConfigs>
export type FileModel = InferSelectModel<typeof files>
export type PostTranslationModel = InferSelectModel<typeof postTranslations>
export type NoteTranslationModel = InferSelectModel<typeof noteTranslations>
export type CategoryTranslationModel = InferSelectModel<typeof categoryTranslations>
export type FriendModel = InferSelectModel<typeof friends>
export type FriendArticleModel = InferSelectModel<typeof friendArticles>
