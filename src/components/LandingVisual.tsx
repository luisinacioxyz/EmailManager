'use client';

import { Check, BookOpen } from '@phosphor-icons/react';

export function LandingVisual() {
    return (
        <div className="relative w-[340px] h-[440px] sm:w-[380px] sm:h-[500px]">
            {/* Glow effect */}
            <div
                className="absolute inset-0 blur-3xl opacity-40 -z-10"
                style={{
                    background: 'radial-gradient(circle at center, rgba(37, 99, 235, 0.2) 0%, transparent 60%)',
                }}
            />

            {/* Card container - extra padding for badges */}
            <div className="absolute inset-x-4 inset-y-0">

                {/* Back card (preview of next) */}
                <div className="absolute top-8 inset-x-0 bg-white rounded-2xl p-5 shadow-sm border border-slate-200 scale-[0.92] opacity-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            N
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-slate-900">Notion</span>
                            <span className="text-xs text-slate-400">14:20</span>
                        </div>
                    </div>
                </div>

                {/* Front card with sway animation */}
                <div className="visual-card-sway absolute top-0 inset-x-0 bg-white rounded-2xl p-5 shadow-xl border border-slate-200 origin-bottom">

                    {/* Swipe badge - Clear */}
                    <div className="swipe-badge right absolute top-6 -left-2 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 text-white bg-slate-500 opacity-0 z-10 shadow-lg">
                        <Check weight="bold" size={14} />
                        <span>Limpar</span>
                    </div>

                    {/* Swipe badge - Read */}
                    <div className="swipe-badge left absolute top-6 -right-2 py-1.5 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 text-white bg-blue-600 opacity-0 z-10 shadow-lg flex-row-reverse">
                        <span>Ler</span>
                        <BookOpen weight="bold" size={14} />
                    </div>

                    {/* Card header */}
                    <div className="mb-5">
                        {/* Tag */}
                        <div className="mb-4">
                            <span className="inline-flex text-xs font-bold uppercase py-1 px-2 rounded bg-red-50 text-red-600">
                                🔴 Urgente
                            </span>
                        </div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-slate-900 leading-snug mb-4">
                            Aprovação Necessária: Orçamento
                        </h3>

                        {/* Sender */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                                SC
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-semibold text-slate-900">Sarah Chen</span>
                                <span className="text-xs text-slate-400">sarah@company.com</span>
                            </div>
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="bg-slate-50 rounded-xl p-4">
                        <div className="text-xs font-bold uppercase text-slate-500 mb-2 flex items-center gap-1.5">
                            <span>✨</span>
                            <span>Resumo IA</span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
                            Aprovação necessária até sexta-feira para os gastos de marketing.
                        </p>
                    </div>
                </div>

                {/* Gesture cursor hint */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-20">
                    <div className="gesture-cursor-dot w-5 h-5 bg-slate-900/10 border-2 border-slate-900/20 rounded-full" />
                </div>
            </div>
        </div>
    );
}