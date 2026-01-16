import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { GmailClient } from '@/lib/gmail/client';

export async function GET(request: NextRequest) {
    try {
        const session = await auth();

        if (!session?.accessToken) {
            return NextResponse.json(
                { error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const count = parseInt(searchParams.get('count') || '100', 10);
        const afterDateStr = searchParams.get('after');

        let afterDate: Date | undefined;
        if (afterDateStr) {
            afterDate = new Date(afterDateStr);
        }

        const gmail = new GmailClient(session.accessToken);
        const emails = await gmail.getEmailsMetadata(count, afterDate);

        return NextResponse.json({ emails });
    } catch (error) {
        console.error('Failed to fetch email metadata:', error);
        return NextResponse.json(
            { error: 'Failed to fetch emails' },
            { status: 500 }
        );
    }
}
