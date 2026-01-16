import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailClient } from '@/lib/gmail/client';

// GET - fetch emails (original behavior or by specific IDs)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const gmail = new GmailClient(session.accessToken);
        const emails = await gmail.getEmails(10);

        return NextResponse.json({ emails });
    } catch (error) {
        console.error('Failed to fetch emails:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}

// POST - fetch full email bodies for specific IDs
export async function POST(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { ids } = await request.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json(
                { error: 'Invalid request: ids array required' },
                { status: 400 }
            );
        }

        // Limit to 20 emails per batch to avoid timeouts
        const limitedIds = ids.slice(0, 20);

        const gmail = new GmailClient(session.accessToken);
        const emails = await gmail.getEmailsByIds(limitedIds);

        return NextResponse.json({ emails });
    } catch (error) {
        console.error('Failed to fetch emails by IDs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
