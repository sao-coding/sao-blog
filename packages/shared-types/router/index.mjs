import { ORPCError, os } from "@orpc/server";
import "dotenv/config";
import z$1, { z } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, gt, inArray, lt, relations } from "drizzle-orm";
import { randomFillSync } from "node:crypto";

//#region rolldown:runtime
var __defProp = Object.defineProperty;
var __export = (all, symbols) => {
	let target = {};
	for (var name in all) {
		__defProp(target, name, {
			get: all[name],
			enumerable: true
		});
	}
	if (symbols) {
		__defProp(target, Symbol.toStringTag, { value: "Module" });
	}
	return target;
};

//#endregion
//#region src/orpc/index.ts
const o = os.$context();
const publicProcedure = o;
const requireAuth = o.middleware(async ({ context, next }) => {
	if (!context.session?.user) throw new ORPCError("UNAUTHORIZED");
	return next({ context: { session: context.session } });
});
const protectedProcedure = publicProcedure.use(requireAuth);

//#endregion
//#region ../../node_modules/.pnpm/@t3-oss+env-core@0.13.10_typescript@5.9.3_zod@4.3.6/node_modules/@t3-oss/env-core/dist/standard.js
function ensureSynchronous(value, message) {
	if (value instanceof Promise) throw new Error(message);
}
function parseWithDictionary(dictionary, value) {
	const result = {};
	const issues = [];
	for (const key in dictionary) {
		const propResult = dictionary[key]["~standard"].validate(value[key]);
		ensureSynchronous(propResult, `Validation must be synchronous, but ${key} returned a Promise.`);
		if (propResult.issues) {
			issues.push(...propResult.issues.map((issue) => ({
				...issue,
				message: issue.message,
				path: [key, ...issue.path ?? []]
			})));
			continue;
		}
		result[key] = propResult.value;
	}
	if (issues.length) return { issues };
	return { value: result };
}

//#endregion
//#region ../../node_modules/.pnpm/@t3-oss+env-core@0.13.10_typescript@5.9.3_zod@4.3.6/node_modules/@t3-oss/env-core/dist/index.js
/**
* Create a new environment variable schema.
*/
function createEnv(opts) {
	const runtimeEnv = opts.runtimeEnvStrict ?? opts.runtimeEnv ?? process.env;
	if (opts.emptyStringAsUndefined ?? false) {
		for (const [key, value] of Object.entries(runtimeEnv)) if (value === "") delete runtimeEnv[key];
	}
	if (!!opts.skipValidation) {
		if (opts.extends) for (const preset of opts.extends) preset.skipValidation = true;
		return runtimeEnv;
	}
	const _client = typeof opts.client === "object" ? opts.client : {};
	const _server = typeof opts.server === "object" ? opts.server : {};
	const _shared = typeof opts.shared === "object" ? opts.shared : {};
	const isServer = opts.isServer ?? (typeof window === "undefined" || "Deno" in window);
	const finalSchemaShape = isServer ? {
		..._server,
		..._shared,
		..._client
	} : {
		..._client,
		..._shared
	};
	const parsed = (opts.createFinalSchema?.(finalSchemaShape, isServer))?.["~standard"].validate(runtimeEnv) ?? parseWithDictionary(finalSchemaShape, runtimeEnv);
	ensureSynchronous(parsed, "Validation must be synchronous");
	const onValidationError = opts.onValidationError ?? ((issues) => {
		console.error("❌ Invalid environment variables:", issues);
		throw new Error("Invalid environment variables");
	});
	const onInvalidAccess = opts.onInvalidAccess ?? (() => {
		throw new Error("❌ Attempted to access a server-side environment variable on the client");
	});
	if (parsed.issues) return onValidationError(parsed.issues);
	const isServerAccess = (prop) => {
		if (!opts.clientPrefix) return true;
		return !prop.startsWith(opts.clientPrefix) && !(prop in _shared);
	};
	const isValidServerAccess = (prop) => {
		return isServer || !isServerAccess(prop);
	};
	const ignoreProp = (prop) => {
		return prop === "__esModule" || prop === "$$typeof";
	};
	const extendedObj = (opts.extends ?? []).reduce((acc, curr) => {
		return Object.assign(acc, curr);
	}, {});
	const fullObj = Object.assign(extendedObj, parsed.value);
	return new Proxy(fullObj, { get(target, prop) {
		if (typeof prop !== "string") return void 0;
		if (ignoreProp(prop)) return void 0;
		if (!isValidServerAccess(prop)) return onInvalidAccess(prop);
		return Reflect.get(target, prop);
	} });
}

