import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const client = new OpenAI({
  baseURL: process.env.HF_BASE_URL,
  apiKey: process.env.HF_TOKEN,
});

const clientIAConfig = {
  model: "moonshotai/Kimi-K2-Instruct-0905",
  role: "user",
  temperature: 0.7,
  max_tokens: 300
}

export async function generateByPrompt(prompt) {
  try {
    const completion = await client.chat.completions.create({
      model: clientIAConfig.model,
      messages: [
        {
          role: clientIAConfig.role,
          content: prompt,
        },
      ],
      temperature: clientIAConfig.temperature,
      max_tokens: clientIAConfig.max_tokens,
    });

    return completion.choices[0]?.message?.content || "Desculpe, não entendi";
  } catch (err) {
    return "Ops, algo deu errado ao falar com a IA";
  }
}