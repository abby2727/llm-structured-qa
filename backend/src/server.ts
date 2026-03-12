import express from 'express';
import cors from 'cors';
import { loadEnv } from './env';
import { askStructured } from './ask-core';

loadEnv();

const app = express();

const allowedOrigins = process.env.CORS_ORIGIN
	? process.env.CORS_ORIGIN.split(',')
	: ['http://localhost:3000'];

app.use(
	cors({
		origin: allowedOrigins,
		methods: ['POST', 'GET', 'OPTIONS', 'DELETE'],
		allowedHeaders: ['Content-Type', 'Authorization'],
		credentials: false
	})
);

app.use(express.json());

app.post('/ask', async (req, res) => {
	try {
		const { query } = req.body ?? {};

		if (!query || !String(query).trim()) {
			return res.status(400).json({ error: "Field 'query' is required" });
		}

		const out = await askStructured(query);

		return res.status(200).json(out);
	} catch (err: any) {
		console.error('Ask error:', err?.message ?? err);
		return res.status(500).json({
			error: 'Failed to answer'
		});
	}
});

const PORT = process.env.PORT ?? 3002;

app.listen(PORT, () => {
	console.log(`api is listening to port ${PORT}`);
});