//#endregion
//#region ../../packages/env/src/server.ts
const env = createEnv({
	server: {
		DATABASE_URL: z.string().min(1),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url(),
		GITHUB_CLIENT_ID: z.string().min(1),
		GITHUB_CLIENT_SECRET: z.string().min(1),
		CORS_ORIGIN: z.url(),
		NODE_ENV: z.enum([
			"development",
			"production",
			"test"
		]).default("development")
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true
});

//#endregion
//#region ../../node_modules/.pnpm/uuid@13.0.0/node_modules/uuid/dist-node/stringify.js
const byteToHex = [];
for (let i = 0; i < 256; ++i) byteToHex.push((i + 256).toString(16).slice(1));
function unsafeStringify(arr, offset = 0) {
	return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}

//#endregion
//#region ../../node_modules/.pnpm/uuid@13.0.0/node_modules/uuid/dist-node/rng.js
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
	if (poolPtr > rnds8Pool.length - 16) {
		randomFillSync(rnds8Pool);
		poolPtr = 0;
	}
	return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

//#endregion
//#region ../../node_modules/.pnpm/uuid@13.0.0/node_modules/uuid/dist-node/v7.js
const _state = {};
function v7(options, buf, offset) {
	let bytes;
	if (options) bytes = v7Bytes(options.random ?? options.rng?.() ?? rng(), options.msecs, options.seq, buf, offset);
	else {
		const now = Date.now();
		const rnds = rng();
		updateV7State(_state, now, rnds);
		bytes = v7Bytes(rnds, _state.msecs, _state.seq, buf, offset);
	}
	return buf ?? unsafeStringify(bytes);
}
function updateV7State(state, now, rnds) {
	state.msecs ??= -Infinity;
	state.seq ??= 0;
	if (now > state.msecs) {
		state.seq = rnds[6] << 23 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
		state.msecs = now;
	} else {
		state.seq = state.seq + 1 | 0;
		if (state.seq === 0) state.msecs++;
	}
	return state;
}
function v7Bytes(rnds, msecs, seq, buf, offset = 0) {
	if (rnds.length < 16) throw new Error("Random bytes length must be >= 16");
	if (!buf) {
		buf = new Uint8Array(16);
		offset = 0;
	} else if (offset < 0 || offset + 16 > buf.length) throw new RangeError(`UUID byte range ${offset}:${offset + 15} is out of buffer bounds`);
	msecs ??= Date.now();
	seq ??= rnds[6] * 127 << 24 | rnds[7] << 16 | rnds[8] << 8 | rnds[9];
	buf[offset++] = msecs / 1099511627776 & 255;
	buf[offset++] = msecs / 4294967296 & 255;
	buf[offset++] = msecs / 16777216 & 255;
	buf[offset++] = msecs / 65536 & 255;
	buf[offset++] = msecs / 256 & 255;
	buf[offset++] = msecs & 255;
	buf[offset++] = 112 | seq >>> 28 & 15;
	buf[offset++] = seq >>> 20 & 255;
	buf[offset++] = 128 | seq >>> 14 & 63;
	buf[offset++] = seq >>> 6 & 255;
	buf[offset++] = seq << 2 & 255 | rnds[10] & 3;
	buf[offset++] = rnds[11];
	buf[offset++] = rnds[12];
	buf[offset++] = rnds[13];
	buf[offset++] = rnds[14];
	buf[offset++] = rnds[15];
	return buf;
}
var v7_default = v7;

//#endregion
//#region ../../packages/db/src/schema/index.ts
var schema_exports = /* @__PURE__ */ __export({
	account: () => account,
	apikey: () => apikey,
	categories: () => categories,
	categoriesRelations: () => categoriesRelations,
	commentLikes: () => commentLikes,
	commentRefTypeEnum: () => commentRefTypeEnum,
	commentSourceEnum: () => commentSourceEnum,
	comments: () => comments,
	commentsRelations: () => commentsRelations,
	notes: () => notes,
	postStatusEnum: () => postStatusEnum,
	postTags: () => postTags,
	postTagsRelations: () => postTagsRelations,
	posts: () => posts,
	postsRelations: () => postsRelations,
	session: () => session,
	tags: () => tags,
	tagsRelations: () => tagsRelations,
	topics: () => topics,
	user: () => user,
	verification: () => verification
});
const categories = pgTable("categories", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	name: varchar("name", { length: 100 }).notNull().unique(),
	slug: varchar("slug", { length: 100 }).notNull().unique(),
	description: text("description"),
	color: varchar("color", { length: 7 }),
	parentId: uuid("parent_id"),
	sortOrder: integer("sort_order").default(0).notNull(),
	postCount: integer("post_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [
	index("categories_name_idx").on(table.name),
	index("categories_slug_idx").on(table.slug),
	index("categories_parent_idx").on(table.parentId),
	index("categories_sort_idx").on(table.sortOrder)
]);
const tags = pgTable("tags", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	name: varchar("name", { length: 50 }).notNull().unique(),
	slug: varchar("slug", { length: 50 }).notNull().unique(),
	description: text("description"),
	color: varchar("color", { length: 7 }),
	postCount: integer("post_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [
	index("tags_name_idx").on(table.name),
	index("tags_slug_idx").on(table.slug),
	index("tags_post_count_idx").on(table.postCount)
]);
const postStatusEnum = pgEnum("post_status", [
	"draft",
	"published",
	"archived"
]);
const posts = pgTable("posts", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	slug: varchar("slug", { length: 256 }).notNull().unique(),
	title: varchar("title", { length: 512 }).notNull(),
	summary: text("summary"),
	content: text("content").notNull(),
	authorId: uuid("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
	cover: text("cover"),
	status: postStatusEnum("status").notNull().default("draft"),
	viewCount: integer("view_count").default(0).notNull(),
	likeCount: integer("like_count").default(0).notNull(),
	commentCount: integer("comment_count").default(0).notNull(),
	copyright: boolean("copyright").default(true).notNull(),
	pin: boolean("pin").default(false).notNull(),
	pinOrder: integer("pin_order").default(0).notNull(),
	allowComments: boolean("allow_comments").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [
	index("posts_slug_idx").on(table.slug),
	index("posts_author_idx").on(table.authorId),
	index("posts_category_idx").on(table.categoryId),
	index("posts_status_idx").on(table.status),
	index("posts_created_idx").on(table.createdAt),
	index("posts_pin_order_idx").on(table.pinOrder),
	index("posts_pin_idx").on(table.pin)
]);
const postTags = pgTable("post_tags", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
	tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [
	index("post_tags_post_idx").on(table.postId),
	index("post_tags_tag_idx").on(table.tagId),
	index("post_tags_unique_idx").on(table.postId, table.tagId)
]);
const topics = pgTable("topics", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	name: varchar("name", { length: 100 }).notNull().unique(),
	slug: varchar("slug", { length: 100 }).notNull().unique(),
	introduce: varchar("introduce", { length: 100 }).notNull(),
	description: varchar("description", { length: 400 }).default("").notNull(),
	color: varchar("color", { length: 7 }),
	noteCount: integer("note_count").default(0).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});
const notes = pgTable("notes", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	title: varchar("title", { length: 256 }).notNull(),
	mood: varchar("mood", { length: 100 }).notNull(),
	weather: varchar("weather", { length: 100 }).notNull(),
	bookmark: boolean("bookmark").default(false).notNull(),
	coordinates: varchar("coordinates", { length: 100 }),
	location: varchar("location", { length: 256 }),
	status: boolean("status").default(false).notNull(),
	content: text("content").notNull(),
	authorId: uuid("author_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	topicId: uuid("topic_id").references(() => topics.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
});
const commentRefTypeEnum = pgEnum("comment_ref_type", [
	"post",
	"note",
	"page",
	"recently"
]);
const commentSourceEnum = pgEnum("comment_source", [
	"guest",
	"google",
	"github"
]);
const comments = pgTable("comments", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	refType: commentRefTypeEnum("ref_type").notNull(),
	refId: uuid("ref_id").notNull(),
	displayUsername: varchar("display_username", { length: 100 }).notNull(),
	email: varchar("email", { length: 256 }).notNull(),
	website: varchar("website", { length: 512 }),
	content: text("content").notNull(),
	thread: uuid("thread"),
	likes: integer("likes").default(0).notNull(),
	dislikes: integer("dislikes").default(0).notNull(),
	deleted: boolean("deleted").default(false).notNull(),
	pin: boolean("pin").default(false).notNull(),
	source: commentSourceEnum("source").notNull().default("guest"),
	userId: uuid("user_id").references(() => user.id, { onDelete: "set null" }),
	ip: varchar("ip", { length: 45 }),
	agent: varchar("agent", { length: 512 }),
	location: varchar("location", { length: 256 }),
	createdAt: timestamp("created_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true }).$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
}, (table) => [
	index("comments_ref_id_idx").on(table.refId),
	index("comments_thread_idx").on(table.thread),
	index("comments_created_at_idx").on(table.createdAt),
	index("comments_ref_created_idx").on(table.refId, table.createdAt),
	index("comments_user_idx").on(table.userId),
	index("comments_source_idx").on(table.source)
]);
const commentLikes = pgTable("comment_likes", {
	userId: varchar("user_id", { length: 256 }).notNull(),
	commentId: uuid("comment_id").notNull(),
	like: boolean("like").notNull()
}, (table) => [primaryKey({ columns: [table.userId, table.commentId] }), index("comment_idx").on(table.commentId)]);
const user = pgTable("user", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	username: text("username").unique(),
	displayUsername: text("display_username"),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").$defaultFn(() => false).notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
	role: text("role"),
	banned: boolean("banned"),
	banReason: text("ban_reason"),
	banExpires: timestamp("ban_expires")
});
const session = pgTable("session", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	impersonatedBy: text("impersonated_by")
});
const account = pgTable("account", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull()
});
const verification = pgTable("verification", {
	id: uuid("id").primaryKey().$defaultFn(() => v7_default()),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at").$defaultFn(() => /* @__PURE__ */ new Date()),
	updatedAt: timestamp("updated_at").$defaultFn(() => /* @__PURE__ */ new Date())
});
const apikey = pgTable("apikey", {
	id: text("id").primaryKey().$defaultFn(() => v7_default()),
	name: text("name"),
	start: text("start"),
	prefix: text("prefix"),
	key: text("key").notNull(),
	userId: uuid("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
	refillInterval: integer("refill_interval"),
	refillAmount: integer("refill_amount"),
	lastRefillAt: timestamp("last_refill_at"),
	enabled: boolean("enabled").default(true),
	rateLimitEnabled: boolean("rate_limit_enabled").default(true),
	rateLimitTimeWindow: integer("rate_limit_time_window").default(864e5),
	rateLimitMax: integer("rate_limit_max").default(10),
	requestCount: integer("request_count"),
	remaining: integer("remaining"),
	lastRequest: timestamp("last_request"),
	expiresAt: timestamp("expires_at"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	permissions: text("permissions"),
	metadata: text("metadata")
});
const categoriesRelations = relations(categories, ({ one, many }) => ({
	parent: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: "categories_self"
	}),
	children: many(categories, { relationName: "categories_self" }),
	posts: many(posts)
}));
const tagsRelations = relations(tags, ({ many }) => ({ postTags: many(postTags) }));
const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(user, {
		fields: [posts.authorId],
		references: [user.id]
	}),
	category: one(categories, {
		fields: [posts.categoryId],
		references: [categories.id]
	}),
	postTags: many(postTags)
}));
const postTagsRelations = relations(postTags, ({ one }) => ({
	post: one(posts, {
		fields: [postTags.postId],
		references: [posts.id]
	}),
	tag: one(tags, {
		fields: [postTags.tagId],
		references: [tags.id]
	})
}));
const commentsRelations = relations(comments, ({ one, many }) => ({
	parent: one(comments, {
		fields: [comments.thread],
		references: [comments.id],
		relationName: "comments_thread"
	}),
	replies: many(comments, { relationName: "comments_thread" }),
	user: one(user, {
		fields: [comments.userId],
		references: [user.id]
	})
}));

