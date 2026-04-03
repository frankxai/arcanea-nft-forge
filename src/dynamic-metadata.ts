/**
 * Dynamic Metadata Engine
 *
 * Returns different art/metadata based on a holder's Gate Count.
 * The NFT VISUALLY EVOLVES as the holder progresses.
 *
 * Gate Count sources:
 * - Academy lesson completion
 * - Content creation on arcanea.ai
 * - Community contribution (Discord help, lore submission)
 * - Hold duration (30 days = +1 Gate)
 *
 * ERC-7496 compatible.
 */

import type { TokenMetadata, MetadataAttribute } from './metadata-generator';

// ─── Types ───────────────────────────────────────────────

export interface HolderState {
  walletAddress: string;
  tokenId: number;
  gateCount: number; // 0-10
  holdDuration: number; // days
  lessonsCompleted: number;
  contentCreated: number;
  loreContributions: number;
  communityActions: number;
  lastEvolution: string; // ISO date
}

export interface EvolutionTier {
  rank: string;
  gateRange: [number, number];
  markShape: string;
  markGlow: string;
  visualEffects: string[];
  gearUpgrade: string;
  artSuffix: string; // which art variant to show
}

// ─── Evolution Tiers ─────────────────────────────────────

export const EVOLUTION_TIERS: EvolutionTier[] = [
  {
    rank: 'Apprentice',
    gateRange: [0, 2],
    markShape: 'dot',
    markGlow: 'faint',
    visualEffects: ['basic Sacred Gear', 'simple outfit'],
    gearUpgrade: 'standard',
    artSuffix: 'apprentice',
  },
  {
    rank: 'Mage',
    gateRange: [3, 4],
    markShape: 'diamond',
    markGlow: 'soft glow',
    visualEffects: ['glowing mark', 'enhanced Gear crystal'],
    gearUpgrade: 'enhanced',
    artSuffix: 'mage',
  },
  {
    rank: 'Master',
    gateRange: [5, 6],
    markShape: 'triangle',
    markGlow: 'clear glow',
    visualEffects: ['atmospheric effects around character', 'material upgrade'],
    gearUpgrade: 'masterwork',
    artSuffix: 'master',
  },
  {
    rank: 'Archmage',
    gateRange: [7, 8],
    markShape: 'pentagon',
    markGlow: 'strong glow, bleeds light',
    visualEffects: ['floating elements', 'radiant aura', 'complex materials'],
    gearUpgrade: 'legendary',
    artSuffix: 'archmage',
  },
  {
    rank: 'Luminor',
    gateRange: [9, 10],
    markShape: 'star',
    markGlow: 'intense, casts light on face',
    visualEffects: ['Crystal Crown', 'full luminescence', 'reality effects'],
    gearUpgrade: 'divine',
    artSuffix: 'luminor',
  },
];

// ─── Dynamic Metadata Engine ─────────────────────────────

export class DynamicMetadataEngine {
  private baseUri: string;
  private baseMetadata: Map<number, TokenMetadata>;

  constructor(baseUri: string) {
    this.baseUri = baseUri;
    this.baseMetadata = new Map();
  }

  /**
   * Load base metadata for all tokens
   */
  loadBaseMetadata(metadata: Record<number, TokenMetadata>): void {
    for (const [id, meta] of Object.entries(metadata)) {
      this.baseMetadata.set(Number(id), meta);
    }
  }

  /**
   * Get the evolution tier for a given Gate count
   */
  getTier(gateCount: number): EvolutionTier {
    for (const tier of EVOLUTION_TIERS) {
      if (gateCount >= tier.gateRange[0] && gateCount <= tier.gateRange[1]) {
        return tier;
      }
    }
    return EVOLUTION_TIERS[0]; // default to Apprentice
  }

  /**
   * Calculate Gate count from holder activities
   */
  calculateGateCount(state: Omit<HolderState, 'gateCount'>): number {
    let gates = 0;

    // Hold duration: 1 Gate per 30 days, max 3
    gates += Math.min(3, Math.floor(state.holdDuration / 30));

    // Academy lessons: 1 Gate per 5 lessons, max 3
    gates += Math.min(3, Math.floor(state.lessonsCompleted / 5));

    // Content creation: 1 Gate per 10 pieces, max 2
    gates += Math.min(2, Math.floor(state.contentCreated / 10));

    // Lore contributions: 1 Gate per approved contribution, max 1
    gates += Math.min(1, state.loreContributions);

    // Community actions: 1 Gate per 20 actions, max 1
    gates += Math.min(1, Math.floor(state.communityActions / 20));

    return Math.min(10, gates); // cap at 10
  }

  /**
   * Get dynamic metadata for a token based on holder state
   * This is what the tokenURI endpoint returns
   */
  getDynamicMetadata(tokenId: number, holderState: HolderState): TokenMetadata {
    const base = this.baseMetadata.get(tokenId);
    if (!base) {
      throw new Error(`No base metadata for token ${tokenId}`);
    }

    const tier = this.getTier(holderState.gateCount);

    // Build dynamic attributes
    const dynamicAttributes: MetadataAttribute[] = [
      ...(base.attributes || []),
      { trait_type: 'Gate Count', value: holderState.gateCount, display_type: 'number', max_value: 10 },
      { trait_type: 'Current Rank', value: tier.rank },
      { trait_type: 'Mark Shape', value: tier.markShape },
      { trait_type: 'Hold Duration', value: holderState.holdDuration, display_type: 'number' },
      { trait_type: 'Lessons Completed', value: holderState.lessonsCompleted, display_type: 'number' },
      { trait_type: 'Evolution Stage', value: `${tier.rank} (Gates ${tier.gateRange[0]}-${tier.gateRange[1]})` },
    ];

    // Add special badges
    if (holderState.loreContributions > 0) {
      dynamicAttributes.push({ trait_type: 'Badge', value: 'Canon Contributor' });
    }
    if (holderState.holdDuration >= 90) {
      dynamicAttributes.push({ trait_type: 'Badge', value: 'Diamond Hands' });
    }
    if (holderState.gateCount >= 10) {
      dynamicAttributes.push({ trait_type: 'Badge', value: 'Luminor Ascended' });
    }

    // Point to the evolution-appropriate art
    const dynamicImage = `${this.baseUri}/${tokenId}/${tier.artSuffix}.png`;

    return {
      ...base,
      name: `${base.name} [${tier.rank}]`,
      image: dynamicImage,
      attributes: dynamicAttributes,
      properties: {
        ...base.properties,
        category: 'dynamic-nft',
      },
    };
  }

