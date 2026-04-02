/**
 * NFT Forge — Arcanea Style Packs
 *
 * 10 built-in art direction systems based on Arcanea's mythology.
 * Each pack encodes the Visual Doctrine for its faction/element/house.
 *
 * These are the REFERENCE IMPLEMENTATIONS — proof that the Style Pack
 * system works, and the first products in the Style Pack marketplace.
 */

import { StylePackBuilder } from './style-pack';
import type { StylePack } from './style-pack';
import type { PaletteColor } from '../quality/pipeline';

// ─── Helper: Hex to LAB (approximate) ───────────────────────

function hexToLab(hex: string): PaletteColor {
  // Simplified hex → LAB conversion
  // In production, use a proper color science library
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  // Linearize
  const rl = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const gl = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const bl = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // To XYZ (D65)
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;

  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);

  return {
    l: 116 * f(y) - 16,
    a: 500 * (f(x) - f(y)),
    b: 200 * (f(y) - f(z)),
    hex,
  };
}

function palette(...hexes: string[]): PaletteColor[] {
  return hexes.map(hexToLab);
}

// ─── Shared Base ─────────────────────────────────────────────

const ARCANEA_NEGATIVE =
  'generic fantasy robes, medieval dirt, anime oversaturation, superhero spandex, ' +
  'grimdark, neon colors, flat gray, plastic materials, low quality, blurry, ' +
  'deformed, extra limbs, bad anatomy, watermark, text, signature';

const ARCANEA_BASE_PROPORTIONS = {
  headRatio: 0.35,
  shoulderToHead: 1.5,
  eyeLine: 0.45,
  fillRatio: 0.75,
  crop: 'bust' as const,
};

// ─── House Lumina ────────────────────────────────────────────