//#endregion
//#region ../../packages/db/src/index.ts
const db = drizzle(env.DATABASE_URL, { schema: schema_exports });

//#endregion
//#region src/schema/api.ts
const createApiResponseSchema = (dataSchema, metaSchema) => z.object({
	status: z.enum(["success", "error"]),
	message: z.string(),
	meta: metaSchema ? metaSchema.optional() : z.undefined().optional(),
	data: dataSchema
});

//#endregion
//#region src/schema/post.ts
const postSchema = z.object({
	id: z.string(),
	title: z.string(),
	summary: z.string().nullable(),
	content: z.string(),
	slug: z.string(),
	cover: z.string().nullable(),
	status: z.enum([
		"draft",
		"published",
		"archived"
	]),
	viewCount: z.number(),
	likeCount: z.number(),
	commentCount: z.number(),
	allowComments: z.boolean(),
	pin: z.boolean(),
	pinOrder: z.number(),
	createdAt: z.date(),
	updatedAt: z.date(),
	category: z.object({
		id: z.string(),
		name: z.string(),
		slug: z.string(),
		description: z.string().nullable(),
		color: z.string().nullable(),
		parentId: z.string().nullable(),
		sortOrder: z.number(),
		postCount: z.number(),
		createdAt: z.date(),
		updatedAt: z.date()
	}).nullable(),
	tags: z.array(z.object({
		id: z.string(),
		name: z.string(),
		slug: z.string(),
		description: z.string().nullable(),
		color: z.string().nullable(),
		postCount: z.number().optional(),
		createdAt: z.date(),
		updatedAt: z.date()
	})),
	author: z.object({
		id: z.string(),
		username: z.string().nullable(),
		displayUsername: z.string().nullable(),
		name: z.string().nullable(),
		email: z.string(),
		emailVerified: z.boolean(),
		image: z.string().nullable(),
		role: z.string().nullable(),
		banned: z.boolean().nullable(),
		banReason: z.string().nullable(),
		banExpires: z.date().nullable(),
		createdAt: z.date(),
		updatedAt: z.date()
	})
});
const createPostSchema = z.object({
	title: z.string(),
	content: z.string()
});
const PostsResponseSchema = createApiResponseSchema(z.array(postSchema));
const PostResponseSchema = createApiResponseSchema(postSchema.nullable());

