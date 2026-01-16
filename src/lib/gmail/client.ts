import axios from 'axios';
import type { GmailMessageList, GmailFullMessage, GmailMessagePart, ProcessedEmail, EmailMetadata } from './types';

/**
 * Decodes base64url encoded string (Gmail's encoding)
 */
function decodeBase64Url(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(base64, 'base64').toString('utf-8');
    }
    return decodeURIComponent(
        atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
}

function getHtmlFromParts(parts: GmailMessagePart[]): string | null {
    const htmlPart = parts.find((part) => part.mimeType === 'text/html');
    if (htmlPart?.body?.data) return decodeBase64Url(htmlPart.body.data);
    const textPart = parts.find((part) => part.mimeType === 'text/plain');
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    return null;
}

function extractBody(payload: GmailMessagePart): string {
    if (payload.body?.data) return decodeBase64Url(payload.body.data);
    if (!payload.parts) return '';

    const mimeType = payload.mimeType;
    if (mimeType === 'multipart/alternative') return getHtmlFromParts(payload.parts) || '';

    if (mimeType === 'multipart/related') {
        const firstPart = payload.parts[0];
        if (firstPart?.parts) return getHtmlFromParts(firstPart.parts) || '';
        if (firstPart?.body?.data) return decodeBase64Url(firstPart.body.data);
    }

    if (mimeType === 'multipart/mixed') {
        const firstPart = payload.parts[0];
        if (firstPart?.mimeType === 'multipart/related' && firstPart.parts?.[0]?.parts) {
            return getHtmlFromParts(firstPart.parts[0].parts) || '';
        }
        if (firstPart?.mimeType === 'multipart/alternative' && firstPart.parts) {
            return getHtmlFromParts(firstPart.parts) || '';
        }
        if (firstPart?.parts) return getHtmlFromParts(firstPart.parts) || '';
        if (firstPart?.body?.data) return decodeBase64Url(firstPart.body.data);
    }

    for (const part of payload.parts) {
        if (part.parts) {
            const nested = extractBody(part);
            if (nested) return nested;
        }
    }
    return '';
}

function getHeader(headers: { name: string; value: string }[], name: string): string {
    const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
    return header?.value || '';
}

function parseFrom(from: string): { name: string; email: string } {
    const match = from.match(/^(?:"?([^"<]*)"?\s*)?<?([^>]+@[^>]+)>?$/);
    if (match) return { name: match[1]?.trim() || match[2], email: match[2] };
    return { name: from, email: from };
}

/**
 * Gmail API Client with Batch Support
 * Uses Gmail's batch endpoint to avoid rate limiting
 */
export class GmailClient {
    private accessToken: string;
    private baseUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';
    private batchUrl = 'https://gmail.googleapis.com/batch/gmail/v1';

    constructor(accessToken: string) {
        this.accessToken = accessToken;
    }

    private get headers() {
        return {
            Authorization: `Bearer ${this.accessToken}`,
            Accept: 'application/json',
        };
    }

    /**
     * Fetches list of message IDs with optional query
     */
    async listMessages(maxResults: number = 10, query?: string): Promise<GmailMessageList> {
        const response = await axios.get<GmailMessageList>(
            `${this.baseUrl}/messages`,
            {
                headers: this.headers,
                params: { maxResults, ...(query && { q: query }) },
            }
        );
        return response.data;
    }

    /**
     * Batch fetch multiple messages in a single HTTP request
     * Gmail batch API allows up to 100 requests per batch
     */
    private async batchGetMessages(
        messageIds: string[],
        format: 'full' | 'metadata' = 'full'
    ): Promise<GmailFullMessage[]> {
        if (messageIds.length === 0) return [];

        // Build multipart batch request body
        const boundary = `batch_${Date.now()}`;
        const metadataHeaders = format === 'metadata' ? '&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date' : '';

        const parts = messageIds.map((id, index) => {
            return [
                `--${boundary}`,
                'Content-Type: application/http',
                `Content-ID: <item${index}>`,
                '',
                `GET /gmail/v1/users/me/messages/${id}?format=${format}${metadataHeaders}`,
                '',
            ].join('\r\n');
        });

        const body = parts.join('\r\n') + `\r\n--${boundary}--`;

        try {
            const response = await axios.post(this.batchUrl, body, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                    'Content-Type': `multipart/mixed; boundary=${boundary}`,
                },
                // Return raw text so we can parse multipart response
                transformResponse: [(data) => data],
            });

