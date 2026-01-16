// Gmail API Types

export interface GmailMessage {
    id: string;
    threadId: string;
}

export interface GmailMessageList {
    messages: GmailMessage[];
    nextPageToken?: string;
    resultSizeEstimate: number;
}

export interface GmailHeader {
    name: string;
    value: string;
}

export interface GmailMessagePart {
    partId: string;
    mimeType: string;
    filename: string;
    headers: GmailHeader[];
    body: {
        size: number;
        data?: string;
        attachmentId?: string;
    };
    parts?: GmailMessagePart[];
}

export interface GmailFullMessage {
    id: string;
    threadId: string;
    labelIds: string[];
    snippet: string;
    payload: GmailMessagePart;
    sizeEstimate: number;
    historyId: string;
    internalDate: string;
}

// Processed email for our app
export interface ProcessedEmail {
    id: string;
    threadId: string;
    from: string;
    fromEmail: string;
    to: string;
    subject: string;
    snippet: string;
    date: Date;
    body: string;
    labels: string[];
}

// Lightweight email metadata (no body) for fast loading
export interface EmailMetadata {
    id: string;
    threadId: string;
    from: string;
    fromEmail: string;
    subject: string;
    snippet: string;
    date: Date;
    labels: string[];
    hasAnalysis?: boolean;
}
