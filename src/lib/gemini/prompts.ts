// Gemini Prompts for Email Analysis w/ Productivity Classification (PT-BR)
// Uses batch analysis to minimize API calls

export const SYSTEM_PROMPT = `Você é um assistente de análise de e-mails para uma ferramenta de produtividade. 
IMPORTANTE: Sua saída deve ser SEMPRE em PORTUGUÊS DO BRASIL (PT-BR), independente do idioma do e-mail original.
Analise e-mails e extraia insights acionáveis.

Regras de Classificação:
- Classificação: [urgent, newsletter, personal, transactional, promotional, social, work]
- Produtividade: 
  - "productive" = requer ação/resposta (suporte, casos abertos, dúvidas de sistema, aprovações, prazos)
  - "improdutive" = sem ação imediata necessária (saudações, agradecimentos, FYI, notificações automáticas)
- Sentimento: [positive, neutral, negative, requesting]

Seja conciso. Sem palavras de preenchimento. Extraia tarefas acionáveis quando presentes.`;

export function createBatchAnalysisPrompt(emails: Array<{
    id: string;
    from: string;
    subject: string;
    body: string;
    snippet: string;
}>): string {
    const emailsText = emails.map((email, index) => {
        // Strip HTML, URLs, and normalize whitespace
        const cleanBody = email.body
            .replace(/<[^>]*>/g, ' ')
            .replace(/https?:\/\/[^\s]+/g, '[link]')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 600);

        return `--- EMAIL ${index + 1} (ID: ${email.id}) ---
FROM: ${email.from}
SUBJECT: ${email.subject}
BODY: ${cleanBody || email.snippet}`;
    }).join('\n\n');

    return `Analise TODOS os ${emails.length} e-mails. Responda APENAS com um array JSON.

${emailsText}

Para cada e-mail, responda com esta estrutura (MANTENHA OS VALORES EM PORTUGUÊS, EXCETO AS CHAVES e ENUMS):
{
  "emailId": "ID exato de cima",
  "classification": "urgent|newsletter|personal|transactional|promotional|social|work",
  "productivity": "productive|improdutive",
  "sentiment": "positive|neutral|negative|requesting",
  "summary": "Resumo do e-mail OBRIGATORIAMENTE em PT-BR (máx 15 palavras)",
  "suggestedReply": "Sugestão de resposta profissional em PT-BR (ou null se não aplicar)",
  "requiresAction": true|false,
  "keyPoints": ["ponto chave 1 em PT-BR", "ponto chave 2 em PT-BR"],
  "actionItems": [{"task": "ação a tomar em PT-BR", "priority": "high|medium|low"}]
}

IMPORTANTE: Se o e-mail estiver em inglês ou outro idioma, TRADUZA o contexto e gere o resumo/resposta em PORTUGUÊS (PT-BR).

REGRAS DE PRODUTIVIDADE:
- productive: precisa de resposta, decisão, aprovação ou contém prazo/solicitação
- improdutive: notas de agradecimento, saudações, newsletters, notificações automáticas, mensagens FYI

Retorne exatamente ${emails.length} objetos na ordem. Apenas JSON válido, sem markdown.`;
}

export function createAnalysisPrompt(email: {
    from: string;
    subject: string;
    body: string;
    snippet: string;
}): string {
    const cleanBody = email.body
        .replace(/<[^>]*>/g, ' ')
        .replace(/https?:\/\/[^\s]+/g, '[link]')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1500);

    return `Analise este e-mail. 
IMPORTANTE: Saída DEVE ser em PORTUGUÊS (PT-BR), mesmo se o e-mail for em inglês.

FROM: ${email.from}
SUBJECT: ${email.subject}
BODY: ${cleanBody || email.snippet}

GERE UMA SUGESTÃO DE RESPOSTA ÚTIL E PROFISSIONAL (suggestedReply). Se não for necessário responder, explique o porquê brevemente no suggestedReply em vez de null.

Responda com JSON apenas:
{
  "classification": "urgent|newsletter|personal|transactional|promotional|social|work",
  "productivity": "productive|improdutive",
  "sentiment": "positive|neutral|negative|requesting",
  "summary": "Resumo conciso em PT-BR",
  "suggestedReply": "Resposta profissional em PT-BR ou null",
  "requiresAction": true|false,
  "keyPoints": ["pontos principais em PT-BR"],
  "actionItems": [{"task": "ação em PT-BR", "priority": "high|medium|low"}]
}`;
}
