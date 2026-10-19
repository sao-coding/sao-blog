import { db } from "@sao-blog/db";
import {
  categoryTranslations,
  noteTranslations,
  postTranslations,
  type Locale,
} from "@sao-blog/db/schema/index";
import type { MdxArtifacts } from "./mdx-validate";

// 過渡期（PR2）雙寫：主表的 title / content 等仍是讀取來源，每次存檔同步 upsert
// 原文語系那筆 translation，確保切換到 translation 讀取（PR3）時資料一致。
// 編譯產物（compiled / toc / plainText）一併寫入，發布時就不必再編譯。

const compiledColumns = (a: MdxArtifacts) => ({
  compiled: a.compiled,
  toc: a.toc,
  plainText: a.plainText,
  readingTime: a.readingTime,
  compiledHash: a.compiledHash,
  sourceHash: a.hash,
});

export async function upsertSourcePostTranslation(input: {
  postId: string;
  locale: Locale;
  title: string;
  summary: string | null;
  content: string;
  status: "draft" | "published" | "archived";
  artifacts: MdxArtifacts;
}) {
  const values = {
    title: input.title,
    summary: input.summary,
    content: input.content,
    status: input.status,
    ...compiledColumns(input.artifacts),
    updatedAt: new Date(),
  };
  await db
    .insert(postTranslations)
    .values({ postId: input.postId, locale: input.locale, isSource: true, ...values })
    .onConflictDoUpdate({
      target: [postTranslations.postId, postTranslations.locale],
      set: { ...values, isSource: true },
    });
}

export async function upsertSourceNoteTranslation(input: {
  noteId: string;
  locale: Locale;
  title: string;
  content: string;
  status: boolean;
  artifacts: MdxArtifacts;
}) {
  const values = {
    title: input.title,
    content: input.content,
    status: input.status,
    ...compiledColumns(input.artifacts),
    updatedAt: new Date(),
  };
  await db
    .insert(noteTranslations)
    .values({ noteId: input.noteId, locale: input.locale, isSource: true, ...values })
    .onConflictDoUpdate({
      target: [noteTranslations.noteId, noteTranslations.locale],
      set: { ...values, isSource: true },
    });
}

export async function upsertCategoryTranslation(input: {
  categoryId: string;
  locale: Locale;
  name: string;
  description: string | null;
}) {
  const values = { name: input.name, description: input.description, updatedAt: new Date() };
  await db
    .insert(categoryTranslations)
    .values({ categoryId: input.categoryId, locale: input.locale, ...values })
    .onConflictDoUpdate({
      target: [categoryTranslations.categoryId, categoryTranslations.locale],
      set: values,
    });
}
