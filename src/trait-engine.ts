/**
 * NFT Forge — Trait Engine
 *
 * Schema definition, compatibility matrix, rarity weights,
 * trait selection, and metadata generation.
 *
 * Designed for ANY creator — not Arcanea-locked.
 */

// ─── Types ───────────────────────────────────────────────────

export interface Trait {
  id: string;
  name: string;
  category: string;
  weight: number; // Rarity weight (1-100, higher = more common)
  semantic: string; // Natural language description for prompt generation
  assetUri?: string; // Optional: pre-drawn layer PNG (for hybrid mode)
  incompatible?: string[]; // Trait IDs this can't combine with
  requires?: string[]; // Trait IDs that must be present
  metadata?: Record<string, string | number>; // Extra on-chain attributes
}

export interface TraitCategory {
  id: string;
  name: string;
  required: boolean;
  zIndex: number; // Layer order (for hybrid layered mode)
  maxPerPiece: number; // Usually 1, but accessories can be >1
  traits: Trait[];
}

export interface RarityTier {
  name: string;
  label: string; // Display name: "Common", "Legendary", etc.
  minWeight: number;
  maxWeight: number;
  color: string; // For UI display
}

export interface CollectionSchema {
  id: string;
  name: string;
  symbol: string;
  description: string;
  totalSupply: number;
  categories: TraitCategory[];
  rarityTiers: RarityTier[];
  incompatibilityRules: IncompatibilityRule[];
  proportionTemplate: ProportionTemplate;
  lightingContract: LightingContract;
  moodRange: MoodRange;
}

export interface IncompatibilityRule {
  /** If trait A is selected, trait B cannot be */
  traitA: string;
  traitB: string;
  reason?: string;
}

export interface ProportionTemplate {
  /** Head-to-body ratio (e.g., 0.4 = head is 40% of total height) */
  headRatio: number;
  /** Shoulder width relative to head (e.g., 1.6) */
  shoulderToHead: number;
  /** Eye vertical position (0 = top, 1 = bottom of head) */
  eyeLine: number;
  /** Framing: how much of canvas the character fills (0-1) */
  fillRatio: number;
  /** Crop type */
  crop: 'bust' | 'half-body' | 'full-body' | 'headshot';
}

export interface LightingContract {
  /** Clock position (e.g., 10 = upper-left like Azuki) */
  direction: number;
  /** Lighting quality */
  quality: 'soft-ambient' | 'dramatic-directional' | 'cinematic' | 'flat-stylized';
  /** Shadow behavior */
  shadows: 'none' | 'soft' | 'hard' | 'stylized';
  /** Rim light */
  rimLight: boolean;
}

export interface MoodRange {
  /** Primary mood (the dominant feel) */
  primary: string;
  /** Allowed variations */
  allowed: string[];
  /** Moods to reject (negative prompt keywords) */
  rejected: string[];
}

export interface SelectedTraits {
  tokenId: number;
  traits: Map<string, Trait>; // category -> selected trait
  rarityScore: number;
  promptSegments: string[];
}

// ─── Default Rarity Tiers ────────────────────────────────────

export const DEFAULT_RARITY_TIERS: RarityTier[] = [
  { name: 'common', label: 'Common', minWeight: 50, maxWeight: 100, color: '#9CA3AF' },
  { name: 'uncommon', label: 'Uncommon', minWeight: 25, maxWeight: 49, color: '#10B981' },
  { name: 'rare', label: 'Rare', minWeight: 10, maxWeight: 24, color: '#3B82F6' },
  { name: 'legendary', label: 'Legendary', minWeight: 3, maxWeight: 9, color: '#F59E0B' },
  { name: 'mythic', label: 'Mythic', minWeight: 1, maxWeight: 2, color: '#EF4444' },
];

// ─── Trait Engine ────────────────────────────────────────────

export class TraitEngine {
  private schema: CollectionSchema;
  private generated: Set<string> = new Set(); // Hash of trait combos for uniqueness

  constructor(schema: CollectionSchema) {
    this.schema = schema;
    this.validateSchema();
  }

  /**
   * Validate schema integrity
   */
  private validateSchema(): void {
    const allTraitIds = new Set<string>();

    for (const cat of this.schema.categories) {
      for (const trait of cat.traits) {
        if (allTraitIds.has(trait.id)) {
          throw new Error(`Duplicate trait ID: ${trait.id}`);
        }
        allTraitIds.add(trait.id);
      }
    }

    // Validate incompatibility rules reference real traits
    for (const rule of this.schema.incompatibilityRules) {
      if (!allTraitIds.has(rule.traitA)) {
        throw new Error(`Incompatibility rule references unknown trait: ${rule.traitA}`);
      }
      if (!allTraitIds.has(rule.traitB)) {
        throw new Error(`Incompatibility rule references unknown trait: ${rule.traitB}`);
      }
    }

    // Validate total possible combinations >= supply
    const combos = this.calculateMaxCombinations();
    if (combos < this.schema.totalSupply) {
      throw new Error(
        `Not enough trait combinations (${combos}) for supply (${this.schema.totalSupply}). ` +
          `Add more traits or reduce supply.`
      );
    }
  }

  /**
   * Calculate maximum unique combinations (excluding incompatibilities)
   */
  calculateMaxCombinations(): number {
    let total = 1;
    for (const cat of this.schema.categories) {
      if (cat.required) {
        total *= cat.traits.length;
      } else {
        total *= cat.traits.length + 1; // +1 for "none"
      }
    }
    return total;
  }

