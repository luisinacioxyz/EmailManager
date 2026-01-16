// Gemini Analysis Types

export type EmailClassification =
    | 'urgent'
    | 'newsletter'
    | 'personal'
    | 'transactional'
    | 'promotional'
    | 'social'
    | 'work';

export type EmailSentiment =
    | 'positive'
    | 'neutral'
    | 'negative'
    | 'requesting';

export type ProductivityType = 'productive' | 'improdutive';

export interface ActionItem {
    task: string;
    priority: 'high' | 'medium' | 'low';
    dueDate?: string;
}

export interface EmailAnalysis {
    emailId: string;
    classification: EmailClassification;
    productivity: ProductivityType;
    sentiment: EmailSentiment;
    summary: string;
    suggestedReply: string | null;
    requiresAction: boolean;
    keyPoints: string[];
    actionItems: ActionItem[];
}
