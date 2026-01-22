'use server';

export interface AIRecommendationResult {
    success: boolean;
    data?: string; // Markdown content
    error?: string;
}

export async function generateProjectRecommendations(projectKey: string): Promise<AIRecommendationResult> {
    try {
        // Default to local n8n instance if not configured
        // In a real setup, this should be in process.env.N8N_WEBHOOK_URL
        const n8nUrl = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/generate-project-recommendations';
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

        console.log(`Calling n8n webhook: ${n8nUrl} for project ${projectKey}`);

        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                projectKey,
                // Pass the backend URL so n8n knows where to call back.
                // If running in Docker, this might need to be host.docker.internal
                backendUrl: backendUrl
            }),
            // Set a timeout since AI generation might take a bit
            signal: AbortSignal.timeout(60000) 
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`n8n Error ${response.status}: ${text}`);
        }

        // n8n should return the raw markdown or a JSON with "message"
        const text = await response.text();
        if (!text) {
             throw new Error('Empty response from n8n');
        }

        let data = '';
        try {
            const json = JSON.parse(text);
            // Try to find the content in various common n8n/OpenAI structures
            data = json.message?.content || json.message || json.output || json.content || (json.choices && json.choices[0]?.message?.content) || (typeof json === 'string' ? json : JSON.stringify(json));
        } catch (e) {
            // Not JSON, use text directly
            data = text;
        }

        return { success: true, data };

    } catch (error: any) {
        console.error('AI Recommendation Error:', error);
        return { 
            success: false, 
            error: error.message || 'Failed to generate recommendations' 
        };
    }
}
