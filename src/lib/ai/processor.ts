import type { ChatCompletion } from "openai/resources/chat/completions";
import type { ZodIssue } from "zod/v4";
import { openaiClient, DEFAULT_MODEL } from "./client";
import { buildProductProcessingPrompt } from "./prompts";
import { AIProcessingOutputSchema } from "@/types/ai";
import type {
  AIProcessingOutput,
  AIProcessingMeta,
  ProcessedProductData,
} from "@/types/ai";
import type { CrawledProductData } from "@/types/crawler";

export class AIProcessor {
  async processProduct(
    input: CrawledProductData,
    categoriesList: string[]
  ): Promise<ProcessedProductData> {
    const { systemPrompt, userPrompt } = buildProductProcessingPrompt(
      input,
      categoriesList
    );

    const startTime = Date.now();

    const response = await openaiClient.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 2048,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const durationMs = Date.now() - startTime;
    const content = response.choices[0]?.message?.content ?? "";
    const parsed: unknown = JSON.parse(content);

    const validation = AIProcessingOutputSchema.safeParse(parsed);

    if (validation.success) {
      return this.buildResult(validation.data, response, durationMs);
    }

    // یک بار retry با پیام تصحیح
    const errorSummary = validation.error.issues
      .map((i) => `${i.path.map(String).join(".")}: ${i.message}`)
      .join("; ");

    const retryResponse = await openaiClient.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: "json_object" },
      max_tokens: 2048,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
        { role: "assistant", content: content },
        {
          role: "user",
          content: `پاسخ قبلی با خطاهای validation زیر مردود شد. لطفاً JSON را اصلاح کنید:\n${errorSummary}`,
        },
      ],
    });

    const retryContent = retryResponse.choices[0]?.message?.content ?? "";
    const retryParsed: unknown = JSON.parse(retryContent);
    const retryValidation = AIProcessingOutputSchema.safeParse(retryParsed);

    if (!retryValidation.success) {
      throw new AIProcessingError(
        "پردازش AI پس از retry هم شکست خورد",
        retryValidation.error.issues
      );
    }

    const totalDuration = Date.now() - startTime;
    return this.buildResult(
      retryValidation.data,
      retryResponse,
      totalDuration
    );
  }

  private buildResult(
    output: AIProcessingOutput,
    response: ChatCompletion,
    durationMs: number
  ): ProcessedProductData {
    const meta: AIProcessingMeta = {
      model: response.model,
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      durationMs,
      processedAt: new Date().toISOString(),
    };
    return { output, meta };
  }
}

export class AIProcessingError extends Error {
  constructor(
    message: string,
    public readonly issues: ZodIssue[]
  ) {
    super(message);
    this.name = "AIProcessingError";
  }
}