//#endregion
//#region src/routers/post.ts
const getPosts = publicProcedure.route({
	method: "GET",
	path: "/posts"
}).output(PostsResponseSchema).handler(async () => {
	const rows = await db.select({
		post: posts,
		author: user,
		category: categories
	}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).leftJoin(categories, eq(posts.categoryId, categories.id));
	const postIds = rows.map((r) => String(r.post.id));
	let tagRows = [];
	if (postIds.length) tagRows = await db.select({
		postId: postTags.postId,
		tag: tags
	}).from(postTags).leftJoin(tags, eq(postTags.tagId, tags.id)).where(inArray(postTags.postId, postIds));
	const tagsByPost = /* @__PURE__ */ new Map();
	for (const tr of tagRows) {
		if (!tr.tag) continue;
		const pid = String(tr.postId);
		const arr = tagsByPost.get(pid) ?? [];
		arr.push(tr.tag);
		tagsByPost.set(pid, arr);
	}
	return {
		status: "success",
		message: "文章列表取得成功",
		data: rows.map((r) => {
			const { post, author, category } = r;
			const tags$1 = tagsByPost.get(String(post.id)) ?? [];
			return {
				...post,
				author,
				category,
				tags: tags$1
			};
		})
	};
});
const getPost = publicProcedure.route({
	method: "GET",
	path: "/posts/{id}"
}).input(z$1.object({ id: z$1.string() })).output(PostResponseSchema).handler(async ({ input }) => {
	const { id } = input;
	console.log(`Fetching post with id: ${id}`);
	const [row] = await db.select({
		post: posts,
		author: user,
		category: categories
	}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).leftJoin(categories, eq(posts.categoryId, categories.id)).where(eq(posts.slug, id)).limit(1);
	if (!row) return {
		status: "error",
		message: "文章不存在",
		data: null
	};
	const tagsByPost = (await db.select({ tag: tags }).from(postTags).leftJoin(tags, eq(postTags.tagId, tags.id)).where(eq(postTags.postId, row.post.id))).map((tr) => tr.tag).filter((t) => t !== null);
	const { post, author, category } = row;
	return {
		status: "success",
		message: "文章取得成功",
		data: {
			...post,
			author,
			category,
			tags: tagsByPost
		}
	};
});
var post_default = {
	getPosts,
	getPost
};

