import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GeminiClient } from '@/lib/gemini/client';

export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { emails } = await request.json();

        if (!emails || !Array.isArray(emails)) {
            return NextResponse.json(
                { error: 'Invalid request body' },
                { status: 400 }
            );
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        if (!geminiKey) {
            return NextResponse.json(
                { error: 'Gemini API key not configured' },
                { status: 500 }
            );
        }

        const gemini = new GeminiClient(geminiKey);
        const analyses = await gemini.analyzeEmails(emails);

        return NextResponse.json({ analyses });
    } catch (error) {
        console.error('Failed to analyze emails:', error);
        return NextResponse.json(
            { error: 'Failed to analyze emails' },
            { status: 500 }
        );
    }
}
