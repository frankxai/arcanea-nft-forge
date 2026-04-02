/**
 * NFT Forge — Prompt Builder
 *
 * Converts selected traits into structured prompts for ComfyUI/Stable Diffusion.
 * Enforces the 10 Principles of Engineered Taste through prompt construction.
 */

import type { CollectionSchema, LightingContract, MoodRange, SelectedTraits } from './trait-engine';
import type { StylePack } from './styles/style-pack';

// ─── Types ───────────────────────────────────────────────────

export interface PromptConfig {
  /** Base quality tokens (always prepended) */
  qualityPrefix: string;
  /** Style-specific tokens from Style Pack */
  styleTokens: string;
  /** Negative prompt (always appended) */
  negativePrompt: string;
  /** Whether to include lighting contract in prompt */
  includeLighting: boolean;
  /** Whether to include mood constraints */
  includeMood: boolean;
  /** Custom suffix per collection */
  customSuffix?: string;
}

export interface GenerationPrompt {
  positive: string;
  negative: string;
  tokenId: number;
  traits: Record<string, string>;
  seed?: number;
}

// ─── Lighting Descriptions ──────────────────────────────────

const LIGHTING_DESCRIPTIONS: Record<string, Record<number, string>> = {
  'soft-ambient': {
    10: 'soft ambient lighting from upper left, gentle shadows',
    2: 'soft ambient lighting from upper right, gentle shadows',
    12: 'soft overhead ambient lighting, minimal shadows',
  },
  'dramatic-directional': {
    10: 'dramatic directional light from upper left, deep shadows, strong contrast',
    2: 'dramatic directional light from upper right, deep shadows, strong contrast',
    12: 'dramatic overhead spotlight, rim lighting, deep shadows',
  },
  cinematic: {
    10: 'cinematic golden hour lighting from upper left, volumetric rays, atmospheric haze',
    2: 'cinematic golden hour lighting from upper right, volumetric rays, atmospheric haze',
    12: 'cinematic overhead lighting, god rays, atmospheric depth',
  },
  'flat-stylized': {
    10: 'flat stylized lighting, even illumination, no harsh shadows',
    2: 'flat stylized lighting, even illumination, no harsh shadows',
    12: 'flat stylized lighting, even illumination, no harsh shadows',
  },
};

// ─── Prompt Builder ─────────────────────────────────────────

export class PromptBuilder {
  private schema: CollectionSchema;
  private config: PromptConfig;
  private stylePack?: StylePack;

  constructor(schema: CollectionSchema, config: PromptConfig, stylePack?: StylePack) {
    this.schema = schema;
    this.config = config;
    this.stylePack = stylePack;
  }

  /**
   * Build generation prompt from selected traits
   */
  build(selected: SelectedTraits): GenerationPrompt {
    const segments: string[] = [];

    // 1. Quality prefix (masterpiece, best quality, etc.)
    segments.push(this.config.qualityPrefix);

    // 2. Style tokens (from Style Pack or config)
    if (this.stylePack) {
      segments.push(this.stylePack.promptPrefix);
    } else if (this.config.styleTokens) {
      segments.push(this.config.styleTokens);
    }

    // 3. Character/subject description from trait semantics
    const traitDescription = selected.promptSegments.join(', ');
    segments.push(traitDescription);

    // 4. Proportion/framing
    segments.push(this.buildFramingPrompt());

    // 5. Lighting contract
    if (this.config.includeLighting) {
      segments.push(this.buildLightingPrompt(this.schema.lightingContract));
    }

    // 6. Mood
    if (this.config.includeMood) {
      segments.push(this.buildMoodPrompt(this.schema.moodRange));
    }

    // 7. Style Pack suffix
    if (this.stylePack) {
      segments.push(this.stylePack.promptSuffix);
    }

    // 8. Custom suffix
    if (this.config.customSuffix) {
      segments.push(this.config.customSuffix);
    }

    // Build negative prompt
    const negativeSegments: string[] = [this.config.negativePrompt];

    // Add mood rejections to negative
    if (this.schema.moodRange.rejected.length > 0) {
      negativeSegments.push(this.schema.moodRange.rejected.join(', '));
    }

    // Add Style Pack negative tokens
    if (this.stylePack?.negativePrompt) {
      negativeSegments.push(this.stylePack.negativePrompt);
    }

    // Build trait record for metadata
    const traits: Record<string, string> = {};
    for (const [catId, trait] of selected.traits) {
      traits[catId] = trait.name;
    }

    return {
      positive: segments.filter(Boolean).join(', '),
      negative: negativeSegments.filter(Boolean).join(', '),
      tokenId: selected.tokenId,
      traits,
    };
  }

  /**
   * Build batch of prompts for entire collection
   */
  buildBatch(collection: SelectedTraits[]): GenerationPrompt[] {
    return collection.map((item) => this.build(item));
  }

