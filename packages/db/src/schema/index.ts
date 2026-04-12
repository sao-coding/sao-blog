// export * from "./auth";
// export {};

import {
  pgTable,
  varchar,
  boolean,
  integer,
  serial,
  json,
  timestamp,
  primaryKey,
  index,
  text,
  uuid,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

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
})

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
  createdAt: timestamp('created_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
})

export const commentRefTypeEnum = pgEnum('comment_ref_type', ['post', 'note', 'page', 'recently'])
export const commentSourceEnum = pgEnum('comment_source', ['guest', 'google', 'github'])

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
    // 留言來源：對應 account.providerId（例如 'guest', 'local', 'google', 'facebook'）
    source: commentSourceEnum('source').notNull().default('guest'),
    // 若為已登入使用者，存放對應 user.id；訪客則為 null
    userId: uuid('user_id').references(() => user.id, { onDelete: 'set null' }),
    ip: varchar('ip', { length: 45 }), // 支援 IPv6
    agent: varchar('agent', { length: 512 }),
    location: varchar('location', { length: 256 }), // 根據 IP 解析出的地理位置
    createdAt: timestamp('created_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    index('comments_ref_id_idx').on(table.refId),
    index('comments_thread_idx').on(table.thread),
    index('comments_created_at_idx').on(table.createdAt),
    index('comments_ref_created_idx').on(table.refId, table.createdAt),
    index('comments_user_idx').on(table.userId),
    index('comments_source_idx').on(table.source),
  ]
)

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

export const apikey = pgTable('apikey', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => uuidv7()),
  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  userId: uuid('user_id')
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
})

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

// Convenience exported select-model types so other packages can import them directly
export type PostModel = InferSelectModel<typeof posts>
export type CategoryModel = InferSelectModel<typeof categories>
export type TagModel = InferSelectModel<typeof tags>
export type UserModel = InferSelectModel<typeof user>