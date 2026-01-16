'use client';

import { useState } from 'react';
import type { EmailMetadata } from '@/lib/gmail/types';
import type { EmailAnalysis } from '@/lib/gemini/types';
import { Check, BookOpen, ArrowRight, X } from '@phosphor-icons/react';

interface EmailCardProps {
    email: EmailMetadata;
    analysis?: EmailAnalysis;
    isAnalyzing: boolean;
    onRead: () => void;
    onClear: () => void;
}

function formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
        const mins = Math.floor(diff / (1000 * 60));
        return `${mins}m`;
    } else if (hours < 24) {
        return `${hours}h`;
    } else {
        return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    }
}

function getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

// Minimalist pastel colors
const classificationStyles: Record<string, { bg: string; text: string; label: string; border: string }> = {
    urgent: { bg: 'bg-red-50/50', text: 'text-red-700', border: 'border-red-100', label: 'Urgente' },
    work: { bg: 'bg-blue-50/50', text: 'text-blue-700', border: 'border-blue-100', label: 'Trabalho' },
    personal: { bg: 'bg-purple-50/50', text: 'text-purple-700', border: 'border-purple-100', label: 'Pessoal' },
    newsletter: { bg: 'bg-stone-50', text: 'text-stone-600', border: 'border-stone-100', label: 'News' },
    transactional: { bg: 'bg-emerald-50/50', text: 'text-emerald-700', border: 'border-emerald-100', label: 'Transação' },
    promotional: { bg: 'bg-orange-50/50', text: 'text-orange-700', border: 'border-orange-100', label: 'Promo' },
    social: { bg: 'bg-pink-50/50', text: 'text-pink-700', border: 'border-pink-100', label: 'Social' },
};

export function EmailCard({ email, analysis, isAnalyzing, onRead, onClear }: EmailCardProps) {
    const [swipeX, setSwipeX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [startX, setStartX] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isSwiping) return;
        const diff = startX - e.touches[0].clientX;
        setSwipeX(diff); // Allow swiping both ways visually
    };

    const handleTouchEnd = () => {
        if (swipeX > 100) onClear(); // Swipe left to clear
        if (swipeX < -100) onRead(); // Swipe right to read (optional)

        setIsSwiping(false);
        setSwipeX(0);
    };

    const classStyle = analysis ? classificationStyles[analysis.classification] || classificationStyles.newsletter : null;

    return (
        <div
            className="w-full bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 overflow-hidden relative touch-pan-y h-[520px] sm:h-[600px] flex flex-col transform transition-transform duration-300 ease-out will-change-transform select-none"
            style={{
                transform: `translateX(${-swipeX}px) rotate(${-swipeX * 0.03}deg)`,
                opacity: 1 - Math.abs(swipeX) / 500
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Swipe Actions Indicators (Behind) */}
            <div className="absolute inset-y-0 right-0 w-1/2 bg-stone-100/50 flex items-center justify-end px-8 opacity-0 transition-opacity" style={{ opacity: swipeX > 20 ? swipeX / 150 : 0 }}>
                <X size={32} weight="bold" className="text-stone-400" />
            </div>
            <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-50/50 flex items-center justify-start px-8 opacity-0 transition-opacity" style={{ opacity: swipeX < -20 ? -swipeX / 150 : 0 }}>
                <BookOpen size={32} weight="bold" className="text-blue-400" />
            </div>


            {/* Content Container */}
            <div className="flex-1 flex flex-col p-8 relative bg-white z-10">

                {/* Meta Header */}
                <div className="flex items-start justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-600 text-sm font-bold border border-stone-200">
                            {getInitials(email.from)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-stone-900 leading-none mb-1">{email.from}</span>
                            <span className="text-xs font-medium text-stone-400">{formatTime(email.date)}</span>
                        </div>
                    </div>

                    {analysis && (
                        <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${classStyle?.bg} ${classStyle?.text} ${classStyle?.border}`}>
                                {classStyle?.label}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${analysis.productivity === 'productive'
                                    ? 'text-emerald-600 bg-emerald-50'
                                    : 'text-stone-400 bg-stone-100'
                                }`}>
                                {analysis.productivity === 'productive' ? '✓ Produtivo' : 'Improdutivo'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Main Typography */}
                <div className="flex-1 flex flex-col justify-center mb-6">
                    <h1 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 leading-tight mb-4 tracking-tight line-clamp-3">
                        {email.subject}
                    </h1>

                    {isAnalyzing ? (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-4 bg-stone-100 rounded w-full" />
                            <div className="h-4 bg-stone-100 rounded w-5/6" />
                            <div className="h-4 bg-stone-100 rounded w-4/6" />
                        </div>
                    ) : analysis ? (
                        <div className="space-y-4">
                            <p className="text-base text-stone-600 leading-relaxed font-sans line-clamp-6">
                                {analysis.summary}
                            </p>

                            {analysis.keyPoints.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    {analysis.keyPoints.slice(0, 2).map((point, idx) => (
                                        <div key={idx} className="flex gap-2.5 text-sm text-stone-500 items-start">
                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                            <span className="leading-relaxed line-clamp-2">{point}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-base text-stone-500 leading-relaxed font-sans line-clamp-6">
                            {email.snippet}
                        </p>
                    )}
                </div>

                {/* Floating Action Bar (Bottom) */}
                <div className="flex items-center justify-between pt-4 mt-auto gap-4">
                    <button
                        onClick={onClear}
                        className="w-12 h-12 flex items-center justify-center rounded-full text-stone-400 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 border border-transparent hover:border-red-100"
                        title="Ignorar"
                    >
                        <X size={24} weight="bold" />
                    </button>

                    <div className="hidden sm:block h-1 w-1 rounded-full bg-stone-200" />

                    <button
                        onClick={onRead}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-stone-900 text-white rounded-full hover:bg-stone-800 active:scale-95 transition-all shadow-lg shadow-stone-200"
                    >
                        <span className="text-sm font-bold tracking-wide">Ler Email</span>
                        <ArrowRight size={16} weight="bold" />
                    </button>
                </div>
            </div>
        </div>
    );
}
