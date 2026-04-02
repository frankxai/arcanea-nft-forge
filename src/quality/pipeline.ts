/**
 * NFT Forge — Quality Gate Pipeline
 *
 * 6-layer automated taste enforcement.
 * No human bottleneck for 95% of pieces.
 * Expected pass rate: 40-60% (high standards, regenerate failures).
 */

// ─── Types ───────────────────────────────────────────────────

export interface QualityResult {
  tokenId: number;
  passed: boolean;
  score: number; // 0-1 aggregate quality score
  gates: GateResult[];
  rejectionReasons: string[];
}

export interface GateResult {
  name: string;
  passed: boolean;
  score: number;
  threshold: number;
  details?: string;
}

export interface QualityConfig {
  /** ImageReward / LAION aesthetic score threshold (0-10) */
  aestheticThreshold: number;
  /** CLIP similarity to reference set (0-1) */
  styleConsistencyThreshold: number;
  /** Maximum Delta-E distance from master palette */
  paletteMaxDeltaE: number;
  /** Minimum silhouette area ratio at 64px */
  thumbnailMinArea: number;
  /** Minimum perceptual distance from all other pieces (0-1) */
  uniquenessMinDistance: number;
  /** Enable/disable individual gates */
  enabledGates: {
    aesthetic: boolean;
    styleConsistency: boolean;
    palette: boolean;
    thumbnail: boolean;
    defects: boolean;
    uniqueness: boolean;
  };
}

export interface PaletteColor {
  l: number; // CIELAB L* (0-100)
  a: number; // CIELAB a* (-128 to 127)
  b: number; // CIELAB b* (-128 to 127)
  hex: string; // For display
}

export interface ImageData {
  tokenId: number;
  path: string;
  width: number;
  height: number;
  buffer: Buffer;
}

// ─── Default Configuration ──────────────────────────────────

export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  aestheticThreshold: 7.0,
  styleConsistencyThreshold: 0.80,
  paletteMaxDeltaE: 10,
  thumbnailMinArea: 0.15, // Character should fill at least 15% of 64px thumbnail
  uniquenessMinDistance: 0.15,
  enabledGates: {
    aesthetic: true,
    styleConsistency: true,
    palette: true,
    thumbnail: true,
    defects: true,
    uniqueness: true,
  },
};

export const PREMIUM_QUALITY_CONFIG: QualityConfig = {
  aestheticThreshold: 8.0,
  styleConsistencyThreshold: 0.85,
  paletteMaxDeltaE: 7,
  thumbnailMinArea: 0.20,
  uniquenessMinDistance: 0.20,
  enabledGates: {
    aesthetic: true,
    styleConsistency: true,
    palette: true,
    thumbnail: true,
    defects: true,
    uniqueness: true,
  },
};

// ─── Quality Gate Pipeline ──────────────────────────────────

export class QualityPipeline {
  private config: QualityConfig;
  private masterPalette: PaletteColor[];
  private referenceEmbeddings: Float32Array[];
  private acceptedHashes: Float32Array[];

  constructor(
    config: QualityConfig = DEFAULT_QUALITY_CONFIG,
    masterPalette: PaletteColor[] = [],
    referenceEmbeddings: Float32Array[] = []
  ) {
    this.config = config;
    this.masterPalette = masterPalette;
    this.referenceEmbeddings = referenceEmbeddings;
    this.acceptedHashes = [];
  }

