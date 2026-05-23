import OpenAI from "openai";

export const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o";
