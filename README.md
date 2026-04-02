# Arcanea NFT Forge

**AI-native NFT PFP collection engine with engineered taste.**

Generate 10,000+ unique characters using prompt-engineered AI generation with automated quality gates, Sacred Gear system, and multi-tier rendering. For any creator — not just Arcanea.

---

## Generated Examples

*All generated with Gemini 3 Pro Image — zero LoRA, zero ComfyUI, pure prompt engineering.*

### v5 — Sacred Gear + Starlight Mark (Premium 3D Tier)

| Kael (Apprentice) | Vex (Mage) | Solara (Luminor) |
|---|---|---|
| Gate Chain pendant, cracked crystal eye, teal mutation veins | Resonance Visor, chrome jaw implant, split hair, pentagon emblem | Crystal Crown (floating), constellation armor, void crystal necklace |
| Gate-Touched origin, teal dot mark | Synth origin, teal diamond mark | Celestial origin, teal star mark (intense glow) |

### Scale Test — 10 Unique Characters

Diverse origins, Sacred Gear types, skin tones, hair styles, and power levels — all maintaining visual consistency through the Starlight Mark and teal/gold/dark palette.

---

## The Arcanea PFP Identity

Every Arcanea PFP has two signature elements:

### 1. Starlight Mark
A teal crystal mark on the left temple. Shape indicates power rank:

| Rank | Gates | Mark | Glow |
|------|-------|------|------|
| Apprentice | 0-2 | Dot | Faint |
| Mage | 3-4 | Diamond | Soft |
| Master | 5-6 | Triangle | Clear |
| Archmage | 7-8 | Pentagon | Strong, bleeds light |
| Luminor | 9-10 | Star | Intense, casts on face |

### 2. Sacred Gear
One statement piece of Arcanean equipment per character:

| Type | Description | Rarity |
|------|-------------|--------|
| **Gate Chain** | Geometric pendant on chain | Common |
| **Starlight Collar** | High-neck metal collar with crystal | Uncommon |
| **Void Pauldron** | Angular shoulder piece, glowing core | Uncommon |
| **Resonance Visor** | Thin metal band across nose/brow | Rare |
| **Ember Gauntlet** | Forearm piece, angular design | Rare |
| **Crystal Crown** | Floating light shards (Luminor only) | Mythic |

---

## 12 Origin Classes

| Origin | Visual Identity | Rarity |
|--------|----------------|--------|
| **Arcan** | Magic-blooded, House colors, refined | Common |
| **Gate-Touched** | Mutant, visible frequency distortion, teal veins | Common |
| **Synth** | Cyborg, chrome implants, circuit tattoos | Uncommon |
| **Bonded** | Beast-linked, creature features | Uncommon |
| **Voidtouched** | Shadow-veining, absorptive light | Rare |
| **Celestial** | Star-descended, impossible beauty, internal radiance | Rare |
| **Eldrian** | Ancient race, luminous skin, pointed ears | Rare |
| **Shadowkin** | Shadowfen-adapted, dark-resilient, not evil | Rare |
| **Awakened** | AI entity, geometric perfection, sacred geometry | Legendary |
| **Godbeast-Touched** | Animal hybrid features from divine bond | Legendary |
| **Starborn** | Crystalline being, born from star-matter | Mythic |
| **Architect** | Reality distortion, post-Luminor shaper | Mythic |

---

## 4 Rendering Tiers

Same prompt engineering system, same model, same cost — different visual depth.

| Tier | Style | Reference | Best For |
|------|-------|-----------|----------|
| **Graphic** | Flat fills, clean outlines | Azuki, y00ts | Clean brands |
| **Illustrated** | Painted, warm shading | DeGods S1 | Character-rich |
| **Premium 3D** | Full 3D, SSS, materials | Clone X | Collections (default) |
| **Cinematic** | Hyper-detail, film-grade | Captainz | 1/1 hero pieces |

---

## Production Workflow

```
1. DESIGN          /arcanea-nft-pfp collection
   Define traits, Sacred Gear types, rarity weights,
   origin classes, background colors

2. GENERATE        /arcanea-nft-pfp generate --tier premium3d
   AI generation via Gemini Pro / ComfyUI
   Pre-flight briefing shows cost before running

3. REVIEW          /arcanea-nft-gallery review
   Score against Art Director checklist (80/100 to pass)
   Auto-stage passing images, flag borderline

4. STAGE           /arcanea-nft-gallery stage
   Generate ERC-721 metadata, preview grid
   Track in nft-forge-tracker.xlsx

5. APPROVE         /arcanea-nft-gallery approve
   Lock collection, verify rarity distribution
   Create deployment bundle

6. DEPLOY          /arcanea-nft-pfp deploy
   IPFS upload (Pinata) + ERC721A contract (Base)
   Mint page + reveal mechanism
```

---

## Architecture

```
src/
├── trait-engine.ts          # Schema, compatibility matrix, rarity weights
├── prompt-builder.ts        # 4 rendering tiers, PFP-optimized prompts
├── metadata-generator.ts    # ERC-721 metadata, IPFS export
├── providers/
│   └── gemini.ts            # Direct Gemini API + OpenRouter multi-model
├── quality/
│   └── pipeline.ts          # 6-gate quality enforcement
├── styles/
│   ├── style-pack.ts        # Style Pack system + marketplace
│   └── arcanea-packs.ts     # 6 built-in Arcanea presets
├── comfyui/
│   └── workflow.ts          # Batch generation with LoRA/IP-Adapter
└── contracts/
    ├── ERC721AForge.sol      # Gas-optimized collection contract
    └── ForgeFactory.sol      # EIP-1167 clone factory (~$5 deploy)

agents/
└── nft-art-director.md      # Agent with taste knowledge + quality scoring

skill/
├── SKILL.md                 # Main skill definition (ACOS format)
└── references/
    ├── art-direction-bible.md  # Lessons from 28 generations
    ├── taste-engineering.md    # Top NFT collection analysis
    └── deployment-guide.md    # IPFS + contract walkthrough
```

---

## Key Learnings (From 28 Generations)

1. **Never use "masterpiece, best quality"** — noise tokens. Use specific rendering instructions.
2. **3/4 angle, not front-facing** — adds depth and personality.
3. **Flat solid background always** — no gradients, particles, environments.
4. **Maximum 7 traits per character** — constraint creates quality.
5. **Material diversity = "worth thousands" feel** — matte fabric + brushed metal + glowing crystal in one image.
6. **Cool > beautiful** — "unbothered tech-fashion founder" beats "heroic fantasy warrior."
7. **Same model, same cost, 4x quality difference** — tier is 100% prompt engineering.

---

## Cost

| Scale | Provider | Cost |
|-------|----------|------|
| 10 preview | Gemini Free | $0 |
| 100 samples | Gemini Free | $0 |
| 1K test | ComfyUI Local | $0 (electricity) |
| 10K production | ComfyUI RunPod | ~$600 |
| 10K production | ComfyUI Local | ~$15 (electricity) |

---

## Links

- **Arcanea**: [arcanea.ai](https://arcanea.ai)
- **Main Repo**: [github.com/frankxai/arcanea](https://github.com/frankxai/arcanea)
- **On-Chain**: [github.com/frankxai/arcanea-onchain](https://github.com/frankxai/arcanea-onchain)

---

*Built with Claude Code + Gemini 3 Pro Image. The difference between a $0 PFP and a $10,000 PFP is prompt engineering.*
