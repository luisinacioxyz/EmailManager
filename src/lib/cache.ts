import type { EmailAnalysis } from '@/lib/gemini/types';

const CACHE_KEY = 'gmail-ai-analyses';
const CACHE_VERSION = 1;

interface AnalysisCache {
    version: number;
    analyses: Record<string, EmailAnalysis>;
    timestamp: number;
}

/**
 * Get cached analysis for an email ID
 */
export function getCachedAnalysis(emailId: string): EmailAnalysis | null {
    if (typeof window === 'undefined') return null;

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        const data: AnalysisCache = JSON.parse(cached);
        if (data.version !== CACHE_VERSION) return null;

        return data.analyses[emailId] || null;
    } catch {
        return null;
    }
}

/**
 * Get all cached analyses
 */
export function getAllCachedAnalyses(): Map<string, EmailAnalysis> {
    if (typeof window === 'undefined') return new Map();

    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (!cached) return new Map();

        const data: AnalysisCache = JSON.parse(cached);
        if (data.version !== CACHE_VERSION) return new Map();

        return new Map(Object.entries(data.analyses));
    } catch {
        return new Map();
    }
}

/**
 * Save analyses to cache
 */
export function cacheAnalyses(analyses: EmailAnalysis[]): void {
    if (typeof window === 'undefined') return;

    try {
        const existing = getAllCachedAnalyses();
        analyses.forEach((a) => existing.set(a.emailId, a));

        const data: AnalysisCache = {
            version: CACHE_VERSION,
            analyses: Object.fromEntries(existing),
            timestamp: Date.now(),
        };

        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {
        console.error('Failed to cache analyses:', err);
    }
}

/**
 * Filter out already cached email IDs
 */
export function getUncachedIds(ids: string[]): string[] {
    const cached = getAllCachedAnalyses();
    return ids.filter((id) => !cached.has(id));
}

/**
 * Clear the cache
 */
export function clearCache(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(CACHE_KEY);
}