  /**
   * Run all quality gates on a generated image
   */
  async evaluate(image: ImageData): Promise<QualityResult> {
    const gates: GateResult[] = [];
    const rejectionReasons: string[] = [];

    // Gate 1: Aesthetic Score
    if (this.config.enabledGates.aesthetic) {
      const result = await this.gateAesthetic(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push(`Aesthetic score ${result.score.toFixed(2)} < ${result.threshold}`);
    }

    // Gate 2: Style Consistency
    if (this.config.enabledGates.styleConsistency && this.referenceEmbeddings.length > 0) {
      const result = await this.gateStyleConsistency(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push(`Style consistency ${result.score.toFixed(2)} < ${result.threshold}`);
    }

    // Gate 3: Palette Compliance
    if (this.config.enabledGates.palette && this.masterPalette.length > 0) {
      const result = await this.gatePaletteCompliance(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push(`Palette deviation: ${result.details}`);
    }

    // Gate 4: Thumbnail Test
    if (this.config.enabledGates.thumbnail) {
      const result = await this.gateThumbnailTest(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push('Character not readable at 64px thumbnail');
    }

    // Gate 5: Defect Detection
    if (this.config.enabledGates.defects) {
      const result = await this.gateDefectDetection(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push(`Defects detected: ${result.details}`);
    }

    // Gate 6: Uniqueness
    if (this.config.enabledGates.uniqueness) {
      const result = await this.gateUniqueness(image);
      gates.push(result);
      if (!result.passed) rejectionReasons.push('Too similar to existing piece');
    }

    const passed = gates.every((g) => g.passed);
    const score = gates.length > 0 ? gates.reduce((sum, g) => sum + g.score, 0) / gates.length : 0;

    // If passed, record hash for future uniqueness checks
    if (passed) {
      const hash = await this.computePerceptualHash(image);
      this.acceptedHashes.push(hash);
    }

    return { tokenId: image.tokenId, passed, score, gates, rejectionReasons };
  }

  /**
   * Evaluate a batch and return stats
   */
  async evaluateBatch(images: ImageData[]): Promise<{
    results: QualityResult[];
    passRate: number;
    gateStats: Record<string, { passRate: number; avgScore: number }>;
  }> {
    const results: QualityResult[] = [];

    for (const image of images) {
      const result = await this.evaluate(image);
      results.push(result);
    }

    const passRate = results.filter((r) => r.passed).length / results.length;

    // Per-gate statistics
    const gateStats: Record<string, { passRate: number; avgScore: number }> = {};
    const gateNames = new Set(results.flatMap((r) => r.gates.map((g) => g.name)));

    for (const name of gateNames) {
      const gateResults = results.flatMap((r) => r.gates.filter((g) => g.name === name));
      gateStats[name] = {
        passRate: gateResults.filter((g) => g.passed).length / gateResults.length,
        avgScore: gateResults.reduce((sum, g) => sum + g.score, 0) / gateResults.length,
      };
    }

    return { results, passRate, gateStats };
  }

  // ─── Individual Gates ───────────────────────────────────

  /**
   * Gate 1: Aesthetic quality scoring
   * Uses ImageReward or LAION aesthetic predictor
   * Score: 0-10 scale
   */
  private async gateAesthetic(image: ImageData): Promise<GateResult> {
    // In production, this calls ImageReward model via API
    // For now, returns a placeholder that integrates with:
    //   - LAION Aesthetic Predictor (CLIP-based, scores 1-10)
    //   - ImageReward (text-to-image specific, more accurate)
    //   - NIMA (CNN-based, technical + aesthetic quality)

    const score = await this.scoreAesthetic(image);
    const threshold = this.config.aestheticThreshold;

    return {
      name: 'aesthetic',
      passed: score >= threshold,
      score: score / 10, // Normalize to 0-1
      threshold: threshold / 10,
      details: `Score: ${score.toFixed(2)}/10`,
    };
  }

  /**
   * Gate 2: Style consistency via CLIP embedding similarity
   */
  private async gateStyleConsistency(image: ImageData): Promise<GateResult> {
    const embedding = await this.computeCLIPEmbedding(image);
    const threshold = this.config.styleConsistencyThreshold;

    // Average cosine similarity to all reference embeddings
    let totalSim = 0;
    for (const ref of this.referenceEmbeddings) {
      totalSim += this.cosineSimilarity(embedding, ref);
    }
    const avgSim = totalSim / this.referenceEmbeddings.length;

    return {
      name: 'style_consistency',
      passed: avgSim >= threshold,
      score: avgSim,
      threshold,
      details: `CLIP similarity: ${avgSim.toFixed(3)}`,
    };
  }

  /**
   * Gate 3: Palette compliance via Delta-E 2000 in CIELAB space
   */
  private async gatePaletteCompliance(image: ImageData): Promise<GateResult> {
    const dominantColors = await this.extractDominantColors(image, 10);
    const threshold = this.config.paletteMaxDeltaE;

    let maxDeviation = 0;
    let worstColor = '';

    for (const color of dominantColors) {
      let minDeltaE = Infinity;
      for (const paletteColor of this.masterPalette) {
        const deltaE = this.deltaE2000(color, paletteColor);
        if (deltaE < minDeltaE) minDeltaE = deltaE;
      }
      if (minDeltaE > maxDeviation) {
        maxDeviation = minDeltaE;
        worstColor = color.hex;
      }
    }

    return {
      name: 'palette_compliance',
      passed: maxDeviation <= threshold,
      score: Math.max(0, 1 - maxDeviation / (threshold * 2)),
      threshold: 1 - threshold / (threshold * 2),
      details: `Max Delta-E: ${maxDeviation.toFixed(1)} (worst: ${worstColor})`,
    };
  }

  /**
   * Gate 4: Thumbnail readability test
   * Downscale to 64x64, detect if character silhouette is distinguishable
   */
  private async gateThumbnailTest(image: ImageData): Promise<GateResult> {
    const areaRatio = await this.measureSilhouetteArea(image, 64);
    const threshold = this.config.thumbnailMinArea;

    return {
      name: 'thumbnail_test',
      passed: areaRatio >= threshold,
      score: Math.min(1, areaRatio / threshold),
      threshold: 1,
      details: `Silhouette area: ${(areaRatio * 100).toFixed(1)}%`,
    };
  }

  /**
   * Gate 5: Defect detection
   * Checks for common AI generation artifacts
   */
  private async gateDefectDetection(image: ImageData): Promise<GateResult> {
    const defects = await this.detectDefects(image);
    const hasCritical = defects.some((d) => d.severity === 'critical');

    return {
      name: 'defect_detection',
      passed: !hasCritical,
      score: hasCritical ? 0 : defects.length === 0 ? 1 : 0.7,
      threshold: 1,
      details: defects.length > 0 ? defects.map((d) => d.type).join(', ') : 'No defects',
    };
  }

  /**
   * Gate 6: Uniqueness check via perceptual hashing
   */
  private async gateUniqueness(image: ImageData): Promise<GateResult> {
    const hash = await this.computePerceptualHash(image);
    const threshold = this.config.uniquenessMinDistance;

    let minDistance = 1;
    for (const existing of this.acceptedHashes) {
      const distance = this.perceptualDistance(hash, existing);
      if (distance < minDistance) minDistance = distance;
    }

    // First piece is always unique
    if (this.acceptedHashes.length === 0) minDistance = 1;

    return {
      name: 'uniqueness',
      passed: minDistance >= threshold,
      score: Math.min(1, minDistance / threshold),
      threshold: 1,
      details: `Min perceptual distance: ${minDistance.toFixed(3)}`,
    };
  }

  // ─── Utility Methods (Integration Points) ──────────────

  /**
   * Score aesthetic quality using ImageReward or LAION
   * Integration point: Replace with actual model inference
   */
  private async scoreAesthetic(_image: ImageData): Promise<number> {
    // TODO: Integrate with ImageReward API or local model
    // Options:
    //   1. Replicate API: replicate.com/tencent/imagereward
    //   2. Local: python -m image_reward score --image <path>
    //   3. ComfyUI node: ImageRewardScore
    return 7.5; // Placeholder
  }

  /**
   * Compute CLIP embedding for style consistency
   * Integration point: Replace with actual CLIP inference
   */
  private async computeCLIPEmbedding(_image: ImageData): Promise<Float32Array> {
    // TODO: Integrate with CLIP model
    // Options:
    //   1. OpenAI CLIP API
    //   2. Local: clip-as-service
    //   3. ComfyUI node: CLIPImageEncode
    return new Float32Array(512); // Placeholder
  }

  /**
   * Extract dominant colors using k-means clustering in LAB space
   * Integration point: Replace with sharp/jimp color extraction
   */
  private async extractDominantColors(_image: ImageData, _k: number): Promise<PaletteColor[]> {
    // TODO: Integrate with sharp or jimp for color extraction
    // Algorithm:
    //   1. Resize to 100x100 (speed)
    //   2. Convert all pixels to CIELAB
    //   3. K-means clustering (k=10)
    //   4. Return cluster centroids as PaletteColor[]
    return []; // Placeholder
  }

  /**
   * Measure character silhouette area at target resolution
   */
  private async measureSilhouetteArea(_image: ImageData, _targetSize: number): Promise<number> {
    // TODO: Integrate with sharp for resize + edge detection
    // Algorithm:
    //   1. Resize to targetSize x targetSize
    //   2. Convert to grayscale
    //   3. Edge detection (Canny or Sobel)
    //   4. Flood fill from corners (background detection)
    //   5. Return foreground pixel ratio
    return 0.3; // Placeholder
  }

  /**
   * Detect common AI generation defects
   */
  private async detectDefects(
    _image: ImageData
  ): Promise<{ type: string; severity: 'critical' | 'warning'; location?: string }[]> {
    // TODO: Integrate with defect detection models
    // Checks:
    //   1. Hand/finger anomalies (most common AI failure)
    //   2. Facial asymmetry beyond threshold
    //   3. Artifact blobs (high-frequency noise patterns)
    //   4. Inconsistent edges (partial rendering failures)
    //   5. Text/watermark residue
    return []; // Placeholder
  }

  /**
   * Compute perceptual hash for uniqueness checking
   */
  private async computePerceptualHash(_image: ImageData): Promise<Float32Array> {
    // TODO: Integrate with pHash or LPIPS
    // Options:
    //   1. pHash (fast, good for near-duplicate detection)
    //   2. LPIPS (learned perceptual similarity, more accurate)
    //   3. Average hash (fastest, least accurate)
    return new Float32Array(64); // Placeholder
  }

  /**
   * Delta-E 2000 color difference (CIE standard)
   * The perceptually uniform color distance metric
   */
  deltaE2000(c1: PaletteColor, c2: PaletteColor): number {
    // Simplified Delta-E 2000 implementation
    const dL = c2.l - c1.l;
    const avgL = (c1.l + c2.l) / 2;
    const c1c = Math.sqrt(c1.a * c1.a + c1.b * c1.b);
    const c2c = Math.sqrt(c2.a * c2.a + c2.b * c2.b);
    const avgC = (c1c + c2c) / 2;
    const dC = c2c - c1c;

    const c7 = Math.pow(avgC, 7);
    const g = 0.5 * (1 - Math.sqrt(c7 / (c7 + Math.pow(25, 7))));

    const a1p = c1.a * (1 + g);
    const a2p = c2.a * (1 + g);
    const c1p = Math.sqrt(a1p * a1p + c1.b * c1.b);
    const c2p = Math.sqrt(a2p * a2p + c2.b * c2.b);
    const dCp = c2p - c1p;
    const avgCp = (c1p + c2p) / 2;

    let h1p = Math.atan2(c1.b, a1p) * (180 / Math.PI);
    if (h1p < 0) h1p += 360;
    let h2p = Math.atan2(c2.b, a2p) * (180 / Math.PI);
    if (h2p < 0) h2p += 360;

    let dHp: number;
    if (Math.abs(h1p - h2p) <= 180) {
      dHp = h2p - h1p;
    } else if (h2p <= h1p) {
      dHp = h2p - h1p + 360;
    } else {
      dHp = h2p - h1p - 360;
    }

    const dHpPrime = 2 * Math.sqrt(c1p * c2p) * Math.sin((dHp * Math.PI) / 360);

    let avgHp: number;
    if (Math.abs(h1p - h2p) <= 180) {
      avgHp = (h1p + h2p) / 2;
    } else {
      avgHp = (h1p + h2p + 360) / 2;
    }

    const t =
      1 -
      0.17 * Math.cos(((avgHp - 30) * Math.PI) / 180) +
      0.24 * Math.cos((2 * avgHp * Math.PI) / 180) +
      0.32 * Math.cos(((3 * avgHp + 6) * Math.PI) / 180) -
      0.2 * Math.cos(((4 * avgHp - 63) * Math.PI) / 180);

    const sL = 1 + (0.015 * Math.pow(avgL - 50, 2)) / Math.sqrt(20 + Math.pow(avgL - 50, 2));
    const sC = 1 + 0.045 * avgCp;
    const sH = 1 + 0.015 * avgCp * t;

    const rt =
      -2 *
      Math.sqrt(Math.pow(avgCp, 7) / (Math.pow(avgCp, 7) + Math.pow(25, 7))) *
      Math.sin(((60 * Math.exp(-Math.pow((avgHp - 275) / 25, 2))) * Math.PI) / 180);

    return Math.sqrt(
      Math.pow(dL / sL, 2) +
        Math.pow(dCp / sC, 2) +
        Math.pow(dHpPrime / sH, 2) +
        rt * (dCp / sC) * (dHpPrime / sH)
    );
  }

  /**
   * Cosine similarity between two vectors
   */
  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  /**
   * Perceptual distance between two hash vectors
   */
  private perceptualDistance(a: Float32Array, b: Float32Array): number {
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff += Math.abs(a[i] - b[i]);
    }
    return diff / a.length;
  }
}
