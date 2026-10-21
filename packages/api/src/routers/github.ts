import { publicProcedure } from "@sao-blog/api/index";
import { env } from "@sao-blog/env/server";
import z from "zod";

const repoOutput = z.object({
  fullName: z.string(),
  description: z.string().nullable(),
  ownerAvatar: z.string().nullable(),
  homepage: z.string().nullable(),
  language: z.string().nullable(),
  stars: z.number(),
  forks: z.number(),
  license: z.string().nullable(),
  topics: z.array(z.string()),
  archived: z.boolean(),
  pushedAt: z.string().nullable(),
});
type Repo = z.infer<typeof repoOutput>;

// GitHub REST /repos/{owner}/{repo} 回應中用得到的欄位
interface GithubRepoResponse {
  full_name: string;
  description?: string | null;
  owner?: { avatar_url?: string };
  homepage?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  license?: { spdx_id?: string } | null;
  topics?: string[];
  archived?: boolean;
  pushed_at?: string | null;
}

// 同一個 repo 6 小時內只打一次 GitHub API（匿名額度每 IP 每小時 60 次）；
// 查不到（404、額度用完）也快取 30 分鐘，不要一直重打
const CACHE_TTL = 6 * 60 * 60 * 1000;
const MISS_TTL = 30 * 60 * 1000;
const cache = new Map<string, { at: number; ttl: number; repo: Repo | null }>();

async function fetchRepo(owner: string, name: string): Promise<Repo | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "SaoBlogBot/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}),
      },
    });
    if (!response.ok) return null;
    const r = (await response.json()) as GithubRepoResponse;
    return {
      fullName: r.full_name,
      description: r.description ?? null,
      ownerAvatar: r.owner?.avatar_url ?? null,
      homepage: r.homepage || null,
      language: r.language ?? null,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      license: r.license?.spdx_id && r.license.spdx_id !== "NOASSERTION" ? r.license.spdx_id : null,
      topics: Array.isArray(r.topics) ? r.topics.slice(0, 6) : [],
      archived: !!r.archived,
      pushedAt: r.pushed_at ?? null,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

const getRepo = publicProcedure
  .route({ method: "GET", path: "/github/repo" })
  .input(
    z.object({
      owner: z.string().regex(/^[\w.-]+$/),
      repo: z.string().regex(/^[\w.-]+$/),
    })
  )
  .output(repoOutput.nullable())
  .handler(async ({ input }) => {
    const key = `${input.owner}/${input.repo}`.toLowerCase();
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < hit.ttl) return hit.repo;

    const repo = await fetchRepo(input.owner, input.repo);
    cache.set(key, { at: Date.now(), ttl: repo ? CACHE_TTL : MISS_TTL, repo });
    return repo;
  });

export default { getRepo };
