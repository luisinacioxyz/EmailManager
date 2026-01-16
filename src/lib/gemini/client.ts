import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, createBatchAnalysisPrompt, createAnalysisPrompt } from './prompts';
import type { EmailAnalysis, EmailClassification, EmailSentiment, ProductivityType, ActionItem } from './types';

/**
 * Gemini Client with Batch Analysis and Productivity Classification
 */
export class GeminiClient {
    private genAI: GoogleGenerativeAI;
    private model;

    constructor(apiKey: string) {
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-lite',
            systemInstruction: SYSTEM_PROMPT,
        });
    }

    async analyzeEmails(emails: Array<{
        id: string;
        from: string;
        subject: string;
        body: string;
        snippet: string;
    }>): Promise<EmailAnalysis[]> {
        if (emails.length === 0) return [];

        // If single email, use focused analysis
        if (emails.length === 1) {
            const singleAnalysis = await this.analyzeEmail(emails[0]);
            return [singleAnalysis];
        }

        try {
            const prompt = createBatchAnalysisPrompt(emails);
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();

            const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed)) throw new Error('Response is not an array');

            return parsed.map((item: Record<string, unknown>) => ({
                emailId: String(item.emailId || ''),
                classification: this.validateClassification(String(item.classification || '')),
                productivity: this.validateProductivity(String(item.productivity || '')),
                sentiment: this.validateSentiment(String(item.sentiment || '')),
                summary: String(item.summary || 'Unable to summarize.'),
                suggestedReply: item.suggestedReply ? String(item.suggestedReply) : null,
                requiresAction: Boolean(item.requiresAction),
                keyPoints: Array.isArray(item.keyPoints) ? (item.keyPoints as string[]).slice(0, 3).map(String) : [],
                actionItems: this.validateActionItems(item.actionItems),
            }));
        } catch (error) {
            console.error('Batch analysis failed:', error);
            return emails.map((email) => this.createFallbackAnalysis(email.id));
        }
    }

    async analyzeEmail(email: {
        id: string;
        from: string;
        subject: string;
        body: string;
        snippet: string;
    }): Promise<EmailAnalysis> {
        try {
            const prompt = createAnalysisPrompt(email);
            const result = await this.model.generateContent(prompt);
            const response = result.response.text();
            const jsonStr = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const parsed = JSON.parse(jsonStr);

            return {
                emailId: email.id,
                classification: this.validateClassification(parsed.classification),
                productivity: this.validateProductivity(parsed.productivity),
                sentiment: this.validateSentiment(parsed.sentiment),
                summary: parsed.summary || 'Unable to summarize.',
                suggestedReply: parsed.suggestedReply || null,
                requiresAction: Boolean(parsed.requiresAction),
                keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
                actionItems: this.validateActionItems(parsed.actionItems),
            };
        } catch (error) {
            console.error(`Failed to analyze email ${email.id}:`, error);
            return this.createFallbackAnalysis(email.id);
        }
    }

    private createFallbackAnalysis(emailId: string): EmailAnalysis {
        return {
            emailId,
            classification: 'personal',
            productivity: 'improdutive',
            sentiment: 'neutral',
            summary: 'Analysis unavailable.',
            suggestedReply: null,
            requiresAction: false,
            keyPoints: [],
            actionItems: [],
        };
    }

    private validateClassification(value: string): EmailClassification {
        const valid: EmailClassification[] = ['urgent', 'newsletter', 'personal', 'transactional', 'promotional', 'social', 'work'];
        return valid.includes(value as EmailClassification) ? (value as EmailClassification) : 'personal';
    }

    private validateProductivity(value: string): ProductivityType {
        return value === 'productive' ? 'productive' : 'improdutive';
    }

    private validateSentiment(value: string): EmailSentiment {
        const valid: EmailSentiment[] = ['positive', 'neutral', 'negative', 'requesting'];
        return valid.includes(value as EmailSentiment) ? (value as EmailSentiment) : 'neutral';
    }

    private validateActionItems(items: unknown): ActionItem[] {
        if (!Array.isArray(items)) return [];
        return items.slice(0, 5).map((item: Record<string, unknown>) => ({
            task: String(item.task || 'Task'),
            priority: ['high', 'medium', 'low'].includes(String(item.priority))
                ? (item.priority as 'high' | 'medium' | 'low')
                : 'medium',
            dueDate: item.dueDate ? String(item.dueDate) : undefined,
        }));
    }
}