//#endregion
//#region src/routers/note.ts
const getNotes = publicProcedure.route({
	method: "GET",
	path: "/notes"
}).input(z$1.object({ id: z$1.string().optional() })).handler(async ({ input }) => {
	const noteId = input.id;
	if (!noteId) {
		const notesList = await db.select().from(notes).where(eq(notes.status, true)).orderBy(desc(notes.createdAt)).limit(9);
		return {
			status: "success",
			message: "日記列表取得成功",
			data: {
				current: notesList[0] ?? null,
				prev: notesList.slice(1, 5),
				next: []
			}
		};
	}
	const currentNoteCreatedAt = (await db.select({ createdAt: notes.createdAt }).from(notes).where(and(eq(notes.id, noteId), eq(notes.status, true))).limit(1))[0].createdAt;
	const prevNotesQuery = await db.select({ id: notes.id }).from(notes).where(and(lt(notes.createdAt, currentNoteCreatedAt), eq(notes.status, true))).orderBy(desc(notes.createdAt)).limit(4);
	const nextNotesQuery = await db.select({ id: notes.id }).from(notes).where(and(gt(notes.createdAt, currentNoteCreatedAt), eq(notes.status, true))).orderBy(asc(notes.createdAt)).limit(4);
	const [prevNotes, nextNotes] = await Promise.all([prevNotesQuery, nextNotesQuery]);
	const nodeIds = [
		...prevNotes.map((note) => note.id),
		noteId,
		...nextNotes.map((note) => note.id)
	];
	return {
		status: "success",
		message: "日記列表取得成功",
		data: (await db.select({
			notes,
			user,
			topics
		}).from(notes).leftJoin(user, eq(user.id, notes.authorId)).leftJoin(topics, eq(topics.id, notes.topicId)).where(and(eq(notes.status, true), inArray(notes.id, nodeIds))).orderBy(desc(notes.createdAt))).map((note) => ({
			id: note.notes.id,
			title: note.notes.title,
			createdAt: note.notes.createdAt,
			content: note.notes.content,
			author: note.user,
			topic: note.topics
		}))
	};
});
const getNoteLatest = publicProcedure.route({
	method: "GET",
	path: "/notes/latest"
}).handler(async () => {
	return {
		status: "success",
		message: "最新日記取得成功",
		data: { id: (await db.select().from(notes).orderBy(desc(notes.createdAt)).limit(1))[0]?.id ?? null }
	};
});
const getNote = publicProcedure.route({
	method: "GET",
	path: "/notes/{id}"
}).input(z$1.object({ id: z$1.string() })).handler(async ({ input }) => {
	const noteId = input.id;
	return {
		status: "success",
		message: "日記取得成功",
		data: (await db.select().from(notes).where(eq(notes.id, noteId)).limit(1))[0] ?? null
	};
});
var note_default = {
	getNotes,
	getNoteLatest,
	getNote
};

