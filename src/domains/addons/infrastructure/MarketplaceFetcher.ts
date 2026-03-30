/**
 * Fetches marketplace.json from various origin sources.
 * Uses Node's built-in fetch (Node 18+) for HTTP and fs for local files.
 */

import { readFile } from 'node:fs/promises';
import type { OriginSource } from '../domain/marketplaceOrigin';

/** Well-known paths where marketplace.json may live in a repo. */
const MARKETPLACE_PATHS = ['.claude-plugin/marketplace.json', 'marketplace.json'];

export interface FetchResult {
  readonly ok: boolean;
  readonly data: unknown;
  readonly error?: string;
}

/**
 * Fetch and parse marketplace.json from the given origin source.
 */
export async function fetchMarketplaceJson(source: OriginSource): Promise<FetchResult> {
  switch (source.kind) {
    case 'github':
      return fetchFromGithub(source.owner, source.repo);
    case 'url':
      return fetchFromUrl(source.url);
    case 'file':
      return fetchFromFile(source.path);
  }
}

async function fetchFromGithub(owner: string, repo: string): Promise<FetchResult> {
  // Try each well-known path in the repo
  for (const path of MARKETPLACE_PATHS) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/main/${path}`;
    const result = await fetchFromUrl(url);
    if (result.ok) {
      return result;
    }
  }
  // Also try HEAD branch
  for (const path of MARKETPLACE_PATHS) {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
    const result = await fetchFromUrl(url);
    if (result.ok) {
      return result;
    }
  }
  return {
    ok: false,
    data: null,
    error: `No marketplace.json found in ${owner}/${repo}`,
  };
}

async function fetchFromUrl(url: string): Promise<FetchResult> {
  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return { ok: false, data: null, error: `HTTP ${response.status}: ${response.statusText}` };
    }
    const data: unknown = await response.json();
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, data: null, error: message };
  }
}

async function fetchFromFile(path: string): Promise<FetchResult> {
  try {
    const content = await readFile(path, 'utf-8');
    const data: unknown = JSON.parse(content);
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, data: null, error: message };
  }
}