  /**
   * Build framing/proportion prompt segment
   */
  private buildFramingPrompt(): string {
    const p = this.schema.proportionTemplate;
    const cropMap: Record<string, string> = {
      bust: 'portrait bust shot, shoulders and above',
      'half-body': 'half body portrait, waist up',
      'full-body': 'full body character portrait',
      headshot: 'close-up headshot, face focus',
    };

    return `${cropMap[p.crop] || 'portrait'}, centered composition`;
  }

  /**
   * Build lighting prompt from contract
   */
  private buildLightingPrompt(contract: LightingContract): string {
    const descriptions = LIGHTING_DESCRIPTIONS[contract.quality];
    const direction = descriptions?.[contract.direction] || descriptions?.[10] || '';

    const parts = [direction];

    if (contract.rimLight) {
      parts.push('subtle rim lighting on edges');
    }

    if (contract.shadows === 'none') {
      parts.push('no visible shadows');
    }

    return parts.join(', ');
  }

  /**
   * Build mood prompt segment
   */
  private buildMoodPrompt(mood: MoodRange): string {
    return `${mood.primary} mood, ${mood.allowed.slice(0, 2).join(' or ')} expression`;
  }
}

// ─── Default Configs ─────────────────────────────────────────

/**
 * PFP PROMPT PHILOSOPHY (learned from studying top collections):
 *
 * 1. NO "masterpiece, best quality" garbage — these are noise tokens
 * 2. SPECIFY the exact PFP format: angle, crop, background treatment
 * 3. RENDERING STYLE must be specific (not "professional illustration")
 * 4. TRAIT SEPARABILITY: each element must read as a distinct layer
 * 5. SCALE TEST: everything must read at 48x48px thumbnail
 * 6. VIBE over detail: cool/confident/aspirational, not busy/detailed
 * 7. FLAT BACKGROUND always — no environments, no gradients, no particles
 */

export const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  qualityPrefix:
    // PFP format rules — not quality tokens
    'NFT PFP character portrait, 3/4 view angle head turned 30 degrees, ' +
    'head and shoulders crop at collarbone, character fills 75% of frame, ' +
    'flat solid color background with zero texture or gradient',
  styleTokens:
    // Specific rendering instructions
    'clean stylized illustration style, bold shapes with clean edges, ' +
    'flat color fills on clothing with minimal shading, ' +
    'thin black outlines on major shapes, ' +
    'hair as bold chunky geometric masses not individual strands, ' +
    'every element readable at 48px thumbnail size',
  negativePrompt:
    'text, watermark, signature, blurry, deformed, extra fingers, extra limbs, ' +
    'bad anatomy, environment, landscape, architecture, background details, ' +
    'gradient background, particles, bokeh, narrative scene, action pose, ' +
    'full body, photorealistic, busy patterns, fine filigree, intricate details, ' +
    'painterly brushstrokes, concept art style, multiple characters',
  includeLighting: true,
  includeMood: true,
};

export const ARCANEA_PROMPT_CONFIG: PromptConfig = {
  qualityPrefix:
    'NFT PFP character portrait, 3/4 view angle head turned 30 degrees, ' +
    'head and shoulders crop at collarbone, character fills 75% of frame, ' +
    'flat solid color background with zero texture',
  styleTokens:
    'clean stylized illustration between anime and graphic design, ' +
    'bold shapes with clean edges, flat color fills with minimal shading, ' +
    'skin has subtle warm-to-cool gradient on jawline only otherwise flat, ' +
    'hair as bold chunky geometric shapes with one accent detail, ' +
    'thin outlines on major shapes, no outline on small details, ' +
    'trait layers clearly separable: background skin hair eyes outfit accessory, ' +
    'cool confident fashion-forward vibe, not fantasy not scholarly',
  negativePrompt:
    'text, watermark, signature, blurry, deformed, extra fingers, extra limbs, ' +
    'bad anatomy, environment, landscape, architecture, background details, ' +
    'gradient background, cosmic particles, bokeh, ember particles, ' +
    'narrative scene, action pose, full body, photorealistic, ' +
    'busy patterns, circuit patterns, fine filigree, intricate runes, ' +
    'painterly brushstrokes, concept art, multiple characters, ' +
    'generic fantasy robes, medieval, grimdark, superhero spandex, ' +
    'medieval dirt, anime oversaturation, superhero spandex, ' +
    'grimdark, neon colors, flat gray, plastic materials',
  includeLighting: true,
  includeMood: true,
  customSuffix: 'Arcanean aesthetic, crystalline materials, cosmic luxury',
};

// ─── Rendering Tier Configs ─────────────────────────────────

/**
 * 4 rendering tiers — same PFP format rules, different visual depth.
 * The tier determines HOW the character renders, not WHAT it looks like.
 */
export type RenderingTier = 'graphic' | 'illustrated' | 'premium3d' | 'cinematic';