//#endregion
//#region src/schema/comment.ts
const commentSchema = z.object({
	id: z.uuid(),
	refType: z.enum([
		"post",
		"note",
		"page",
		"recently"
	]),
	refId: z.string(),
	displayUsername: z.string(),
	email: z.string().email(),
	website: z.string().url().nullable(),
	content: z.string(),
	thread: z.string().nullable(),
	likes: z.number(),
	dislikes: z.number(),
	deleted: z.boolean(),
	pin: z.boolean(),
	source: z.enum([
		"guest",
		"google",
		"github"
	]),
	userId: z.string().nullable(),
	ip: z.string().nullable(),
	agent: z.string().nullable(),
	location: z.string().nullable(),
	createdAt: z.date(),
	updatedAt: z.date()
});
const CommentResponseSchema = createApiResponseSchema(commentSchema);
const CommentsResponseSchema = createApiResponseSchema(z.array(commentSchema));

//#endregion
//#region src/routers/comment.ts
const getComments = publicProcedure.route({
	method: "GET",
	path: "/comments/{refId}"
}).input(z$1.object({
	type: z$1.enum([
		"post",
		"note",
		"page",
		"recently"
	]),
	refId: z$1.string()
})).output(CommentsResponseSchema).handler(async ({ input }) => {
	const { type, refId } = input;
	return {
		status: "success",
		message: "留言列表取得成功",
		data: (await db.select().from(comments).where(and(eq(comments.refId, refId), eq(comments.refType, type))).orderBy(desc(comments.createdAt))).map((comment) => ({
			...comment,
			content: comment.deleted ? "[此評論已被刪除]" : comment.content
		}))
	};
});
const createComment = protectedProcedure.route({
	method: "POST",
	path: "/comments"
}).input(z$1.object({
	type: z$1.enum([
		"post",
		"note",
		"page"
	]),
	refId: z$1.string(),
	displayUsername: z$1.string(),
	email: z$1.string().email(),
	source: z$1.enum([
		"guest",
		"google",
		"github"
	]),
	content: z$1.string().min(1),
	thread: z$1.string().optional()
})).handler(async ({ input, context }) => {
	const { type, refId, displayUsername, email, content, source, thread } = input;
	const userId = context.session?.user.id ?? null;
	const [newComment] = await db.insert(comments).values({
		refType: type,
		refId,
		displayUsername,
		email,
		content,
		userId,
		source,
		thread
	}).returning();
	return {
		status: "success",
		message: "留言創建成功",
		data: newComment
	};
});
const deleteComment = protectedProcedure.route({
	method: "DELETE",
	path: "/comments/{id}"
}).input(z$1.object({ id: z$1.uuid() })).handler(async ({ input, context }) => {
	const { id } = input;
	const userId = context.session?.user.id ?? null;
	await db.update(comments).set({ deleted: true }).where(and(eq(comments.id, id), eq(comments.userId, userId)));
	return {
		status: "success",
		message: "留言刪除成功"
	};
});
const likeComment = protectedProcedure.route({
	method: "POST",
	path: "/comments/{id}/like"
}).input(z$1.object({
	id: z$1.uuid(),
	like: z$1.boolean()
})).handler(async ({ input, context }) => {
	const { id, like } = input;
	const userId = context.session?.user.id ?? null;
	if (!userId) return {
		status: "error",
		message: "未登入"
	};
	const comment = await db.query.comments.findFirst({ where: (comment$1) => eq(comment$1.id, id) });
	if (!comment) return {
		status: "error",
		message: "留言不存在"
	};
	const existingLike = await db.query.commentLikes.findFirst({ where: (like$1) => and(eq(like$1.commentId, id), eq(like$1.userId, userId)) });
	if (existingLike) if (existingLike.like === like) {
		await db.delete(commentLikes).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, userId)));
		await db.update(comments).set({
			likes: comment.likes - (like ? 1 : 0),
			dislikes: comment.dislikes - (like ? 0 : 1)
		}).where(eq(comments.id, id));
	} else {
		await db.update(commentLikes).set({ like }).where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, userId)));
		await db.update(comments).set({
			likes: comment.likes + (like ? 1 : -1),
			dislikes: comment.dislikes + (like ? -1 : 1)
		}).where(eq(comments.id, id));
	}
	else {
		await db.insert(commentLikes).values({
			commentId: id,
			userId,
			like
		});
		await db.update(comments).set({
			likes: comment.likes + (like ? 1 : 0),
			dislikes: comment.dislikes + (like ? 0 : 1)
		}).where(eq(comments.id, id));
	}
	return {
		status: "success",
		message: "操作成功",
		data: {
			userId,
			commentId: id,
			like
		}
	};
});
const commentRouter = {
	getComments,
	createComment,
	deleteComment,
	likeComment
};

//#endregion
//#region src/routers/index.ts
const appRouter = {
	post: post_default,
	note: note_default,
	comment: commentRouter
};

//#endregion
export { appRouter };