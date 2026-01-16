'use client';

import { useState, useEffect } from 'react';
import type { ProcessedEmail } from '@/lib/gmail/types';
import type { EmailAnalysis } from '@/lib/gemini/types';
import { ArrowLeft, Copy, Check, Sparkle, PaperPlaneRight } from '@phosphor-icons/react';

interface EmailDetailViewProps {
    email: ProcessedEmail;
    analysis?: EmailAnalysis;
    onBack: () => void;
    onGenerateReply: () => void;
    isGenerating: boolean;
}

export function EmailDetailView({
    email,
    analysis,
    onBack,
    onGenerateReply,
    isGenerating,
}: EmailDetailViewProps) {
    const [copied, setCopied] = useState(false);

    // Handle escape key to go back
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onBack();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onBack]);

    const handleCopyReply = async () => {
        if (analysis?.suggestedReply) {
            await navigator.clipboard.writeText(analysis.suggestedReply);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
    };

    return (
        <div className="fixed inset-0 bg-[#FDFCF8] z-50 flex flex-col animate-slide-up overflow-hidden">
            {/* Header - Floating minimalist */}
            <div className="absolute top-0 left-0 right-0 p-6 z-10 flex items-center justify-between pointer-events-none">
                <button
                    className="pointer-events-auto w-10 h-10 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full border border-stone-200 shadow-sm text-stone-600 hover:text-stone-900 hover:scale-105 transition-all"
                    onClick={onBack}
                    title="Voltar (Esc)"
                >
                    <ArrowLeft size={20} weight="bold" />
                </button>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto w-full">
                <div className="min-h-full max-w-3xl mx-auto bg-white shadow-2xl shadow-stone-200/50 min-h-[100vh]">

                    {/* Hero Section */}
                    <div className="px-8 pt-24 pb-12 border-b border-stone-100 bg-stone-50/30">
                        <h1 className="text-3xl md:text-4xl font-serif font-medium text-stone-900 leading-[1.2] mb-8 tracking-tight">
                            {email.subject}
                        </h1>

                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-lg">
                                {getInitials(email.from)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-stone-900">{email.from}</div>
                                <div className="text-sm text-stone-500">{email.fromEmail}</div>
                            </div>
                            <div className="text-sm font-medium text-stone-400">
                                {formatDate(email.date)}
                            </div>
                        </div>
                    </div>

                    {/* Email Body */}
                    <div className="px-8 py-12">
                        <div
                            className="prose prose-stone prose-lg max-w-none leading-relaxed text-stone-700"
                            dangerouslySetInnerHTML={{ __html: email.body || email.snippet }}
                        />
                    </div>

                    {/* AI Reply Section - Integrated */}
                    <div className="px-8 pb-12">
                        <div className="bg-stone-50 rounded-2xl p-8 border border-stone-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <Sparkle size={16} weight="fill" />
                                </div>
                                <span className="font-bold text-stone-900">Sugestão de Resposta</span>
                            </div>

                            {analysis?.suggestedReply ? (
                                <div className="space-y-6">
                                    <div className="relative">
                                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-blue-500 rounded-full" />
                                        <p className="pl-6 text-stone-600 italic leading-relaxed text-lg">
                                            "{analysis.suggestedReply}"
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 text-white rounded-full font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
                                            onClick={handleCopyReply}
                                        >
                                            {copied ? <Check size={18} weight="bold" /> : <Copy size={18} weight="bold" />}
                                            <span>{copied ? 'Copiado' : 'Copiar texto'}</span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-400 font-medium hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2 group"
                                    onClick={onGenerateReply}
                                    disabled={isGenerating}
                                >
                                    {isGenerating ? (
                                        <>
                                            <div className="w-6 h-6 border-2 border-stone-200 border-t-blue-500 rounded-full animate-spin" />
                                            <span className="text-stone-500">Escrevendo rascunho...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkle size={24} className="text-stone-300 group-hover:text-blue-500 transition-colors" />
                                            <span>Gerar rascunho de resposta com IA</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