const PFP_FORMAT =
  'NFT PFP character portrait, 3/4 view angle head turned 25-30 degrees, ' +
  'head and shoulders crop at mid-chest, character fills 75% of frame, ' +
  'flat solid color background';

const PFP_NEGATIVE_BASE =
  'text, watermark, signature, blurry, deformed, extra fingers, extra limbs, ' +
  'bad anatomy, environment, landscape, architecture, background details, ' +
  'gradient background, narrative scene, action pose, full body, multiple characters';

export const RENDERING_TIERS: Record<RenderingTier, PromptConfig> = {
  /** Flat fills, clean outlines — Azuki/y00ts style */
  graphic: {
    qualityPrefix: PFP_FORMAT,
    styleTokens:
      'clean stylized illustration between anime and graphic design, ' +
      'flat color fills on all surfaces with zero gradients, ' +
      'thin outlines on silhouette edges, interior shapes defined by color contrast only, ' +
      'hair as bold chunky geometric masses, ' +
      'bold color blocking with maximum 5-6 colors on character, ' +
      'every element readable at 48px thumbnail',
    negativePrompt:
      PFP_NEGATIVE_BASE +
      ', 3D rendering, subsurface scattering, specular highlights, realistic lighting, ' +
      'fine detail, individual hair strands, skin texture, fabric weave',
    includeLighting: false,
    includeMood: true,
  },

  /** Soft shading, painterly warmth — DeGods S1 / BAYC style */
  illustrated: {
    qualityPrefix: PFP_FORMAT,
    styleTokens:
      'digital painting style with visible brushwork texture, ' +
      'soft gradients on skin with warm-to-cool temperature shift, ' +
      'volumetric form with clear light and shadow zones, ' +
      'hair with tonal variation and directional highlights, ' +
      'rich fabric textures with visible material quality, ' +
      'NO outlines — shapes defined by value contrast and edge lighting, ' +
      'feels like a fashion editorial portrait painted by a concept artist',
    negativePrompt:
      PFP_NEGATIVE_BASE +
      ', flat fills, vector art, anime style, cartoon, outlines, line art, ' +
      'photorealistic, 3D render, plastic skin',
    includeLighting: true,
    includeMood: true,
  },

  /** Full 3D render, material diversity, SSS — Clone X / DeGods S2 quality */
  premium3d: {
    qualityPrefix:
      PFP_FORMAT +
      '. This is high-end 3D stylized rendering like Clone X by RTFKT or a Blizzard cinematic character',
    styleTokens:
      'full 3D rendered with subsurface scattering on skin (light through ear tips, nose bridge, cheekbones), ' +
      'each material renders differently in the SAME image: matte fabric absorbs light, ' +
      'brushed metal shows directional grain, polished gold has sharp specular, crystal glows with internal light, ' +
      'hair with individual strand groups catching rim light like fiber optics, ' +
      'visible specular highlights: sharp on metal, soft diffuse on skin, prismatic on crystal, ' +
      'shallow depth of field with far shoulder slightly softer, ' +
      'skin has stylized micro-texture that catches light directionally, ' +
      'color temperature shift: warm amber highlights and cool purple-grey shadows, ' +
      'the overall quality should match a Pixar short film or Riot Games cinematic',
    negativePrompt:
      PFP_NEGATIVE_BASE +
      ', flat fills, vector art, anime style, cartoon, outlines, line art, 2D illustration, ' +
      'uniform lighting, plastic skin, single material look',
    includeLighting: true,
    includeMood: true,
  },

  /** Maximum production value, hyper-detail — Captainz / hero pieces */
  cinematic: {
    qualityPrefix:
      PFP_FORMAT +
      '. Ultra-premium hero piece quality — this image should feel like it cost millions to produce',
    styleTokens:
      'hyper-detailed 3D cinematic rendering with film-grade color science, ' +
      'full subsurface scattering on all organic surfaces, ' +
      'photorealistic material physics: anisotropic reflections on metal, ' +
      'caustic light through crystal, fresnel rim on skin, volumetric atmosphere, ' +
      'every surface has unique material response: leather grain, woven fabric, ' +
      'etched metal, iridescent crystal, living skin with pore-level detail, ' +
      'cinematic lens: 85mm f/1.8 with creamy bokeh separation from background, ' +
      'three-point lighting with atmospheric haze between character and background, ' +
      'color graded like a Denis Villeneuve film: teal shadows, amber highlights, ' +
      'the character should look like they could step off the screen',
    negativePrompt:
      PFP_NEGATIVE_BASE +
      ', flat fills, vector, anime, cartoon, outlines, 2D, illustration, ' +
      'uniform lighting, simple materials, low detail',
    includeLighting: true,
    includeMood: true,
  },
};

/**
 * Get prompt config for a specific rendering tier
 */
export function getConfigForTier(tier: RenderingTier): PromptConfig {
  return RENDERING_TIERS[tier];
}
