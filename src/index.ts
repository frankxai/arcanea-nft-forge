/**
 * @arcanea/nft-forge
 *
 * AI-Native NFT PFP Collection Engine
 *
 * Generates 10K+ unique characters with engineered taste,
 * style consistency, and full deployment pipeline.
 *
 * For ANY creator — not Arcanea-locked.
 */

// ─── Core Engines ───────────────────────────────────────────
export {
  TraitEngine,
  DEFAULT_RARITY_TIERS,
  type Trait,
  type TraitCategory,
  type CollectionSchema,
  type RarityTier,
  type IncompatibilityRule,
  type ProportionTemplate,
  type LightingContract,
  type MoodRange,
  type SelectedTraits,
} from './trait-engine';

export {
  MetadataGenerator,
  type TokenMetadata,
  type MetadataAttribute,
  type CollectionMetadata,
  type MetadataConfig,
} from './metadata-generator';

export {
  PromptBuilder,
  DEFAULT_PROMPT_CONFIG,
  ARCANEA_PROMPT_CONFIG,
  RENDERING_TIERS,
  getConfigForTier,
  type PromptConfig,
  type GenerationPrompt,
  type RenderingTier,
} from './prompt-builder';

// ─── Quality Pipeline ───────────────────────────────────────
export {
  QualityPipeline,
  DEFAULT_QUALITY_CONFIG,
  PREMIUM_QUALITY_CONFIG,
  type QualityResult,
  type GateResult,
  type QualityConfig,
  type PaletteColor,
  type ImageData,
} from './quality/pipeline';

// ─── Style System ───────────────────────────────────────────
export {
  StylePackBuilder,
  exportStylePack,
  importStylePack,
  mergeStylePacks,
  type StylePack,
  type MaterialRule,
  type BackgroundRule,
} from './styles/style-pack';

export {
  ARCANEA_STYLE_PACKS,
  PACK_LUMINA,
  PACK_NERO,
  PACK_PYROS,
  PACK_AQUALIS,
  PACK_STARLIGHT,
  PACK_COSMIC_LUXURY,
  getStylePack,
  listStylePacks,
} from './styles/arcanea-packs';

// ─── Providers ──────────────────────────────────────────────
export {
  GeminiImageProvider,
  GEMINI_MODELS,
  type GeminiConfig,
  type GeminiImageModel,
  type GeneratedImage,
} from './providers/gemini';

// ─── ComfyUI Integration ────────────────────────────────────
export {
  ComfyUIWorkflowBuilder,
  ComfyUIClient,
  DEFAULT_COMFYUI_CONFIG,
  type ComfyUIConfig,
  type ComfyUIWorkflow,
  type GenerationJob,
  type BatchProgress,
} from './comfyui/workflow';
