import { createChatModel } from './lc-model';
import { AskResult, AskResultSchema } from './schema';

export async function askStructured(query: string): Promise<AskResult> {
	const model = createChatModel();

	const system =
		'You are a concise assistant. Return only valid JSON. No markdown, no code blocks.';

	const user =
		`Summarize for a beginner:\n` +
		`"${query}"\n` +
		`Return a JSON object with exactly: summary (string, short paragraph), confidence (number 0 to 1)`;

	const response = await model.invoke(
		[
			{ role: 'system', content: system },
			{ role: 'user', content: user }
		],
		{ response_format: { type: 'json_object' } }
	);

	const text = typeof response.content === 'string' ? response.content : '';

	// Strip markdown code blocks if present
	const raw = text
		.replace(/^```(?:json)?\s*/i, '')
		.replace(/\s*```$/i, '')
		.trim();
	const parsed = JSON.parse(raw || '{}');
	const result = AskResultSchema.parse(parsed);

	return result;
}