            // Parse multipart response
            return this.parseBatchResponse(response.data);
        } catch (error) {
            console.error('Batch request failed:', error);
            return [];
        }
    }

    /**
     * Parse multipart batch response into individual message objects
     */
    private parseBatchResponse(responseText: string): GmailFullMessage[] {
        const messages: GmailFullMessage[] = [];

        // Extract boundary from response
        const boundaryMatch = responseText.match(/--batch_[^\r\n]+/);
        if (!boundaryMatch) return messages;

        const boundary = boundaryMatch[0];
        const parts = responseText.split(boundary);

        for (const part of parts) {
            // Skip empty parts and closing boundary
            if (!part.trim() || part.trim() === '--') continue;

            // Find JSON in the response part (after HTTP headers)
            const jsonStart = part.indexOf('{');
            const jsonEnd = part.lastIndexOf('}');

            if (jsonStart !== -1 && jsonEnd !== -1) {
                try {
                    const jsonStr = part.slice(jsonStart, jsonEnd + 1);
                    const message = JSON.parse(jsonStr) as GmailFullMessage;
                    if (message.id) {
                        messages.push(message);
                    }
                } catch {
                    // Skip malformed parts
                }
            }
        }

        return messages;
    }

    /**
     * Fetches metadata for emails using batch API (fast, no rate limits)
     */
    async getEmailsMetadata(count: number = 50, afterDate?: Date): Promise<EmailMetadata[]> {
        // Limit to 50 for reasonable performance
        const safeCount = Math.min(count, 50);

        let query: string | undefined;
        if (afterDate) {
            const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
            query = `after:${dateStr}`;
        }

        const messageList = await this.listMessages(safeCount, query);
        if (!messageList.messages?.length) return [];

        // Batch fetch all messages in one request
        const ids = messageList.messages.map((m) => m.id);
        const batchMessages = await this.batchGetMessages(ids, 'metadata');

        return batchMessages.map((msg) => this.processMessageMetadata(msg));
    }

    /**
     * Fetches full emails for specific IDs using batch API
     */
    async getEmailsByIds(ids: string[]): Promise<ProcessedEmail[]> {
        if (ids.length === 0) return [];

        // Process in batches of 20 to avoid timeouts
        const batchSize = 20;
        const results: ProcessedEmail[] = [];

        for (let i = 0; i < ids.length; i += batchSize) {
            const batchIds = ids.slice(i, i + batchSize);
            const batchMessages = await this.batchGetMessages(batchIds, 'full');
            results.push(...batchMessages.map((msg) => this.processMessage(msg)));

            // Small delay between batches
            if (i + batchSize < ids.length) {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Legacy method for backwards compatibility
     */
    async getEmails(count: number = 10): Promise<ProcessedEmail[]> {
        const messageList = await this.listMessages(count);
        if (!messageList.messages?.length) return [];

        const ids = messageList.messages.map((m) => m.id);
        return this.getEmailsByIds(ids);
    }

    private processMessageMetadata(message: GmailFullMessage): EmailMetadata {
        const headers = message.payload?.headers || [];
        const fromRaw = getHeader(headers, 'From');
        const { name: from, email: fromEmail } = parseFrom(fromRaw);

        return {
            id: message.id,
            threadId: message.threadId,
            from,
            fromEmail,
            subject: getHeader(headers, 'Subject') || '(No Subject)',
            snippet: message.snippet || '',
            date: new Date(parseInt(message.internalDate)),
            labels: message.labelIds || [],
        };
    }

    private processMessage(message: GmailFullMessage): ProcessedEmail {
        const headers = message.payload?.headers || [];
        const fromRaw = getHeader(headers, 'From');
        const { name: from, email: fromEmail } = parseFrom(fromRaw);

        return {
            id: message.id,
            threadId: message.threadId,
            from,
            fromEmail,
            to: getHeader(headers, 'To'),
            subject: getHeader(headers, 'Subject') || '(No Subject)',
            snippet: message.snippet || '',
            date: new Date(parseInt(message.internalDate)),
            body: message.payload ? extractBody(message.payload) : '',
            labels: message.labelIds || [],
        };
    }
}
