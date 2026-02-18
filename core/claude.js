import Anthropic from '@anthropic-ai/sdk';
import 'dotenv/config';

const client = new Anthropic({
	apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function askClaude({ agentName, systemPrompt, userMessage, maxTokens = 1024 }) {
	try {
		const response = await client.messages.create({
			model: 'claude-sonnet-4-6',
			max_tokens: maxTokens,
			system: systemPrompt,
			messages: [
				{
					role: 'user',
					content: userMessage,
				},
			],
		});

		const text = response.content[0].text;
		console.log(`[${agentName}] Claude responded successfully`);
		return text;

	} catch (error) {
		console.error(`[${agentName}] Claude API error:`, error.message);
		throw error;
	}
}
