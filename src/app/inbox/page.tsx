'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { EmailMetadata, ProcessedEmail } from '@/lib/gmail/types';
import type { EmailAnalysis } from '@/lib/gemini/types';
import { getAllCachedAnalyses, cacheAnalyses, getUncachedIds } from '@/lib/cache';
import { EmailCard } from '@/components/EmailCard';
import { EmailDetailView } from '@/components/EmailDetailView';

export default function InboxPage() {
    const { data: session, status } = useSession();
    const router = useRouter();

    // Core state
    const [emails, setEmails] = useState<EmailMetadata[]>([]);
    const [fullEmails, setFullEmails] = useState<Map<string, ProcessedEmail>>(new Map());
    const [analyses, setAnalyses] = useState<Map<string, EmailAnalysis>>(new Map());

    // View state
    const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
    const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Loading state
    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Auth redirect
    useEffect(() => {
        if (status === 'unauthenticated') router.push('/');
    }, [status, router]);

    // Load cached analyses
    useEffect(() => {
        const cached = getAllCachedAnalyses();
        if (cached.size > 0) setAnalyses(cached);
    }, []);

    // Load emails
    useEffect(() => {
        if (status !== 'authenticated') return;

        async function load() {
            setIsLoading(true);
            try {
                const res = await fetch('/api/emails/metadata?count=50');
                const data = await res.json();
                const processed = data.emails.map((e: EmailMetadata & { date: string }) => ({
                    ...e,
                    date: new Date(e.date),
                }));
                setEmails(processed);

                // Pre-analyze first 10
                const first10 = processed.slice(0, 10).map((e: EmailMetadata) => e.id);
                const uncached = getUncachedIds(first10);
                if (uncached.length > 0) await analyzeEmails(uncached);
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [status]);

    // Analyze emails
    const analyzeEmails = useCallback(async (ids: string[]) => {
        if (ids.length === 0) return;
        setIsAnalyzing(true);

        try {
            const bodiesRes = await fetch('/api/emails', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids }),
            });
            const bodiesData = await bodiesRes.json();
            const emailsWithBodies = bodiesData.emails.map((e: ProcessedEmail & { date: string }) => ({
                ...e,
                date: new Date(e.date),
            }));

            setFullEmails((prev) => {
                const next = new Map(prev);
                emailsWithBodies.forEach((e: ProcessedEmail) => next.set(e.id, e));
                return next;
            });

            const analyzeRes = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    emails: emailsWithBodies.map((e: ProcessedEmail) => ({
                        id: e.id,
                        from: e.from,
                        subject: e.subject,
                        body: e.body,
                        snippet: e.snippet,
                    })),
                }),
            });
            const analyzeData = await analyzeRes.json();

            cacheAnalyses(analyzeData.analyses);

            setAnalyses((prev) => {
                const next = new Map(prev);
                analyzeData.analyses.forEach((a: EmailAnalysis) => next.set(a.emailId, a));
                return next;
            });
        } catch (err) {
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    // Get pending emails (not cleared)
    const pendingEmails = emails.filter(e => !clearedIds.has(e.id));

    // Current email (first pending)
    const currentEmail = pendingEmails[0];
    const currentAnalysis = currentEmail ? analyses.get(currentEmail.id) : undefined;
    const currentFullEmail = currentEmail ? fullEmails.get(currentEmail.id) : undefined;

    // Handle clear (swipe or button)
    const handleClear = useCallback(() => {
        if (!currentEmail || isAnimating) return;

        setIsAnimating(true);

        setTimeout(() => {
            setClearedIds(prev => new Set(prev).add(currentEmail.id));
            setIsAnimating(false);

            // Pre-analyze next batch
            const nextEmails = pendingEmails.slice(1, 11);
            const uncached = getUncachedIds(nextEmails.map(e => e.id));
            if (uncached.length > 0) {
                analyzeEmails(uncached);
            }
        }, 250);
    }, [currentEmail, isAnimating, pendingEmails, analyzeEmails]);

    // Handle read (open detail view)
    const handleRead = useCallback(async () => {
        if (!currentEmail) return;

        // Load full email if not loaded
        if (!fullEmails.has(currentEmail.id)) {
            try {
                const res = await fetch('/api/emails', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: [currentEmail.id] }),
                });
                const data = await res.json();
                if (data.emails?.[0]) {
                    setFullEmails((prev) => new Map(prev).set(currentEmail.id, {
                        ...data.emails[0],
                        date: new Date(data.emails[0].date),
                    }));
                }
            } catch (err) {
                console.error(err);
            }
        }

        // Analyze if not analyzed
        if (!analyses.has(currentEmail.id)) {
            await analyzeEmails([currentEmail.id]);
        }

        setSelectedEmailId(currentEmail.id);
    }, [currentEmail, fullEmails, analyses, analyzeEmails]);

    // Handle back from detail view
    const handleBack = useCallback(() => {
        setSelectedEmailId(null);
        // After reading, clear the email
        if (currentEmail) {
            handleClear();
        }
    }, [currentEmail, handleClear]);

    // Generate reply
    const handleGenerateReply = useCallback(async () => {
        if (!currentEmail) return;
        await analyzeEmails([currentEmail.id]);
    }, [currentEmail, analyzeEmails]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedEmailId) return;
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'arrowright':
                case 'd':
                    e.preventDefault();
                    handleClear();
                    break;
                case 'enter':
                case ' ':
                    e.preventDefault();
                    handleRead();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClear, handleRead, selectedEmailId]);

    // Pre-analyze current email
    useEffect(() => {
        if (currentEmail && !analyses.has(currentEmail.id) && !isAnalyzing) {
            analyzeEmails([currentEmail.id]);
        }
    }, [currentEmail, analyses, analyzeEmails, isAnalyzing]);

    // Calculate progress
    const progress = emails.length > 0
        ? ((clearedIds.size / emails.length) * 100).toFixed(0)
        : 0;

    // Loading state
    if (status === 'loading' || isLoading) {
        return (
            <div className="min-h-screen flex flex-col bg-[#FDFCF8] text-stone-800">
                <header className="flex items-center justify-between px-6 py-4 fixed top-0 w-full z-50 bg-[#FDFCF8]/80 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-900">
                        <div className="w-2 h-2 rounded-full bg-stone-900" />
                        <span>Inbox</span>
                    </div>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                    <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
                    <span className="mt-4 text-sm font-medium text-stone-500 animate-pulse">Sincronizando...</span>
                </div>
            </div>
        );
    }

    // Empty state (all cleared)
    if (pendingEmails.length === 0) {
        return (
            <div className="min-h-screen flex flex-col bg-[#FDFCF8]">
                <header className="flex items-center justify-between px-6 py-4 fixed top-0 w-full z-50 bg-[#FDFCF8]/80 backdrop-blur-md">
                    <div className="flex items-center gap-2 text-sm font-semibold tracking-tight text-stone-900">
                        <div className="w-2 h-2 rounded-full bg-stone-900" />
                        <span>Inbox</span>
                    </div>
                    <button
                        className="text-xs font-semibold tracking-wide text-stone-500 hover:text-stone-900 uppercase transition-colors"
                        onClick={() => signOut()}
                    >
                        Sair
                    </button>
                </header>
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-card-in">
                    <div className="text-4xl mb-6 opacity-80">✨</div>
                    <h2 className="text-3xl font-serif font-medium text-stone-900 mb-3 tracking-tight">Tudo limpo por aqui.</h2>
                    <p className="text-stone-500 max-w-xs text-lg leading-relaxed">
                        Você zerou sua caixa de entrada.
                        <br />Aproveite seu dia.
                    </p>
                </div>
            </div>
        );
    }

    // Detail view (when reading an email)
    if (selectedEmailId && currentFullEmail) {
        return (
            <EmailDetailView
                email={currentFullEmail}
                analysis={currentAnalysis}
                onBack={handleBack}
                onGenerateReply={handleGenerateReply}
                isGenerating={isAnalyzing}
            />
        );
    }

    // Main card view
    return (
        <div className="min-h-screen flex flex-col bg-[#FDFCF8] overflow-hidden selection:bg-stone-200">
            {/* Ambient Background */}
            <div className="fixed inset-0 pointer-events-none opacity-40 mix-blend-multiply"
                style={{
                    backgroundImage: 'radial-gradient(circle at 50% 50%, #f5f5f4 0%, transparent 50%), radial-gradient(circle at 100% 0%, #e7e5e4 0%, transparent 30%)'
                }}
            />

            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 md:py-6 fixed top-0 w-full z-50">
                <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-stone-900 bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/50 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-stone-900" />
                    <span>Inbox</span>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-stone-500 bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-stone-200/50 shadow-sm">
                        <span>{clearedIds.size}</span>
                        <div className="w-16 h-1 bg-stone-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-stone-800 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span>{emails.length}</span>
                    </div>

                    <button
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-white/50 backdrop-blur-md border border-stone-200/50 shadow-sm text-stone-500 hover:text-stone-900 hover:bg-white transition-all"
                        onClick={() => signOut()}
                        title="Sair"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                            <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 015.25 2h5.5A2.25 2.25 0 0113 4.25v2a.75.75 0 01-1.5 0v-2a.75.75 0 00-.75-.75h-5.5a.75.75 0 00-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 00.75-.75v-2a.75.75 0 011.5 0v2A2.25 2.25 0 0110.75 18h-5.5A2.25 2.25 0 013 15.75V4.25z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M19 10a.75.75 0 00-.75-.75H8.704l1.048-.943a.75.75 0 10-1.004-1.114l-2.5 2.25a.75.75 0 000 1.114l2.5 2.25a.75.75 0 101.004-1.114l-1.048-.943h9.546A.75.75 0 0019 10z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
                <div className="w-full max-w-[340px] sm:max-w-md relative">
                    {/* Back card effect */}
                    {pendingEmails.length > 1 && (
                        <div className="absolute top-4 left-4 right-4 h-full bg-white rounded-[32px] border border-stone-100 shadow-sm opacity-50 scale-95 origin-bottom -z-10 transition-all duration-300" />
                    )}

                    <EmailCard
                        key={currentEmail.id}
                        email={currentEmail}
                        analysis={currentAnalysis}
                        isAnalyzing={isAnalyzing && !currentAnalysis}
                        onRead={handleRead}
                        onClear={handleClear}
                    />
                </div>

                {/* Subtle Hint */}
                {pendingEmails.length > 1 && (
                    <p className="mt-6 text-[10px] font-bold uppercase tracking-widest text-stone-300 text-center">
                        {pendingEmails.length - 1} restantes
                    </p>
                )}
            </div>
        </div>
    );
}
