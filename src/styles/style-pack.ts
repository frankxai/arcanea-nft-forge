/**
 * NFT Forge — Style Pack System
 *
 * Pre-configured art direction systems that encode the 10 Principles
 * of Engineered Taste into reusable, shareable, marketplace-ready packages.
 *
 * A Style Pack is NOT just a color palette — it's a complete visual contract:
 * palette + lighting + materials + mood + proportions + prompt engineering.
 */

import type { LightingContract, MoodRange, ProportionTemplate, RarityTier } from '../trait-engine';
import type { PaletteColor } from '../quality/pipeline';

// ─── Types ───────────────────────────────────────────────────

export interface StylePack {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** One-line description */
  description: string;
  /** Creator/author */
  author: string;
  /** Version */
  version: string;
  /** Visual preview image URI */
  previewUri?: string;

  // ─── Art Direction Rules ─────────────────────────────
  /** Curated master palette (40-80 colors in CIELAB space) */
  palette: PaletteColor[];
  /** Lighting contract (direction, quality, shadows) */
  lighting: LightingContract;
  /** Proportion template (body ratios, framing) */
  proportions: ProportionTemplate;
  /** Mood range (narrow emotional band) */
  mood: MoodRange;
  /** Material rendering rules */
  materials: MaterialRule[];
  /** Background rules */
  background: BackgroundRule;

  // ─── Prompt Engineering ──────────────────────────────
  /** Tokens prepended to every positive prompt */
  promptPrefix: string;
  /** Tokens appended to every positive prompt */
  promptSuffix: string;
  /** Negative prompt additions */
  negativePrompt: string;

  // ─── Model Configuration ─────────────────────────────
  /** LoRA model ID or path (if trained) */
  loraId?: string;
  /** LoRA weight (0-1) */
  loraWeight?: number;
  /** IP-Adapter reference images */
  ipAdapterRefs?: string[];
  /** IP-Adapter weight (0-1) */
  ipAdapterWeight?: number;
  /** Base model recommendation */
  baseModel?: 'flux' | 'sdxl' | 'sd3';

  // ─── Quality Overrides ───────────────────────────────
  /** Override default quality thresholds for this style */
  qualityOverrides?: {
    aestheticThreshold?: number;
    styleConsistencyThreshold?: number;
    paletteMaxDeltaE?: number;
  };

  // ─── Marketplace ─────────────────────────────────────
  /** Price in credits (0 = free) */
  price: number;
  /** License type */
  license: 'free' | 'commercial' | 'exclusive';
  /** Tags for discovery */
  tags: string[];
}

export interface MaterialRule {
  /** Material name (e.g., "crystal", "void-silk", "star-metal") */
  name: string;
  /** How this material should render */
  renderStyle: string;
  /** Prompt keywords for this material */
  promptKeywords: string;
  /** What this material is NOT */
  antiKeywords: string;
}

export interface BackgroundRule {
  /** Background type */
  type: 'flat-color' | 'gradient' | 'environmental' | 'abstract';
  /** How background relates to character */
  relationship: 'contrast' | 'complement' | 'narrative' | 'minimal';
  /** Prompt description */
  promptDescription: string;
  /** Background palette (subset of master palette) */
  backgroundPalette?: PaletteColor[];
}

// ─── Style Pack Builder ─────────────────────────────────────

export class StylePackBuilder {
  private pack: Partial<StylePack>;

  constructor(id: string, name: string) {
    this.pack = {
      id,
      name,
      version: '1.0.0',
      author: 'unknown',
      materials: [],
      palette: [],
      price: 0,
      license: 'free',
      tags: [],
    };
  }

  author(author: string): this {
    this.pack.author = author;
    return this;
  }

  description(desc: string): this {
    this.pack.description = desc;
    return this;
  }

  palette(colors: PaletteColor[]): this {
    this.pack.palette = colors;
    return this;
  }

  lighting(contract: LightingContract): this {
    this.pack.lighting = contract;
    return this;
  }

  proportions(template: ProportionTemplate): this {
    this.pack.proportions = template;
    return this;
  }

  mood(range: MoodRange): this {
    this.pack.mood = range;
    return this;
  }

  material(rule: MaterialRule): this {
    this.pack.materials!.push(rule);
    return this;
  }

  background(rule: BackgroundRule): this {
    this.pack.background = rule;
    return this;
  }

  prompts(prefix: string, suffix: string, negative: string): this {
    this.pack.promptPrefix = prefix;
    this.pack.promptSuffix = suffix;
    this.pack.negativePrompt = negative;
    return this;
  }

  lora(id: string, weight = 0.8): this {
    this.pack.loraId = id;
    this.pack.loraWeight = weight;
    return this;
  }

  ipAdapter(refs: string[], weight = 0.6): this {
    this.pack.ipAdapterRefs = refs;
    this.pack.ipAdapterWeight = weight;
    return this;
  }

  baseModel(model: 'flux' | 'sdxl' | 'sd3'): this {
    this.pack.baseModel = model;
    return this;
  }

  pricing(price: number, license: 'free' | 'commercial' | 'exclusive'): this {
    this.pack.price = price;
    this.pack.license = license;
    return this;
  }

  tag(...tags: string[]): this {
    this.pack.tags!.push(...tags);
    return this;
  }

  build(): StylePack {
    // Validate required fields
    const required = ['id', 'name', 'description', 'lighting', 'proportions', 'mood', 'background'] as const;
    for (const field of required) {
      if (!this.pack[field]) {
        throw new Error(`Style Pack missing required field: ${field}`);
      }
    }

    if (!this.pack.promptPrefix || !this.pack.promptSuffix || !this.pack.negativePrompt) {
      throw new Error('Style Pack must have prompt prefix, suffix, and negative prompt');
    }

    return this.pack as StylePack;
  }
}

// ─── Style Pack Serialization ───────────────────────────────

export function exportStylePack(pack: StylePack): string {
  return JSON.stringify(pack, null, 2);
}

export function importStylePack(json: string): StylePack {
  const parsed = JSON.parse(json);

  // Validate structure
  if (!parsed.id || !parsed.name || !parsed.lighting) {
    throw new Error('Invalid Style Pack format');
  }

  return parsed as StylePack;
}

/**
 * Merge two style packs (base + override)
 * Used for customizing built-in packs
 */
export function mergeStylePacks(base: StylePack, overrides: Partial<StylePack>): StylePack {
  return {
    ...base,
    ...overrides,
    // Deep merge specific fields
    palette: overrides.palette || base.palette,
    materials: overrides.materials || base.materials,
    tags: [...(base.tags || []), ...(overrides.tags || [])],
    qualityOverrides: {
      ...base.qualityOverrides,
      ...overrides.qualityOverrides,
    },
  };
}
