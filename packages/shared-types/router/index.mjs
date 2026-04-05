import { ORPCError, os } from "@orpc/server";
import "dotenv/config";
import * as z$2 from "zod";
import z, { z as z$1 } from "zod";
import { drizzle } from "drizzle-orm/node-postgres";
import { boolean, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { and, asc, desc, eq, gt, inArray, lt, relations } from "drizzle-orm";
import { randomFillSync } from "node:crypto";
import { HIDE_METADATA, betterAuth } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, apiKey, openAPI, username } from "better-auth/plugins";

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
		DATABASE_URL: z$1.string().min(1),
		BETTER_AUTH_SECRET: z$1.string().min(32),
		BETTER_AUTH_URL: z$1.url(),
		GITHUB_CLIENT_ID: z$1.string().min(1),
		GITHUB_CLIENT_SECRET: z$1.string().min(1),
		CORS_ORIGIN: z$1.string().transform((val) => JSON.parse(val)).pipe(z$1.array(z$1.url())),
		NODE_ENV: z$1.enum([
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
const createApiResponseSchema = (dataSchema, metaSchema) => z$1.object({
	status: z$1.enum(["success", "error"]),
	message: z$1.string(),
	meta: metaSchema ? metaSchema.optional() : z$1.undefined().optional(),
	data: dataSchema
});

//#endregion
//#region src/schema/post.ts
const postSchema = z$1.object({
	id: z$1.string(),
	title: z$1.string(),
	summary: z$1.string().nullable(),
	content: z$1.string(),
	slug: z$1.string(),
	cover: z$1.string().nullable(),
	status: z$1.enum([
		"draft",
		"published",
		"archived"
	]),
	viewCount: z$1.number(),
	likeCount: z$1.number(),
	commentCount: z$1.number(),
	allowComments: z$1.boolean(),
	pin: z$1.boolean(),
	pinOrder: z$1.number(),
	createdAt: z$1.date(),
	updatedAt: z$1.date(),
	category: z$1.object({
		id: z$1.string(),
		name: z$1.string(),
		slug: z$1.string(),
		description: z$1.string().nullable(),
		color: z$1.string().nullable(),
		parentId: z$1.string().nullable(),
		sortOrder: z$1.number(),
		postCount: z$1.number(),
		createdAt: z$1.date(),
		updatedAt: z$1.date()
	}),
	tags: z$1.array(z$1.object({
		id: z$1.string(),
		name: z$1.string(),
		slug: z$1.string(),
		description: z$1.string().nullable(),
		color: z$1.string().nullable(),
		postCount: z$1.number().optional(),
		createdAt: z$1.date(),
		updatedAt: z$1.date()
	})),
	author: z$1.object({
		id: z$1.string(),
		username: z$1.string().nullable(),
		displayUsername: z$1.string().nullable(),
		name: z$1.string().nullable(),
		email: z$1.string(),
		emailVerified: z$1.boolean(),
		image: z$1.string().nullable(),
		role: z$1.string().nullable(),
		banned: z$1.boolean().nullable(),
		banReason: z$1.string().nullable(),
		banExpires: z$1.date().nullable(),
		createdAt: z$1.date(),
		updatedAt: z$1.date()
	})
});
const createPostSchema = z$1.object({
	slug: z$1.string().max(256),
	title: z$1.string().max(200),
	content: z$1.string().max(1e4),
	summary: z$1.string().max(200).optional(),
	category: z$1.string().uuid().optional(),
	tags: z$1.array(z$1.string().uuid()).optional(),
	cover: z$1.string().url().optional(),
	allowComments: z$1.boolean().default(true),
	pin: z$1.boolean().default(false),
	pinOrder: z$1.number().default(0),
	status: z$1.enum(["draft", "published"]).default("draft")
});
const PostsResponseSchema = createApiResponseSchema(z$1.array(postSchema));
const PostResponseSchema = createApiResponseSchema(postSchema.nullable());

//#endregion
//#region src/routers/post.ts
const getPosts$1 = publicProcedure.route({
	method: "GET",
	path: "/posts"
}).output(PostsResponseSchema).handler(async () => {
	const rows = await db.select({
		post: posts,
		author: user,
		category: categories
	}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).innerJoin(categories, eq(posts.categoryId, categories.id));
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
		meta: void 0,
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
const getPost$1 = publicProcedure.route({
	method: "GET",
	path: "/posts/{id}"
}).input(z.object({ id: z.string() })).output(PostResponseSchema).handler(async ({ input }) => {
	const { id } = input;
	console.log(`Fetching post with id: ${id}`);
	const [row] = await db.select({
		post: posts,
		author: user,
		category: categories
	}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).innerJoin(categories, eq(posts.categoryId, categories.id)).where(eq(posts.slug, id)).limit(1);
	if (!row) return {
		status: "error",
		message: "文章不存在",
		meta: void 0,
		data: null
	};
	const tagsByPost = (await db.select({ tag: tags }).from(postTags).leftJoin(tags, eq(postTags.tagId, tags.id)).where(eq(postTags.postId, row.post.id))).map((tr) => tr.tag).filter((t) => t !== null);
	const { post, author, category } = row;
	return {
		status: "success",
		message: "文章取得成功",
		meta: void 0,
		data: {
			...post,
			author,
			category,
			tags: tagsByPost
		}
	};
});
var post_default = {
	getPosts: getPosts$1,
	getPost: getPost$1
};

//#endregion
//#region src/routers/note.ts
const getNotes = publicProcedure.route({
	method: "GET",
	path: "/notes"
}).input(z.object({ id: z.string().optional() })).handler(async ({ input }) => {
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
}).input(z.object({ id: z.string() })).handler(async ({ input }) => {
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
const commentSchema = z$1.object({
	id: z$1.uuid(),
	refType: z$1.enum([
		"post",
		"note",
		"page",
		"recently"
	]),
	refId: z$1.string(),
	displayUsername: z$1.string(),
	email: z$1.string().email(),
	website: z$1.string().url().nullable(),
	content: z$1.string(),
	thread: z$1.string().nullable(),
	liked: z$1.boolean().nullable(),
	likes: z$1.number(),
	dislikes: z$1.number(),
	deleted: z$1.boolean(),
	pin: z$1.boolean(),
	source: z$1.enum([
		"guest",
		"google",
		"github"
	]),
	userId: z$1.string().nullable(),
	ip: z$1.string().nullable(),
	agent: z$1.string().nullable(),
	location: z$1.string().nullable(),
	createdAt: z$1.date(),
	updatedAt: z$1.date()
});
const CommentResponseSchema = createApiResponseSchema(commentSchema);
const CommentsResponseSchema = createApiResponseSchema(z$1.array(commentSchema));

//#endregion
//#region src/routers/comment.ts
const getComments = publicProcedure.route({
	method: "GET",
	path: "/comments/{refId}"
}).input(z.object({
	type: z.enum([
		"post",
		"note",
		"page",
		"recently"
	]),
	refId: z.string()
})).output(CommentsResponseSchema).handler(async ({ input, context }) => {
	const { type, refId } = input;
	const userId = context.session?.user.id ?? null;
	const commentsList = await db.select().from(comments).where(and(eq(comments.refId, refId), eq(comments.refType, type))).orderBy(desc(comments.createdAt));
	let likedMap = /* @__PURE__ */ new Map();
	if (userId && commentsList.length > 0) {
		const commentIds = commentsList.map((c) => c.id);
		(await db.select().from(commentLikes).where(and(eq(commentLikes.userId, userId), inArray(commentLikes.commentId, commentIds)))).forEach((r) => likedMap.set(r.commentId, r.like));
	}
	return {
		status: "success",
		message: "留言列表取得成功",
		meta: void 0,
		data: commentsList.map((comment) => ({
			...comment,
			content: comment.deleted ? "[此評論已被刪除]" : comment.content,
			liked: userId ? likedMap.has(comment.id) ? likedMap.get(comment.id) : null : null
		}))
	};
});
const createComment = publicProcedure.route({
	method: "POST",
	path: "/comments"
}).input(z.object({
	type: z.enum([
		"post",
		"note",
		"page"
	]),
	refId: z.string(),
	displayUsername: z.string(),
	email: z.string().email(),
	source: z.enum([
		"guest",
		"google",
		"github"
	]),
	content: z.string().min(1),
	thread: z.string().optional()
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
const deleteComment = publicProcedure.route({
	method: "DELETE",
	path: "/comments/{id}"
}).input(z.object({ id: z.uuid() })).handler(async ({ input, context }) => {
	const { id } = input;
	const userId = context.session?.user.id;
	if (!userId) return {
		status: "error",
		message: "未登入"
	};
	await db.update(comments).set({ deleted: true }).where(and(eq(comments.id, id), eq(comments.userId, userId)));
	return {
		status: "success",
		message: "留言刪除成功"
	};
});
const likeComment = protectedProcedure.route({
	method: "POST",
	path: "/comments/{id}/like"
}).input(z.object({
	id: z.uuid(),
	like: z.boolean()
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
var comment_default = {
	getComments,
	createComment,
	deleteComment,
	likeComment
};

//#endregion
//#region ../../node_modules/.pnpm/@better-auth+core@1.4.19_@b_ce27142bc9376bc27e5ac142474d4150/node_modules/@better-auth/core/dist/context/global.mjs
const symbol = Symbol.for("better-auth:global");

//#endregion
//#region ../../node_modules/.pnpm/@better-auth+core@1.4.19_@b_ce27142bc9376bc27e5ac142474d4150/node_modules/@better-auth/core/dist/async_hooks/index.mjs
const AsyncLocalStoragePromise = import(
	/* @vite-ignore */
	/* webpackIgnore: true */
	"node:async_hooks"
).then((mod) => mod.AsyncLocalStorage).catch((err) => {
	if ("AsyncLocalStorage" in globalThis) return globalThis.AsyncLocalStorage;
	if (typeof window !== "undefined") return null;
	console.warn("[better-auth] Warning: AsyncLocalStorage is not available in this environment. Some features may not work as expected.");
	console.warn("[better-auth] Please read more about this warning at https://better-auth.com/docs/installation#mount-handler");
	console.warn("[better-auth] If you are using Cloudflare Workers, please see: https://developers.cloudflare.com/workers/configuration/compatibility-flags/#nodejs-compatibility-flag");
	throw err;
});

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/error.mjs
function isErrorStackTraceLimitWritable() {
	const desc$1 = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
	if (desc$1 === void 0) return Object.isExtensible(Error);
	return Object.prototype.hasOwnProperty.call(desc$1, "writable") ? desc$1.writable : desc$1.set !== void 0;
}
/**
* Hide internal stack frames from the error stack trace.
*/
function hideInternalStackFrames(stack) {
	const lines = stack.split("\n    at ");
	if (lines.length <= 1) return stack;
	lines.splice(1, 1);
	return lines.join("\n    at ");
}
/**
* Creates a custom error class that hides stack frames.
*/
function makeErrorForHideStackFrame(Base, clazz) {
	class HideStackFramesError extends Base {
		#hiddenStack;
		constructor(...args) {
			if (isErrorStackTraceLimitWritable()) {
				const limit = Error.stackTraceLimit;
				Error.stackTraceLimit = 0;
				super(...args);
				Error.stackTraceLimit = limit;
			} else super(...args);
			const stack = (/* @__PURE__ */ new Error()).stack;
			if (stack) this.#hiddenStack = hideInternalStackFrames(stack.replace(/^Error/, this.name));
		}
		get errorStack() {
			return this.#hiddenStack;
		}
	}
	Object.defineProperty(HideStackFramesError.prototype, "constructor", {
		get() {
			return clazz;
		},
		enumerable: false,
		configurable: true
	});
	return HideStackFramesError;
}
const statusCodes = {
	OK: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NO_CONTENT: 204,
	MULTIPLE_CHOICES: 300,
	MOVED_PERMANENTLY: 301,
	FOUND: 302,
	SEE_OTHER: 303,
	NOT_MODIFIED: 304,
	TEMPORARY_REDIRECT: 307,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	PAYMENT_REQUIRED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	NOT_ACCEPTABLE: 406,
	PROXY_AUTHENTICATION_REQUIRED: 407,
	REQUEST_TIMEOUT: 408,
	CONFLICT: 409,
	GONE: 410,
	LENGTH_REQUIRED: 411,
	PRECONDITION_FAILED: 412,
	PAYLOAD_TOO_LARGE: 413,
	URI_TOO_LONG: 414,
	UNSUPPORTED_MEDIA_TYPE: 415,
	RANGE_NOT_SATISFIABLE: 416,
	EXPECTATION_FAILED: 417,
	"I'M_A_TEAPOT": 418,
	MISDIRECTED_REQUEST: 421,
	UNPROCESSABLE_ENTITY: 422,
	LOCKED: 423,
	FAILED_DEPENDENCY: 424,
	TOO_EARLY: 425,
	UPGRADE_REQUIRED: 426,
	PRECONDITION_REQUIRED: 428,
	TOO_MANY_REQUESTS: 429,
	REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
	UNAVAILABLE_FOR_LEGAL_REASONS: 451,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504,
	HTTP_VERSION_NOT_SUPPORTED: 505,
	VARIANT_ALSO_NEGOTIATES: 506,
	INSUFFICIENT_STORAGE: 507,
	LOOP_DETECTED: 508,
	NOT_EXTENDED: 510,
	NETWORK_AUTHENTICATION_REQUIRED: 511
};
var InternalAPIError = class extends Error {
	constructor(status = "INTERNAL_SERVER_ERROR", body = void 0, headers = {}, statusCode = typeof status === "number" ? status : statusCodes[status]) {
		super(body?.message, body?.cause ? { cause: body.cause } : void 0);
		this.status = status;
		this.body = body;
		this.headers = headers;
		this.statusCode = statusCode;
		this.name = "APIError";
		this.status = status;
		this.headers = headers;
		this.statusCode = statusCode;
		this.body = body ? {
			code: body?.message?.toUpperCase().replace(/ /g, "_").replace(/[^A-Z0-9_]/g, ""),
			...body
		} : void 0;
	}
};
var ValidationError = class extends InternalAPIError {
	constructor(message, issues) {
		super(400, {
			message,
			code: "VALIDATION_ERROR"
		});
		this.message = message;
		this.issues = issues;
		this.issues = issues;
	}
};
var BetterCallError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "BetterCallError";
	}
};
const APIError$1 = makeErrorForHideStackFrame(InternalAPIError, Error);

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/utils.mjs
function isAPIError(error) {
	return error instanceof APIError$1 || error?.name === "APIError";
}
function tryDecode(str) {
	try {
		return str.includes("%") ? decodeURIComponent(str) : str;
	} catch {
		return str;
	}
}
async function tryCatch(promise) {
	try {
		return {
			data: await promise,
			error: null
		};
	} catch (error) {
		return {
			data: null,
			error
		};
	}
}
/**
* Check if an object is a `Request`
* - `instanceof`: works for native Request instances
* - `toString`: handles where instanceof check fails but the object is still a valid Request
*/
function isRequest(obj) {
	return obj instanceof Request || Object.prototype.toString.call(obj) === "[object Request]";
}

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/to-response.mjs
function isJSONSerializable(value) {
	if (value === void 0) return false;
	const t = typeof value;
	if (t === "string" || t === "number" || t === "boolean" || t === null) return true;
	if (t !== "object") return false;
	if (Array.isArray(value)) return true;
	if (value.buffer) return false;
	return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
function safeStringify(obj, replacer, space) {
	let id = 0;
	const seen = /* @__PURE__ */ new WeakMap();
	const safeReplacer = (key, value) => {
		if (typeof value === "bigint") return value.toString();
		if (typeof value === "object" && value !== null) {
			if (seen.has(value)) return `[Circular ref-${seen.get(value)}]`;
			seen.set(value, id++);
		}
		if (replacer) return replacer(key, value);
		return value;
	};
	return JSON.stringify(obj, safeReplacer, space);
}
function isJSONResponse(value) {
	if (!value || typeof value !== "object") return false;
	return "_flag" in value && value._flag === "json";
}
function toResponse(data, init) {
	if (data instanceof Response) {
		if (init?.headers instanceof Headers) init.headers.forEach((value, key) => {
			data.headers.set(key, value);
		});
		return data;
	}
	if (isJSONResponse(data)) {
		const body$1 = data.body;
		const routerResponse = data.routerResponse;
		if (routerResponse instanceof Response) return routerResponse;
		const headers$1 = new Headers();
		if (routerResponse?.headers) {
			const headers$2 = new Headers(routerResponse.headers);
			for (const [key, value] of headers$2.entries()) headers$2.set(key, value);
		}
		if (data.headers) for (const [key, value] of new Headers(data.headers).entries()) headers$1.set(key, value);
		if (init?.headers) for (const [key, value] of new Headers(init.headers).entries()) headers$1.set(key, value);
		headers$1.set("Content-Type", "application/json");
		return new Response(JSON.stringify(body$1), {
			...routerResponse,
			headers: headers$1,
			status: data.status ?? init?.status ?? routerResponse?.status,
			statusText: init?.statusText ?? routerResponse?.statusText
		});
	}
	if (isAPIError(data)) return toResponse(data.body, {
		status: init?.status ?? data.statusCode,
		statusText: data.status.toString(),
		headers: init?.headers || data.headers
	});
	let body = data;
	let headers = new Headers(init?.headers);
	if (!data) {
		if (data === null) body = JSON.stringify(null);
		headers.set("content-type", "application/json");
	} else if (typeof data === "string") {
		body = data;
		headers.set("Content-Type", "text/plain");
	} else if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
		body = data;
		headers.set("Content-Type", "application/octet-stream");
	} else if (data instanceof Blob) {
		body = data;
		headers.set("Content-Type", data.type || "application/octet-stream");
	} else if (data instanceof FormData) body = data;
	else if (data instanceof URLSearchParams) {
		body = data;
		headers.set("Content-Type", "application/x-www-form-urlencoded");
	} else if (data instanceof ReadableStream) {
		body = data;
		headers.set("Content-Type", "application/octet-stream");
	} else if (isJSONSerializable(data)) {
		body = safeStringify(data);
		headers.set("Content-Type", "application/json");
	}
	return new Response(body, {
		...init,
		headers
	});
}

//#endregion
//#region ../../node_modules/.pnpm/@better-auth+utils@0.3.0/node_modules/@better-auth/utils/dist/index.mjs
function getWebcryptoSubtle() {
	const cr = typeof globalThis !== "undefined" && globalThis.crypto;
	if (cr && typeof cr.subtle === "object" && cr.subtle != null) return cr.subtle;
	throw new Error("crypto.subtle must be defined");
}

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/crypto.mjs
const algorithm = {
	name: "HMAC",
	hash: "SHA-256"
};
const getCryptoKey = async (secret) => {
	const secretBuf = typeof secret === "string" ? new TextEncoder().encode(secret) : secret;
	return await getWebcryptoSubtle().importKey("raw", secretBuf, algorithm, false, ["sign", "verify"]);
};
const verifySignature = async (base64Signature, value, secret) => {
	try {
		const signatureBinStr = atob(base64Signature);
		const signature = new Uint8Array(signatureBinStr.length);
		for (let i = 0, len = signatureBinStr.length; i < len; i++) signature[i] = signatureBinStr.charCodeAt(i);
		return await getWebcryptoSubtle().verify(algorithm, secret, signature, new TextEncoder().encode(value));
	} catch (e) {
		return false;
	}
};
const makeSignature = async (value, secret) => {
	const key = await getCryptoKey(secret);
	const signature = await getWebcryptoSubtle().sign(algorithm.name, key, new TextEncoder().encode(value));
	return btoa(String.fromCharCode(...new Uint8Array(signature)));
};
const signCookieValue = async (value, secret) => {
	const signature = await makeSignature(value, secret);
	value = `${value}.${signature}`;
	value = encodeURIComponent(value);
	return value;
};

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/cookies.mjs
const getCookieKey = (key, prefix) => {
	let finalKey = key;
	if (prefix) if (prefix === "secure") finalKey = "__Secure-" + key;
	else if (prefix === "host") finalKey = "__Host-" + key;
	else return;
	return finalKey;
};
/**
* Parse an HTTP Cookie header string and returning an object of all cookie
* name-value pairs.
*
* Inspired by https://github.com/unjs/cookie-es/blob/main/src/cookie/parse.ts
*
* @param str the string representing a `Cookie` header value
*/
function parseCookies(str) {
	if (typeof str !== "string") throw new TypeError("argument str must be a string");
	const cookies = /* @__PURE__ */ new Map();
	let index$1 = 0;
	while (index$1 < str.length) {
		const eqIdx = str.indexOf("=", index$1);
		if (eqIdx === -1) break;
		let endIdx = str.indexOf(";", index$1);
		if (endIdx === -1) endIdx = str.length;
		else if (endIdx < eqIdx) {
			index$1 = str.lastIndexOf(";", eqIdx - 1) + 1;
			continue;
		}
		const key = str.slice(index$1, eqIdx).trim();
		if (!cookies.has(key)) {
			let val = str.slice(eqIdx + 1, endIdx).trim();
			if (val.codePointAt(0) === 34) val = val.slice(1, -1);
			cookies.set(key, tryDecode(val));
		}
		index$1 = endIdx + 1;
	}
	return cookies;
}
const _serialize = (key, value, opt = {}) => {
	let cookie;
	if (opt?.prefix === "secure") cookie = `${`__Secure-${key}`}=${value}`;
	else if (opt?.prefix === "host") cookie = `${`__Host-${key}`}=${value}`;
	else cookie = `${key}=${value}`;
	if (key.startsWith("__Secure-") && !opt.secure) opt.secure = true;
	if (key.startsWith("__Host-")) {
		if (!opt.secure) opt.secure = true;
		if (opt.path !== "/") opt.path = "/";
		if (opt.domain) opt.domain = void 0;
	}
	if (opt && typeof opt.maxAge === "number" && opt.maxAge >= 0) {
		if (opt.maxAge > 3456e4) throw new Error("Cookies Max-Age SHOULD NOT be greater than 400 days (34560000 seconds) in duration.");
		cookie += `; Max-Age=${Math.floor(opt.maxAge)}`;
	}
	if (opt.domain && opt.prefix !== "host") cookie += `; Domain=${opt.domain}`;
	if (opt.path) cookie += `; Path=${opt.path}`;
	if (opt.expires) {
		if (opt.expires.getTime() - Date.now() > 3456e7) throw new Error("Cookies Expires SHOULD NOT be greater than 400 days (34560000 seconds) in the future.");
		cookie += `; Expires=${opt.expires.toUTCString()}`;
	}
	if (opt.httpOnly) cookie += "; HttpOnly";
	if (opt.secure) cookie += "; Secure";
	if (opt.sameSite) cookie += `; SameSite=${opt.sameSite.charAt(0).toUpperCase() + opt.sameSite.slice(1)}`;
	if (opt.partitioned) {
		if (!opt.secure) opt.secure = true;
		cookie += "; Partitioned";
	}
	return cookie;
};
const serializeCookie = (key, value, opt) => {
	value = encodeURIComponent(value);
	return _serialize(key, value, opt);
};
const serializeSignedCookie = async (key, value, secret, opt) => {
	value = await signCookieValue(value, secret);
	return _serialize(key, value, opt);
};

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/validator.mjs
/**
* Runs validation on body and query
* @returns error and data object
*/
async function runValidation(options, context = {}) {
	let request = {
		body: context.body,
		query: context.query
	};
	if (options.body) {
		const result = await options.body["~standard"].validate(context.body);
		if (result.issues) return {
			data: null,
			error: fromError(result.issues, "body")
		};
		request.body = result.value;
	}
	if (options.query) {
		const result = await options.query["~standard"].validate(context.query);
		if (result.issues) return {
			data: null,
			error: fromError(result.issues, "query")
		};
		request.query = result.value;
	}
	if (options.requireHeaders && !context.headers) return {
		data: null,
		error: {
			message: "Headers is required",
			issues: []
		}
	};
	if (options.requireRequest && !context.request) return {
		data: null,
		error: {
			message: "Request is required",
			issues: []
		}
	};
	return {
		data: request,
		error: null
	};
}
function fromError(error, validating) {
	return {
		message: error.map((e) => {
			return `[${e.path?.length ? `${validating}.` + e.path.map((x) => typeof x === "object" ? x.key : x).join(".") : validating}] ${e.message}`;
		}).join("; "),
		issues: error
	};
}

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/context.mjs
const createInternalContext = async (context, { options, path }) => {
	const headers = new Headers();
	let responseStatus = void 0;
	const { data, error } = await runValidation(options, context);
	if (error) throw new ValidationError(error.message, error.issues);
	const requestHeaders = "headers" in context ? context.headers instanceof Headers ? context.headers : new Headers(context.headers) : "request" in context && isRequest(context.request) ? context.request.headers : null;
	const requestCookies = requestHeaders?.get("cookie");
	const parsedCookies = requestCookies ? parseCookies(requestCookies) : void 0;
	const internalContext = {
		...context,
		body: data.body,
		query: data.query,
		path: context.path || path || "virtual:",
		context: "context" in context && context.context ? context.context : {},
		returned: void 0,
		headers: context?.headers,
		request: context?.request,
		params: "params" in context ? context.params : void 0,
		method: context.method ?? (Array.isArray(options.method) ? options.method[0] : options.method === "*" ? "GET" : options.method),
		setHeader: (key, value) => {
			headers.set(key, value);
		},
		getHeader: (key) => {
			if (!requestHeaders) return null;
			return requestHeaders.get(key);
		},
		getCookie: (key, prefix) => {
			const finalKey = getCookieKey(key, prefix);
			if (!finalKey) return null;
			return parsedCookies?.get(finalKey) || null;
		},
		getSignedCookie: async (key, secret, prefix) => {
			const finalKey = getCookieKey(key, prefix);
			if (!finalKey) return null;
			const value = parsedCookies?.get(finalKey);
			if (!value) return null;
			const signatureStartPos = value.lastIndexOf(".");
			if (signatureStartPos < 1) return null;
			const signedValue = value.substring(0, signatureStartPos);
			const signature = value.substring(signatureStartPos + 1);
			if (signature.length !== 44 || !signature.endsWith("=")) return null;
			return await verifySignature(signature, signedValue, await getCryptoKey(secret)) ? signedValue : false;
		},
		setCookie: (key, value, options$1) => {
			const cookie = serializeCookie(key, value, options$1);
			headers.append("set-cookie", cookie);
			return cookie;
		},
		setSignedCookie: async (key, value, secret, options$1) => {
			const cookie = await serializeSignedCookie(key, value, secret, options$1);
			headers.append("set-cookie", cookie);
			return cookie;
		},
		redirect: (url) => {
			headers.set("location", url);
			return new APIError$1("FOUND", void 0, headers);
		},
		error: (status, body, headers$1) => {
			return new APIError$1(status, body, headers$1);
		},
		setStatus: (status) => {
			responseStatus = status;
		},
		json: (json$1, routerResponse) => {
			if (!context.asResponse) return json$1;
			return {
				body: routerResponse?.body || json$1,
				routerResponse,
				_flag: "json"
			};
		},
		responseHeaders: headers,
		get responseStatus() {
			return responseStatus;
		}
	};
	for (const middleware of options.use || []) {
		const response = await middleware({
			...internalContext,
			returnHeaders: true,
			asResponse: false
		});
		if (response.response) Object.assign(internalContext.context, response.response);
		/**
		* Apply headers from the middleware to the endpoint headers
		*/
		if (response.headers) response.headers.forEach((value, key) => {
			internalContext.responseHeaders.set(key, value);
		});
	}
	return internalContext;
};

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/endpoint.mjs
function createEndpoint(pathOrOptions, handlerOrOptions, handlerOrNever) {
	const path = typeof pathOrOptions === "string" ? pathOrOptions : void 0;
	const options = typeof handlerOrOptions === "object" ? handlerOrOptions : pathOrOptions;
	const handler = typeof handlerOrOptions === "function" ? handlerOrOptions : handlerOrNever;
	if ((options.method === "GET" || options.method === "HEAD") && options.body) throw new BetterCallError("Body is not allowed with GET or HEAD methods");
	if (path && /\/{2,}/.test(path)) throw new BetterCallError("Path cannot contain consecutive slashes");
	const internalHandler = async (...inputCtx) => {
		const context = inputCtx[0] || {};
		const { data: internalContext, error: validationError } = await tryCatch(createInternalContext(context, {
			options,
			path
		}));
		if (validationError) {
			if (!(validationError instanceof ValidationError)) throw validationError;
			if (options.onValidationError) await options.onValidationError({
				message: validationError.message,
				issues: validationError.issues
			});
			throw new APIError$1(400, {
				message: validationError.message,
				code: "VALIDATION_ERROR"
			});
		}
		const response = await handler(internalContext).catch(async (e) => {
			if (isAPIError(e)) {
				const onAPIError = options.onAPIError;
				if (onAPIError) await onAPIError(e);
				if (context.asResponse) return e;
			}
			throw e;
		});
		const headers = internalContext.responseHeaders;
		const status = internalContext.responseStatus;
		return context.asResponse ? toResponse(response, {
			headers,
			status
		}) : context.returnHeaders ? context.returnStatus ? {
			headers,
			response,
			status
		} : {
			headers,
			response
		} : context.returnStatus ? {
			response,
			status
		} : response;
	};
	internalHandler.options = options;
	internalHandler.path = path;
	return internalHandler;
}
createEndpoint.create = (opts) => {
	return (path, options, handler) => {
		return createEndpoint(path, {
			...options,
			use: [...options?.use || [], ...opts?.use || []]
		}, handler);
	};
};

//#endregion
//#region ../../node_modules/.pnpm/better-call@1.1.8_zod@4.3.6/node_modules/better-call/dist/middleware.mjs
function createMiddleware(optionsOrHandler, handler) {
	const internalHandler = async (inputCtx) => {
		const context = inputCtx;
		const _handler = typeof optionsOrHandler === "function" ? optionsOrHandler : handler;
		const internalContext = await createInternalContext(context, {
			options: typeof optionsOrHandler === "function" ? {} : optionsOrHandler,
			path: "/"
		});
		if (!_handler) throw new Error("handler must be defined");
		const response = await _handler(internalContext);
		const headers = internalContext.responseHeaders;
		return context.returnHeaders ? {
			headers,
			response
		} : response;
	};
	internalHandler.options = typeof optionsOrHandler === "function" ? {} : optionsOrHandler;
	return internalHandler;
}
createMiddleware.create = (opts) => {
	function fn(optionsOrHandler, handler) {
		if (typeof optionsOrHandler === "function") return createMiddleware({ use: opts?.use }, optionsOrHandler);
		if (!handler) throw new Error("Middleware handler is required");
		return createMiddleware({
			...optionsOrHandler,
			method: "*",
			use: [...opts?.use || [], ...optionsOrHandler.use || []]
		}, handler);
	}
	return fn;
};

//#endregion
//#region ../../node_modules/.pnpm/@better-auth+core@1.4.19_@b_ce27142bc9376bc27e5ac142474d4150/node_modules/@better-auth/core/dist/api/index.mjs
const optionsMiddleware = createMiddleware(async () => {
	/**
	* This will be passed on the instance of
	* the context. Used to infer the type
	* here.
	*/
	return {};
});
const createAuthMiddleware = createMiddleware.create({ use: [optionsMiddleware, createMiddleware(async () => {
	return {};
})] });

//#endregion
//#region ../../node_modules/.pnpm/@better-auth+expo@1.4.19_8f55e716f0db71b0b2967820fa7dc8ed/node_modules/@better-auth/expo/dist/index.mjs
const expoAuthorizationProxy = createAuthEndpoint("/expo-authorization-proxy", {
	method: "GET",
	query: z$2.object({
		authorizationURL: z$2.string(),
		oauthState: z$2.string().optional()
	}),
	metadata: HIDE_METADATA
}, async (ctx) => {
	const { oauthState } = ctx.query;
	if (oauthState) {
		const oauthStateCookie = ctx.context.createAuthCookie("oauth_state", { maxAge: 600 });
		ctx.setCookie(oauthStateCookie.name, oauthState, oauthStateCookie.attributes);
		return ctx.redirect(ctx.query.authorizationURL);
	}
	const { authorizationURL } = ctx.query;
	const state = new URL(authorizationURL).searchParams.get("state");
	if (!state) throw new APIError("BAD_REQUEST", { message: "Unexpected error" });
	const stateCookie = ctx.context.createAuthCookie("state", { maxAge: 300 });
	await ctx.setSignedCookie(stateCookie.name, state, ctx.context.secret, stateCookie.attributes);
	return ctx.redirect(ctx.query.authorizationURL);
});
const expo = (options) => {
	return {
		id: "expo",
		init: (ctx) => {
			return { options: { trustedOrigins: process.env.NODE_ENV === "development" ? ["exp://"] : [] } };
		},
		async onRequest(request, ctx) {
			if (options?.disableOriginOverride || request.headers.get("origin")) return;
			/**
			* To bypass origin check from expo, we need to set the origin
			* header to the expo-origin header
			*/
			const expoOrigin = request.headers.get("expo-origin");
			if (!expoOrigin) return;
			const newHeaders = new Headers(request.headers);
			newHeaders.set("origin", expoOrigin);
			return { request: new Request(request, { headers: newHeaders }) };
		},
		hooks: { after: [{
			matcher(context) {
				return !!(context.path?.startsWith("/callback") || context.path?.startsWith("/oauth2/callback") || context.path?.startsWith("/magic-link/verify") || context.path?.startsWith("/verify-email"));
			},
			handler: createAuthMiddleware(async (ctx) => {
				const headers = ctx.context.responseHeaders;
				const location = headers?.get("location");
				if (!location) return;
				if (location.includes("/oauth-proxy-callback")) return;
				let redirectURL;
				try {
					redirectURL = new URL(location);
				} catch {
					return;
				}
				if (redirectURL.protocol === "http:" || redirectURL.protocol === "https:") return;
				if (!ctx.context.isTrustedOrigin(location)) return;
				const cookie = headers?.get("set-cookie");
				if (!cookie) return;
				redirectURL.searchParams.set("cookie", cookie);
				ctx.setHeader("location", redirectURL.toString());
			})
		}] },
		endpoints: { expoAuthorizationProxy },
		options
	};
};

//#endregion
//#region ../../packages/auth/src/index.ts
const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: schema_exports
	}),
	trustedOrigins: [
		...env.CORS_ORIGIN.map((origin) => origin.trim()),
		"sao-blog://",
		...env.NODE_ENV === "development" ? [
			"exp://",
			"exp://**",
			"exp://192.168.*.*:*/**",
			"http://localhost:8081"
		] : []
	],
	emailAndPassword: { enabled: true },
	socialProviders: { github: {
		clientId: process.env.GITHUB_CLIENT_ID,
		clientSecret: process.env.GITHUB_CLIENT_SECRET
	} },
	advanced: {
		database: { generateId: false },
		defaultCookieAttributes: {
			sameSite: "none",
			secure: true,
			httpOnly: true
		}
	},
	plugins: [
		admin(),
		username(),
		openAPI(),
		expo(),
		apiKey({ enableSessionForAPIKeys: true })
	]
});

//#endregion
//#region src/routers/admin/post.ts
const getPosts = protectedProcedure.route({
	method: "GET",
	path: "/posts"
}).handler(async () => {
	return {
		status: "success",
		message: "文章列表取得成功",
		data: await db.select({
			id: posts.id,
			title: posts.title,
			slug: posts.slug,
			cover: posts.cover,
			status: posts.status,
			createdAt: posts.createdAt,
			updatedAt: posts.updatedAt,
			author: {
				id: user.id,
				name: user.name
			}
		}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).leftJoin(categories, eq(posts.categoryId, categories.id))
	};
});
const getPost = protectedProcedure.route({
	method: "GET",
	path: "/posts/{id}"
}).input(z.object({ id: z.string() })).handler(async ({ input }) => {
	const { id } = input;
	const [row] = await db.select({
		post: posts,
		author: user,
		category: categories
	}).from(posts).innerJoin(user, eq(posts.authorId, user.id)).innerJoin(categories, eq(posts.categoryId, categories.id)).where(eq(posts.id, id)).limit(1);
	console.log(`Fetching post with id: ${id}`, row);
	if (!row) return {
		status: "error",
		message: "文章不存在",
		meta: void 0,
		data: null
	};
	const tagsByPost = (await db.select({ tag: tags }).from(postTags).leftJoin(tags, eq(postTags.tagId, tags.id)).where(eq(postTags.postId, row.post.id))).map((tr) => tr.tag).filter((t) => t !== null);
	const { post, author, category } = row;
	return {
		status: "success",
		message: "文章取得成功",
		meta: void 0,
		data: {
			...post,
			author,
			category,
			tags: tagsByPost
		}
	};
});
const createPost = protectedProcedure.route({
	method: "POST",
	path: "/posts"
}).input(createPostSchema).handler(async ({ input, context }) => {
	const { slug, title, content, summary, category, tags: tags$1, cover, allowComments, pin, pinOrder, status } = input;
	const authorId = context.session?.user.id;
	if ((await db.select().from(posts).where(eq(posts.slug, slug)).limit(1)).length > 0) return {
		status: "error",
		message: "文章 slug 已存在",
		meta: void 0,
		data: null
	};
	const [newPost] = await db.insert(posts).values({
		authorId,
		slug,
		title,
		content,
		summary,
		categoryId: category || null,
		cover: cover || null,
		allowComments,
		pin,
		pinOrder,
		status
	}).returning();
	if (!newPost) return {
		status: "error",
		message: "文章建立失敗",
		meta: void 0,
		data: null
	};
	if (tags$1 && tags$1.length > 0) {
		const tagInserts = tags$1.map((tagId) => ({
			postId: newPost.id,
			tagId
		}));
		await db.insert(postTags).values(tagInserts);
	}
	return {
		status: "success",
		message: "文章創建成功",
		meta: void 0,
		data: newPost
	};
});
var post_default$1 = {
	getPosts,
	getPost,
	createPost
};

//#endregion
//#region src/routers/admin/category.ts
const getCategories = protectedProcedure.route({
	method: "GET",
	path: "/categories"
}).handler(async () => {
	return {
		status: "success",
		message: "分類列表取得成功",
		data: await db.select().from(categories).orderBy(desc(categories.createdAt))
	};
});
const getCategory = protectedProcedure.route({
	method: "GET",
	path: "/categories/{id}"
}).input(z.object({ id: z.string() })).handler(async ({ input }) => {
	const { id } = input;
	const [row] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
	if (!row) return {
		status: "error",
		message: "分類不存在",
		data: null
	};
	return {
		status: "success",
		message: "分類取得成功",
		data: row
	};
});
const createCategory = protectedProcedure.route({
	method: "POST",
	path: "/categories"
}).input(z.object({
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	color: z.string().nullable()
})).handler(async ({ input }) => {
	const { name, slug, description, color } = input;
	const [row] = await db.insert(categories).values({
		name,
		slug,
		description,
		color
	}).returning();
	return {
		status: "success",
		message: "分類創建成功",
		data: row
	};
});
const updateCategory = protectedProcedure.route({
	method: "PUT",
	path: "/categories/{id}"
}).input(z.object({
	id: z.string(),
	name: z.string(),
	slug: z.string(),
	description: z.string().nullable(),
	color: z.string().nullable()
})).handler(async ({ input }) => {
	const { id, name, slug, description, color } = input;
	const [row] = await db.update(categories).set({
		name,
		slug,
		description,
		color
	}).where(eq(categories.id, id)).returning();
});
var category_default = {
	getCategories,
	getCategory,
	createCategory,
	updateCategory
};

//#endregion
//#region src/routers/admin/tag.ts
const getTags = protectedProcedure.route({
	method: "GET",
	path: "/tags"
}).handler(async () => {
	return {
		status: "success",
		message: "標籤列表取得成功",
		data: await db.select().from(tags).orderBy(desc(tags.createdAt))
	};
});
var tag_default = { getTags };

//#endregion
//#region src/routers/index.ts
const appRouter = {
	post: post_default,
	note: note_default,
	comment: comment_default,
	admin: o.prefix("/admin").router({
		post: post_default$1,
		category: category_default,
		tag: tag_default
	})
};

//#endregion
export { appRouter };