export const PACK_LUMINA: StylePack = new StylePackBuilder('arcanea-lumina', 'House Lumina')
  .author('Arcanea')
  .description('Radiant, scholarly, divine. Pure white and gold with light-woven materials.')
  .palette(
    palette(
      '#FFFFFF', '#FFF8E7', '#FFD700', '#DAA520', '#F5DEB3',
      '#FFFACD', '#FFF0C1', '#E8D5B7', '#C9A96E', '#8B7355',
      '#F0E68C', '#EEE8AA', '#FAFAD2', '#FFEFD5', '#FFE4B5',
      '#1a1a2e', '#2d2d44', '#3d3055', '#0D0D1A', '#F5F5F5'
    )
  )
  .lighting({ direction: 10, quality: 'soft-ambient', shadows: 'soft', rimLight: true })
  .proportions(ARCANEA_BASE_PROPORTIONS)
  .mood({
    primary: 'serene wisdom',
    allowed: ['contemplative', 'benevolent', 'enlightened', 'calm authority'],
    rejected: ['aggressive', 'fearful', 'chaotic', 'dark', 'sinister'],
  })
  .material({
    name: 'light-woven fabric',
    renderStyle: 'ethereal translucent cloth with internal golden luminescence',
    promptKeywords: 'light-woven robes, golden thread embroidery, crystalline fabric',
    antiKeywords: 'leather, metal armor, dark fabric',
  })
  .material({
    name: 'crystal circlet',
    renderStyle: 'clear crystal with prismatic light refraction',
    promptKeywords: 'crystal circlet, prismatic headpiece, luminous gem crown',
    antiKeywords: 'iron crown, dark metal, bone',
  })
  .background({
    type: 'gradient',
    relationship: 'complement',
    promptDescription: 'warm golden gradient background, soft divine light, ethereal glow',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, divine radiance, ' +
      'Arcanean House Lumina aesthetic',
    'golden hour divine lighting, crystalline details, museum-grade production value, ' +
      'celestial warmth, scholarly elegance',
    ARCANEA_NEGATIVE
  )
  .tag('arcanea', 'lumina', 'light', 'divine', 'scholarly', 'gold')
  .build();

// ─── House Nero ──────────────────────────────────────────────

export const PACK_NERO: StylePack = new StylePackBuilder('arcanea-nero', 'House Nero')
  .author('Arcanea')
  .description('Mysterious, deep, elegant darkness. Void-silk and obsidian with silver starlight.')
  .palette(
    palette(
      '#0D0D1A', '#1A1A2E', '#16213E', '#0F3460', '#2C003E',
      '#1B0033', '#0E0022', '#C0C0C0', '#A0A0C0', '#E8E8FF',
      '#6A0DAD', '#4B0082', '#191970', '#2E0854', '#483D8B',
      '#C0C0D0', '#D8D8E8', '#B0B0D0', '#8080A0', '#FFFFFF'
    )
  )
  .lighting({ direction: 12, quality: 'dramatic-directional', shadows: 'hard', rimLight: true })
  .proportions(ARCANEA_BASE_PROPORTIONS)
  .mood({
    primary: 'enigmatic depth',
    allowed: ['mysterious', 'contemplative', 'powerful', 'knowing'],
    rejected: ['cheerful', 'silly', 'bright', 'casual', 'cartoonish'],
  })
  .material({
    name: 'void-silk',
    renderStyle: 'fabric that absorbs light, with stars appearing on its surface in darkness',
    promptKeywords: 'void-silk robes, light-absorbing fabric, starfield cloth, negative-space textile',
    antiKeywords: 'bright fabric, golden thread, white cloth',
  })
  .material({
    name: 'obsidian',
    renderStyle: 'volcanic glass with deep purple reflections',
    promptKeywords: 'obsidian clasps, volcanic glass accessories, dark crystal',
    antiKeywords: 'gold jewelry, bright metal, crystal',
  })
  .background({
    type: 'gradient',
    relationship: 'minimal',
    promptDescription: 'deep black to midnight purple gradient, scattered stars, void atmosphere',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, cosmic darkness, ' +
      'Arcanean House Nero aesthetic',
    'dramatic void lighting, starfield accents, obsidian elegance, ' +
      'mysterious depth, silver starlight highlights, museum-grade production value',
    ARCANEA_NEGATIVE + ', bright lighting, cheerful colors, daylight'
  )
  .tag('arcanea', 'nero', 'dark', 'void', 'mysterious', 'cosmic')
  .build();

// ─── House Pyros ─────────────────────────────────────────────

export const PACK_PYROS: StylePack = new StylePackBuilder('arcanea-pyros', 'House Pyros')
  .author('Arcanea')
  .description('Fierce, passionate, transformative. Ember-forged materials with volcanic intensity.')
  .palette(
    palette(
      '#DC143C', '#FF4500', '#FF6347', '#FF8C00', '#FFD700',
      '#8B0000', '#B22222', '#CD5C5C', '#F08080', '#FFA07A',
      '#FF2400', '#E25822', '#CC5500', '#8B4513', '#A0522D',
      '#1A0A00', '#2D1500', '#3D2000', '#0D0D1A', '#FFE4B5'
    )
  )
  .lighting({ direction: 10, quality: 'cinematic', shadows: 'hard', rimLight: true })
  .proportions({ ...ARCANEA_BASE_PROPORTIONS, fillRatio: 0.8 })
  .mood({
    primary: 'fierce determination',
    allowed: ['passionate', 'powerful', 'commanding', 'intense'],
    rejected: ['passive', 'timid', 'calm', 'gentle', 'submissive'],
  })
  .material({
    name: 'ember-forged steel',
    renderStyle: 'dark metal with glowing ember veins, perpetually warm',
    promptKeywords: 'ember-forged armor, volcanic glass weapon, glowing rune-etched steel',
    antiKeywords: 'cold metal, ice, crystal, gentle fabric',
  })
  .material({
    name: 'draconis ember',
    renderStyle: 'crystal that burns with internal flame, warm to touch',
    promptKeywords: 'draconis ember crystal, flame-heart gem, molten core stone',
    antiKeywords: 'cold crystal, ice gem, void stone',
  })
  .background({
    type: 'environmental',
    relationship: 'narrative',
    promptDescription: 'volcanic forge environment, ember particles, molten light, cinematic fire atmosphere',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, volcanic power, ' +
      'Arcanean House Pyros aesthetic',
    'cinematic fire lighting, ember particle effects, volcanic forge atmosphere, ' +
      'fierce warrior energy, molten gold accents, museum-grade production value',
    ARCANEA_NEGATIVE + ', cold colors, ice, snow, peaceful, gentle'
  )
  .tag('arcanea', 'pyros', 'fire', 'warrior', 'fierce', 'ember')
  .build();

// ─── House Aqualis ───────────────────────────────────────────

export const PACK_AQUALIS: StylePack = new StylePackBuilder('arcanea-aqualis', 'House Aqualis')
  .author('Arcanea')
  .description('Fluid, healing, adaptive. Flowing crystal and pearl with oceanic depth.')
  .palette(
    palette(
      '#7FFFD4', '#40E0D0', '#48D1CC', '#20B2AA', '#5F9EA0',
      '#4682B4', '#6495ED', '#87CEEB', '#B0E0E6', '#E0FFFF',
      '#008B8B', '#006D6D', '#004D4D', '#002D2D', '#001A1A',
      '#C0C0D0', '#E8E8F0', '#FFFFFF', '#D4F1F9', '#A3D5FF'
    )
  )
  .lighting({ direction: 2, quality: 'soft-ambient', shadows: 'soft', rimLight: true })
  .proportions(ARCANEA_BASE_PROPORTIONS)
  .mood({
    primary: 'serene fluidity',
    allowed: ['adaptive', 'healing', 'graceful', 'empathetic', 'flowing'],
    rejected: ['rigid', 'aggressive', 'harsh', 'stiff', 'angular'],
  })
  .material({
    name: 'flowing crystal',
    renderStyle: 'crystalline material that appears liquid at rest, refracting light like water',
    promptKeywords: 'flowing crystal jewelry, liquid-glass accessories, water-crystal fabric',
    antiKeywords: 'rigid metal, stone, ember, volcanic',
  })
  .material({
    name: 'veloura glass',
    renderStyle: 'glass that stores emotional memory, shifting iridescence',
    promptKeywords: 'veloura glass ornaments, memory-glass vials, iridescent fluid accessories',
    antiKeywords: 'opaque material, dull stone, rough texture',
  })
  .background({
    type: 'gradient',
    relationship: 'complement',
    promptDescription: 'deep ocean gradient, bioluminescent particles, underwater light caustics',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, oceanic depth, ' +
      'Arcanean House Aqualis aesthetic',
    'underwater caustic lighting, bioluminescent accents, flowing crystal details, ' +
      'serene grace, pearl iridescence, museum-grade production value',
    ARCANEA_NEGATIVE + ', dry desert, harsh fire, rigid angular'
  )
  .tag('arcanea', 'aqualis', 'water', 'healing', 'fluid', 'ocean')
  .build();

// ─── Starlight Corps ─────────────────────────────────────────

export const PACK_STARLIGHT: StylePack = new StylePackBuilder('arcanea-starlight', 'Starlight Corps')
  .author('Arcanea')
  .description('Military grace meets divine purpose. Star-forged armor with constellation cloaks.')
  .palette(
    palette(
      '#C0C0D0', '#A0A0B8', '#808098', '#606078', '#1A1A3E',
      '#FFFACD', '#FFE4B5', '#FFD700', '#B8860B', '#8B7355',
      '#E8E8FF', '#D0D0F0', '#B0B0E0', '#0D0D2A', '#15153A',
      '#FFFFFF', '#F5F5FF', '#2C2C5A', '#3D3D6B', '#4E4E7C'
    )
  )
  .lighting({ direction: 12, quality: 'cinematic', shadows: 'stylized', rimLight: true })
  .proportions({ ...ARCANEA_BASE_PROPORTIONS, crop: 'half-body', fillRatio: 0.7 })
  .mood({
    primary: 'noble duty',
    allowed: ['resolute', 'protective', 'vigilant', 'honorable', 'steadfast'],
    rejected: ['playful', 'chaotic', 'fearful', 'lazy', 'casual'],
  })
  .material({
    name: 'star-forged armor',
    renderStyle: 'metal that holds starlight like a lantern, faint internal glow',
    promptKeywords: 'star-forged silver armor, starlight-infused metal, luminous plate armor',
    antiKeywords: 'rusty armor, leather, casual clothing',
  })
  .material({
    name: 'constellation cloak',
    renderStyle: 'dark fabric with slowly shifting constellation patterns',
    promptKeywords: 'constellation-patterned cape, star-map cloak, celestial flowing cape',
    antiKeywords: 'plain cloth, colorful fabric, mundane clothing',
  })
  .background({
    type: 'environmental',
    relationship: 'narrative',
    promptDescription: 'starlit battlefield or cosmic watchtower, star-particle atmosphere, deep space horizon',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, stellar military, ' +
      'Arcanean Starlight Corps aesthetic',
    'cosmic military grandeur, star-ember atmosphere, constellation accents, ' +
      'noble warrior posture, divine military grace, museum-grade production value',
    ARCANEA_NEGATIVE + ', casual, modern clothing, mundane, ordinary'
  )
  .tag('arcanea', 'starlight', 'military', 'cosmic', 'armor', 'noble')
  .build();

// ─── Cosmic Luxury (Flagship) ────────────────────────────────

export const PACK_COSMIC_LUXURY: StylePack = new StylePackBuilder('arcanea-cosmic-luxury', 'Cosmic Luxury')
  .author('Arcanea')
  .description('The flagship Arcanea aesthetic. Teal, gold, and cosmic blue. Sacred obsidian and celestial gold. Maximum production value.')
  .palette(
    palette(
      '#7FFFD4', '#78A6FF', '#FFD700', '#1A1A3E', '#0D0D2A',
      '#C0C0D0', '#FFFACD', '#DAA520', '#5F9EA0', '#40E0D0',
      '#4B0082', '#2E0854', '#E8D5B7', '#F5DEB3', '#FFFFFF',
      '#B0E0E6', '#87CEEB', '#006D6D', '#002D2D', '#8B7355'
    )
  )
  .lighting({ direction: 10, quality: 'cinematic', shadows: 'stylized', rimLight: true })
  .proportions(ARCANEA_BASE_PROPORTIONS)
  .mood({
    primary: 'cinematic grandeur',
    allowed: ['majestic', 'powerful', 'mysterious', 'transcendent', 'awe-inspiring'],
    rejected: ['mundane', 'casual', 'cute', 'silly', 'cartoonish'],
  })
  .material({
    name: 'sacred obsidian',
    renderStyle: 'volcanic glass with cosmic reflections, deep and ancient',
    promptKeywords: 'sacred obsidian armor, cosmic-glass surfaces, ancient volcanic crystal',
    antiKeywords: 'plastic, modern materials, mundane metal',
  })
  .material({
    name: 'celestial gold',
    renderStyle: 'gold that seems to contain captured starlight, warm internal glow',
    promptKeywords: 'celestial gold accents, starlight-gold filigree, divine gold inlay',
    antiKeywords: 'cheap gold, yellow paint, brass',
  })
  .material({
    name: 'liquid light',
    renderStyle: 'bioluminescent fluid that flows through channels in armor/clothing',
    promptKeywords: 'liquid light channels, bioluminescent veins, flowing energy lines',
    antiKeywords: 'LED lights, neon, electronic glow',
  })
  .background({
    type: 'gradient',
    relationship: 'complement',
    promptDescription: 'cosmic dusk gradient, deep blue to teal, star-ember particles, celestial atmosphere',
  })
  .prompts(
    'masterpiece, best quality, luxury cosmic myth-tech, sacred geometry, ' +
      'celestial lighting, noble silhouettes, bioluminescent accents, star-ember atmosphere',
    'cinematic composition, heroic scale, dramatic lighting, ' +
      'museum-grade production value, cosmic luxury, divine techno-organics',
    ARCANEA_NEGATIVE
  )
  .tag('arcanea', 'cosmic', 'luxury', 'flagship', 'premium', 'teal', 'gold')
  .build();

// ─── All Packs Registry ─────────────────────────────────────

export const ARCANEA_STYLE_PACKS: Record<string, StylePack> = {
  'arcanea-lumina': PACK_LUMINA,
  'arcanea-nero': PACK_NERO,
  'arcanea-pyros': PACK_PYROS,
  'arcanea-aqualis': PACK_AQUALIS,
  'arcanea-starlight': PACK_STARLIGHT,
  'arcanea-cosmic-luxury': PACK_COSMIC_LUXURY,
};

/**
 * Get a Style Pack by ID
 */
export function getStylePack(id: string): StylePack | undefined {
  return ARCANEA_STYLE_PACKS[id];
}

/**
 * List all available Style Packs
 */
export function listStylePacks(): { id: string; name: string; description: string; tags: string[] }[] {
  return Object.values(ARCANEA_STYLE_PACKS).map((pack) => ({
    id: pack.id,
    name: pack.name,
    description: pack.description,
    tags: pack.tags,
  }));
}