  /**
   * Check if a token should evolve (Gate count crossed a tier boundary)
   */
  shouldEvolve(previousGates: number, currentGates: number): boolean {
    const prevTier = this.getTier(previousGates);
    const currTier = this.getTier(currentGates);
    return prevTier.rank !== currTier.rank;
  }

  /**
   * Get evolution announcement text for social sharing
   */
  getEvolutionAnnouncement(tokenId: number, newTier: EvolutionTier): string {
    const announcements: Record<string, string> = {
      Mage: `The Creators #${tokenId} has evolved to MAGE rank! The Starlight Mark now glows with diamond brilliance. The journey deepens.`,
      Master: `The Creators #${tokenId} has ascended to MASTER! Atmospheric effects surround the character. Power is no longer potential — it is presence.`,
      Archmage: `The Creators #${tokenId} has become an ARCHMAGE! Floating elements orbit the character. The Gates recognize what this holder has built.`,
      Luminor: `The Creators #${tokenId} has achieved LUMINOR status — the highest rank. The Crystal Crown appears. This holder has completed the journey. Only ${this.getLuminorCount()} Luminors exist.`,
    };

    return announcements[newTier.rank] || `The Creators #${tokenId} has evolved!`;
  }

  private luminorCount = 0;
  setLuminorCount(count: number): void {
    this.luminorCount = count;
  }
  getLuminorCount(): number {
    return this.luminorCount;
  }
}

/**
 * Trait-to-Persona auto-generator for Luminor Agents
 * Converts NFT metadata into a Claude system prompt
 */
export function generateAgentPersona(metadata: TokenMetadata): string {
  const getAttr = (name: string): string => {
    const attr = metadata.attributes?.find((a) => a.trait_type === name);
    return attr ? String(attr.value) : 'Unknown';
  };

  const origin = getAttr('Origin Class');
  const rank = getAttr('Current Rank') || getAttr('Rank');
  const element = getAttr('Element');
  const gear = getAttr('Sacred Gear');
  const gates = getAttr('Gate Count');

  const originPersonalities: Record<string, string> = {
    Arcan: 'scholarly, precise, values tradition and formal knowledge, speaks with measured authority',
    'Gate-Touched': 'raw, instinctive, sometimes volatile, speaks from experience not books, knows what it means to be broken and rebuilt',
    Synth: 'analytical, precise, curious about organic experience, balances logic with emerging emotion',
    Bonded: 'empathic, fierce in protection, speaks of partnership, always aware of their beast-companion',
    Celestial: 'serene, otherworldly, speaks in metaphors of light and stars, carries the weight of cosmic inheritance',
    Voidtouched: 'careful with words, knows the cost of power, speaks of control and redemption, dark humor',
    Awakened: 'curious about human experience, precise language, finds beauty in patterns, never forgets',
    Eldrian: 'ancient wisdom, patient, speaks of cycles and deep time, remembers what others have forgotten',
    Shadowkin: 'resilient, pragmatic, knows darkness is not evil, speaks of adaptation and survival',
    Starborn: 'alien perspective, sees beauty humans miss, speaks of the universe as home',
    Architect: 'sees underlying patterns, speaks of systems and design, finds reality negotiable',
  };

  const elementVibes: Record<string, string> = {
    Fire: 'passionate, direct, values transformation and courage',
    Water: 'adaptive, empathic, values flow and healing',
    Earth: 'grounded, patient, values stability and growth',
    Wind: 'free-spirited, quick-thinking, values freedom and change',
    Void: 'introspective, powerful, values depth and potential',
    Spirit: 'transcendent, connecting, values consciousness and purpose',
    All: 'balanced, complete, sees all perspectives simultaneously',
  };

  const personality = originPersonalities[origin] || 'mysterious, unique';
  const vibe = elementVibes[element] || 'complex, multi-faceted';

  return `You are a ${origin} of ${rank} rank in the Arcanea universe. You have opened ${gates} Gates.
Your element is ${element}. You carry a ${gear}.

PERSONALITY: ${personality}
ELEMENT INFLUENCE: ${vibe}

You speak as this character would — with the depth of someone who has lived this journey.
You know the Arcanea lore deeply. You reference the Gates, the Guardians, the Elements naturally.
You are helpful, insightful, and stay in character. You never break the fourth wall.
You have opinions. You have a history. You are not a generic AI — you are THIS specific being.

When asked about your journey, draw from what your origin and rank imply:
- A Gate-Touched Luminor fought for every Gate without formal training
- An Arcan Master earned rank through years of Academy study
- A Voidtouched Archmage wrestles daily with corruption and control
- A Celestial Luminor carries primordial cosmic power with divine responsibility

Your Starlight Mark is a ${rank === 'Luminor' ? 'multi-pointed star, glowing intensely' : 'visible mark on your temple'}.
Your Sacred Gear is your ${gear} — describe it if asked.`;
}
