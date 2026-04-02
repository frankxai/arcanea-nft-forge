/**
 * NFT Forge — Metadata Generator
 *
 * Generates ERC-721 compliant metadata JSON for each token.
 * Supports: OpenSea, Blur, Magic Eden, Rarible standards.
 */

import type { CollectionSchema, SelectedTraits, Trait } from './trait-engine';

// ─── Types ───────────────────────────────────────────────────

export interface TokenMetadata {
  name: string;
  description: string;
  image: string; // IPFS URI
  external_url?: string;
  animation_url?: string;
  attributes: MetadataAttribute[];
  properties?: {
    files?: { uri: string; type: string }[];
    category?: string;
    creators?: { address: string; share: number }[];
  };
}

export interface MetadataAttribute {
  trait_type: string;
  value: string | number;
  display_type?: 'number' | 'boost_number' | 'boost_percentage' | 'date';
  max_value?: number;
}

export interface CollectionMetadata {
  name: string;
  description: string;
  image: string;
  external_link?: string;
  seller_fee_basis_points: number; // Royalty in basis points (500 = 5%)
  fee_recipient: string;
}

export interface MetadataConfig {
  baseImageUri: string; // IPFS base URI for images
  externalUrl?: string;
  animationBaseUri?: string;
  nameTemplate: string; // e.g., "{collection} #{id}" or "{trait:origin} #{id}"
  descriptionTemplate: string;
  royaltyBps: number;
  royaltyRecipient: string;
  includeRarityScore: boolean;
  customAttributes?: MetadataAttribute[]; // Added to every token
}

// ─── Metadata Generator ─────────────────────────────────────

export class MetadataGenerator {
  private schema: CollectionSchema;
  private config: MetadataConfig;

  constructor(schema: CollectionSchema, config: MetadataConfig) {
    this.schema = schema;
    this.config = config;
  }

  /**
   * Generate metadata for a single token
   */
  generateTokenMetadata(selected: SelectedTraits): TokenMetadata {
    const attributes = this.buildAttributes(selected);
    const name = this.interpolateTemplate(this.config.nameTemplate, selected);
    const description = this.interpolateTemplate(this.config.descriptionTemplate, selected);

    const metadata: TokenMetadata = {
      name,
      description,
      image: `${this.config.baseImageUri}/${selected.tokenId}.png`,
      attributes,
    };

    if (this.config.externalUrl) {
      metadata.external_url = `${this.config.externalUrl}/${selected.tokenId}`;
    }

    if (this.config.animationBaseUri) {
      metadata.animation_url = `${this.config.animationBaseUri}/${selected.tokenId}.mp4`;
    }

    return metadata;
  }

  /**
   * Generate metadata for entire collection
   */
  generateCollectionMetadata(collection: SelectedTraits[]): TokenMetadata[] {
    return collection.map((item) => this.generateTokenMetadata(item));
  }

  /**
   * Generate collection-level metadata (contractURI)
   */
  generateContractMetadata(): CollectionMetadata {
    return {
      name: this.schema.name,
      description: this.schema.description,
      image: `${this.config.baseImageUri}/collection.png`,
      external_link: this.config.externalUrl,
      seller_fee_basis_points: this.config.royaltyBps,
      fee_recipient: this.config.royaltyRecipient,
    };
  }

  /**
   * Build ERC-721 attributes array from selected traits
   */
  private buildAttributes(selected: SelectedTraits): MetadataAttribute[] {
    const attributes: MetadataAttribute[] = [];

    // Add trait attributes
    for (const [categoryId, trait] of selected.traits) {
      const category = this.schema.categories.find((c) => c.id === categoryId);
      if (!category) continue;

      attributes.push({
        trait_type: category.name,
        value: trait.name,
      });

      // Add any custom metadata from the trait
      if (trait.metadata) {
        for (const [key, value] of Object.entries(trait.metadata)) {
          attributes.push({
            trait_type: key,
            value,
            display_type: typeof value === 'number' ? 'number' : undefined,
          });
        }
      }
    }

    // Add rarity score if configured
    if (this.config.includeRarityScore) {
      attributes.push({
        trait_type: 'Rarity Score',
        value: Math.round(selected.rarityScore * 1000) / 1000,
        display_type: 'number',
        max_value: 1,
      });

      attributes.push({
        trait_type: 'Rarity Rank',
        value: this.getRarityLabel(selected.rarityScore),
      });
    }

    // Add custom attributes
    if (this.config.customAttributes) {
      attributes.push(...this.config.customAttributes);
    }

    return attributes;
  }

  /**
   * Interpolate template strings like "{collection} #{id}" or "{trait:origin}"
   */
  private interpolateTemplate(template: string, selected: SelectedTraits): string {
    return template
      .replace('{collection}', this.schema.name)
      .replace('{id}', String(selected.tokenId))
      .replace('{symbol}', this.schema.symbol)
      .replace('{rarity}', this.getRarityLabel(selected.rarityScore))
      .replace(/\{trait:(\w+)\}/g, (_match, categoryId: string) => {
        const trait = selected.traits.get(categoryId);
        return trait ? trait.name : 'Unknown';
      });
  }

  /**
   * Get human-readable rarity label from score
   */
  private getRarityLabel(score: number): string {
    if (score <= 0.1) return 'Mythic';
    if (score <= 0.2) return 'Legendary';
    if (score <= 0.4) return 'Rare';
    if (score <= 0.65) return 'Uncommon';
    return 'Common';
  }

  /**
   * Export all metadata as files-ready object
   * Returns: { "0.json": TokenMetadata, "1.json": TokenMetadata, ... }
   */
  exportForIPFS(collection: SelectedTraits[]): Record<string, TokenMetadata | CollectionMetadata> {
    const files: Record<string, TokenMetadata | CollectionMetadata> = {};

    // Contract-level metadata
    files['collection.json'] = this.generateContractMetadata();

    // Per-token metadata
    for (const item of collection) {
      files[`${item.tokenId}.json`] = this.generateTokenMetadata(item);
    }

    return files;
  }
}