  /**
   * Select traits for a single token using weighted random selection
   * with incompatibility enforcement and uniqueness guarantee
   */
  selectTraits(tokenId: number, maxAttempts = 100): SelectedTraits {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const selected = new Map<string, Trait>();
      let valid = true;

      // Select one trait per category (respecting order for dependency resolution)
      for (const category of this.schema.categories) {
        const eligible = this.getEligibleTraits(category, selected);

        if (eligible.length === 0 && category.required) {
          valid = false;
          break;
        }

        if (eligible.length === 0) continue; // Optional category, skip

        if (!category.required && Math.random() > 0.85) continue; // 15% chance to skip optional

        const trait = this.weightedSelect(eligible);
        selected.set(category.id, trait);
      }

      if (!valid) continue;

      // Check uniqueness
      const hash = this.hashTraitCombo(selected);
      if (this.generated.has(hash)) continue;

      this.generated.add(hash);

      const rarityScore = this.calculateRarityScore(selected);
      const promptSegments = this.buildPromptSegments(selected);

      return { tokenId, traits: selected, rarityScore, promptSegments };
    }

    throw new Error(
      `Failed to generate unique trait combination after ${maxAttempts} attempts. ` +
        `Consider adding more traits or reducing supply.`
    );
  }

  /**
   * Generate traits for entire collection
   */
  generateCollection(): SelectedTraits[] {
    const collection: SelectedTraits[] = [];

    for (let i = 0; i < this.schema.totalSupply; i++) {
      const traits = this.selectTraits(i);
      collection.push(traits);

      // Progress logging every 1000
      if ((i + 1) % 1000 === 0) {
        console.log(`Generated ${i + 1}/${this.schema.totalSupply} trait sets`);
      }
    }

    return collection;
  }

  /**
   * Filter eligible traits based on already-selected traits and incompatibility rules
   */
  private getEligibleTraits(category: TraitCategory, selected: Map<string, Trait>): Trait[] {
    const selectedIds = new Set([...selected.values()].map((t) => t.id));
    const incompatibleIds = new Set<string>();

    // Collect all incompatible trait IDs based on current selection
    for (const rule of this.schema.incompatibilityRules) {
      if (selectedIds.has(rule.traitA)) incompatibleIds.add(rule.traitB);
      if (selectedIds.has(rule.traitB)) incompatibleIds.add(rule.traitA);
    }

    // Also check per-trait incompatibilities
    for (const trait of selected.values()) {
      if (trait.incompatible) {
        for (const id of trait.incompatible) incompatibleIds.add(id);
      }
    }

    return category.traits.filter((t) => {
      if (incompatibleIds.has(t.id)) return false;

      // Check requires
      if (t.requires) {
        for (const reqId of t.requires) {
          if (!selectedIds.has(reqId)) return false;
        }
      }

      return true;
    });
  }

  /**
   * Weighted random selection (higher weight = more likely)
   */
  private weightedSelect(traits: Trait[]): Trait {
    const totalWeight = traits.reduce((sum, t) => sum + t.weight, 0);
    let random = Math.random() * totalWeight;

    for (const trait of traits) {
      random -= trait.weight;
      if (random <= 0) return trait;
    }

    return traits[traits.length - 1]; // Fallback
  }

  /**
   * Calculate rarity score (lower = rarer)
   */
  private calculateRarityScore(selected: Map<string, Trait>): number {
    let score = 0;
    let count = 0;

    for (const trait of selected.values()) {
      const category = this.schema.categories.find((c) => c.id === trait.category);
      if (!category) continue;

      const maxWeight = Math.max(...category.traits.map((t) => t.weight));
      score += trait.weight / maxWeight; // Normalize to 0-1 per category
      count++;
    }

    return count > 0 ? score / count : 1;
  }

  /**
   * Build prompt segments from selected traits' semantic descriptions
   */
  private buildPromptSegments(selected: Map<string, Trait>): string[] {
    const segments: string[] = [];

    for (const [, trait] of selected) {
      if (trait.semantic) {
        segments.push(trait.semantic);
      }
    }

    return segments;
  }

  /**
   * Create deterministic hash of trait combination for uniqueness checking
   */
  private hashTraitCombo(selected: Map<string, Trait>): string {
    const ids = [...selected.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cat, trait]) => `${cat}:${trait.id}`)
      .join('|');
    return ids;
  }

  /**
   * Get rarity tier for a given weight
   */
  getRarityTier(weight: number): RarityTier {
    const tiers = this.schema.rarityTiers.length > 0 ? this.schema.rarityTiers : DEFAULT_RARITY_TIERS;

    for (const tier of tiers) {
      if (weight >= tier.minWeight && weight <= tier.maxWeight) {
        return tier;
      }
    }

    return tiers[0]; // Default to common
  }

  /**
   * Generate rarity distribution report
   */
  analyzeDistribution(collection: SelectedTraits[]): Record<string, Record<string, number>> {
    const distribution: Record<string, Record<string, number>> = {};

    for (const category of this.schema.categories) {
      distribution[category.name] = {};
      for (const trait of category.traits) {
        distribution[category.name][trait.name] = 0;
      }
    }

    for (const item of collection) {
      for (const [catId, trait] of item.traits) {
        const category = this.schema.categories.find((c) => c.id === catId);
        if (category) {
          distribution[category.name][trait.name] = (distribution[category.name][trait.name] || 0) + 1;
        }
      }
    }

    return distribution;
  }

  get collectionSchema(): CollectionSchema {
    return this.schema;
  }
}
