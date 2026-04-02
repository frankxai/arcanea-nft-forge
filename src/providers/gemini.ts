/**
 * NFT Forge — Gemini Image Generation Provider
 *
 * Direct Gemini API integration for image generation.
 * Uses the native multimodal output (responseModalities: ['IMAGE']).
 *
 * Supports:
 * - gemini-2.0-flash-exp (free tier, direct API)
 * - gemini-3-pro-image-preview (via OpenRouter)
 * - gemini-3.1-flash-image-preview (via OpenRouter)
 *
 * Nano Banana naming:
 *   Nano Banana    = gemini-2.5-flash-image-preview  (budget)
 *   Nano Banana 2  = gemini-3.1-flash-image-preview  (default)
 *   Nano Banana Pro = gemini-3-pro-image-preview      (premium)
 */

import type { GenerationPrompt } from '../prompt-builder';

// ─── Types ───────────────────────────────────────────────────

export interface GeminiConfig {
  /** Gemini API key (from .nano-banana-config.json or env) */
  apiKey: string;
  /** Which model to use */
  model: GeminiImageModel;
  /** Use OpenRouter instead of direct API */
  useOpenRouter: boolean;
  /** OpenRouter API key (if useOpenRouter) */
  openRouterKey?: string;
}

export type GeminiImageModel =
  | 'gemini-2.0-flash-exp' // Direct API, free tier
  | 'google/gemini-2.5-flash-image-preview' // OpenRouter: Nano Banana
  | 'google/gemini-3.1-flash-image-preview' // OpenRouter: Nano Banana 2
  | 'google/gemini-3-pro-image-preview'; // OpenRouter: Nano Banana Pro

export interface GeneratedImage {
  tokenId: number;
  base64: string;
  mimeType: string;
  model: string;
  revisedPrompt?: string;
}

// ─── Model Info ─────────────────────────────────────────────

export const GEMINI_MODELS: Record<
  GeminiImageModel,
  { name: string; tier: string; costPerImage: number; requiresOpenRouter: boolean }
> = {
  'gemini-2.0-flash-exp': {
    name: 'Gemini 2.0 Flash (Direct)',
    tier: 'Free',
    costPerImage: 0,
    requiresOpenRouter: false,
  },
  'google/gemini-2.5-flash-image-preview': {
    name: 'Nano Banana',
    tier: 'Budget',
    costPerImage: 0.001,
    requiresOpenRouter: true,
  },
  'google/gemini-3.1-flash-image-preview': {
    name: 'Nano Banana 2',
    tier: 'Default',
    costPerImage: 0.005,
    requiresOpenRouter: true,
  },
  'google/gemini-3-pro-image-preview': {
    name: 'Nano Banana Pro',
    tier: 'Premium',
    costPerImage: 0.02,
    requiresOpenRouter: true,
  },
};

// ─── Gemini Provider ────────────────────────────────────────

export class GeminiImageProvider {
  private config: GeminiConfig;

  constructor(config: GeminiConfig) {
    this.config = config;
  }

  /**
   * Load API key from .nano-banana-config.json
   */
  static async loadFromConfig(configPath: string): Promise<string> {
    const fs = await import('fs');
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw);
    return config.geminiApiKey;
  }

  /**
   * Generate a single image from a prompt
   */
  async generate(prompt: GenerationPrompt): Promise<GeneratedImage> {
    const modelInfo = GEMINI_MODELS[this.config.model];

    if (modelInfo.requiresOpenRouter || this.config.useOpenRouter) {
      return this.generateViaOpenRouter(prompt);
    }

    return this.generateDirect(prompt);
  }

  /**
   * Generate batch of images
   */
  async generateBatch(
    prompts: GenerationPrompt[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];

    for (let i = 0; i < prompts.length; i++) {
      const result = await this.generate(prompts[i]);
      results.push(result);

      if (onProgress) {
        onProgress(i + 1, prompts.length);
      }

      // Rate limiting: 100ms between requests
      if (i < prompts.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    return results;
  }

  /**
   * Direct Gemini API call (gemini-2.0-flash-exp, free tier)
   */
  private async generateDirect(prompt: GenerationPrompt): Promise<GeneratedImage> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt.positive }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          responseMimeType: 'image/png',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${error}`);
    }

    const data = (await response.json()) as {
      candidates: {
        content: {
          parts: ({ text?: string; inlineData?: { data: string; mimeType: string } })[];
        };
      }[];
    };

    // Find image part in response
    for (const candidate of data.candidates) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          return {
            tokenId: prompt.tokenId,
            base64: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
            model: this.config.model,
          };
        }
      }
    }

    throw new Error('No image in Gemini response');
  }

  /**
   * OpenRouter API call (for Nano Banana 2, Pro, etc.)
   */
  private async generateViaOpenRouter(prompt: GenerationPrompt): Promise<GeneratedImage> {
    const apiKey = this.config.openRouterKey;
    if (!apiKey) {
      throw new Error('OpenRouter API key required for this model. Set OPENROUTER_API_KEY.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://arcanea.ai',
        'X-Title': 'Arcanea NFT Forge',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: 'user',
            content: prompt.positive,
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '1:1',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter error: ${response.status} — ${error}`);
    }

    const data = (await response.json()) as {
      choices: {
        message: {
          content: ({ type: string; text?: string; image_url?: { url: string } })[];
        };
      }[];
    };

    // Find image in response
    for (const choice of data.choices) {
      const content = choice.message.content;
      if (Array.isArray(content)) {
        for (const part of content) {
          if (part.type === 'image_url' && part.image_url?.url) {
            // Extract base64 from data URL
            const dataUrl = part.image_url.url;
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              return {
                tokenId: prompt.tokenId,
                base64: match[2],
                mimeType: match[1],
                model: this.config.model,
              };
            }
          }
        }
      }
    }

    throw new Error('No image in OpenRouter response');
  }

  /**
   * Estimate cost for a batch
   */
  estimateCost(count: number, candidatesPerPiece = 1): {
    model: string;
    tier: string;
    totalImages: number;
    costPerImage: number;
    totalCost: number;
  } {
    const modelInfo = GEMINI_MODELS[this.config.model];
    const totalImages = count * candidatesPerPiece;

    return {
      model: modelInfo.name,
      tier: modelInfo.tier,
      totalImages,
      costPerImage: modelInfo.costPerImage,
      totalCost: totalImages * modelInfo.costPerImage,
    };
  }
}
