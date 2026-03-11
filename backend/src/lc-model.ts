import { ChatGroq } from '@langchain/groq';
import { loadEnv } from './env';

export function createChatModel() {
	loadEnv();

	return new ChatGroq({
		model: 'llama-3.3-70b-versatile',
		temperature: 0
	});
}
