/**
 * NFT Forge — ComfyUI Integration
 *
 * Programmatic workflow execution for batch NFT generation.
 * Supports: LoRA conditioning, IP-Adapter, ControlNet, batch processing.
 *
 * ComfyUI (107K+ stars) provides the generation backbone.
 * This module handles the API communication and workflow orchestration.
 */

import type { GenerationPrompt } from '../prompt-builder';
import type { StylePack } from '../styles/style-pack';

// ─── Types ───────────────────────────────────────────────────

export interface ComfyUIConfig {
  /** ComfyUI server URL */
  serverUrl: string;
  /** Output directory for generated images */
  outputDir: string;
  /** Base model checkpoint */
  checkpoint: string;
  /** Image dimensions */
  width: number;
  height: number;
  /** Generation steps */
  steps: number;
  /** CFG scale */
  cfg: number;
  /** Sampler */
  sampler: string;
  /** Scheduler */
  scheduler: string;
  /** Number of candidates per trait combo (generate multiple, pick best) */
  candidatesPerCombo: number;
  /** Batch size (images per GPU batch) */
  batchSize: number;
}

export interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

export interface ComfyUIWorkflow {
  [nodeId: string]: WorkflowNode;
}

export interface GenerationJob {
  promptId: string;
  tokenId: number;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  outputPaths?: string[];
  error?: string;
}

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  passRate: number;
  estimatedTimeRemaining: number; // seconds
}

// ─── Default Config ─────────────────────────────────────────

export const DEFAULT_COMFYUI_CONFIG: ComfyUIConfig = {
  serverUrl: 'http://127.0.0.1:8188',
  outputDir: './output/nft-forge',
  checkpoint: 'flux1-dev.safetensors',
  width: 1024,
  height: 1024,
  steps: 30,
  cfg: 7.5,
  sampler: 'euler_a',
  scheduler: 'normal',
  candidatesPerCombo: 3,
  batchSize: 4,
};

// ─── Workflow Builder ───────────────────────────────────────

export class ComfyUIWorkflowBuilder {
  private config: ComfyUIConfig;
  private stylePack?: StylePack;

  constructor(config: ComfyUIConfig = DEFAULT_COMFYUI_CONFIG, stylePack?: StylePack) {
    this.config = config;
    this.stylePack = stylePack;
  }

  /**
   * Build a ComfyUI workflow JSON for a single generation
   */
  buildWorkflow(prompt: GenerationPrompt, seed?: number): ComfyUIWorkflow {
    const actualSeed = seed ?? Math.floor(Math.random() * 2 ** 32);

    const workflow: ComfyUIWorkflow = {};
    let nodeId = 1;

    // Node 1: Load Checkpoint
    workflow[String(nodeId)] = {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: this.config.checkpoint },
    };
    const checkpointNodeId = nodeId++;

    // Node 2: CLIP Text Encode (Positive)
    workflow[String(nodeId)] = {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: prompt.positive,
        clip: [String(checkpointNodeId), 1],
      },
    };
    const positiveNodeId = nodeId++;

    // Node 3: CLIP Text Encode (Negative)
    workflow[String(nodeId)] = {
      class_type: 'CLIPTextEncode',
      inputs: {
        text: prompt.negative,
        clip: [String(checkpointNodeId), 1],
      },
    };
    const negativeNodeId = nodeId++;

    // Node 4: Empty Latent Image
    workflow[String(nodeId)] = {
      class_type: 'EmptyLatentImage',
      inputs: {
        width: this.config.width,
        height: this.config.height,
        batch_size: 1,
      },
    };
    const latentNodeId = nodeId++;

    let modelOutput = [String(checkpointNodeId), 0];

    // Optional: LoRA Loader (if Style Pack has LoRA)
    if (this.stylePack?.loraId) {
      workflow[String(nodeId)] = {
        class_type: 'LoraLoader',
        inputs: {
          lora_name: this.stylePack.loraId,
          strength_model: this.stylePack.loraWeight ?? 0.8,
          strength_clip: this.stylePack.loraWeight ?? 0.8,
          model: modelOutput,
          clip: [String(checkpointNodeId), 1],
        },
      };
      modelOutput = [String(nodeId), 0];
      nodeId++;
    }

    // Optional: IP-Adapter (if Style Pack has reference images)
    if (this.stylePack?.ipAdapterRefs && this.stylePack.ipAdapterRefs.length > 0) {
      // Load reference image
      workflow[String(nodeId)] = {
        class_type: 'LoadImage',
        inputs: { image: this.stylePack.ipAdapterRefs[0] },
      };
      const refImageNodeId = nodeId++;

      // IP-Adapter Apply
      workflow[String(nodeId)] = {
        class_type: 'IPAdapterApply',
        inputs: {
          model: modelOutput,
          image: [String(refImageNodeId), 0],
          weight: this.stylePack.ipAdapterWeight ?? 0.6,
          noise: 0.3,
          start_at: 0.0,
          end_at: 1.0,
        },
      };
      modelOutput = [String(nodeId), 0];
      nodeId++;
    }

    // Node: KSampler
    workflow[String(nodeId)] = {
      class_type: 'KSampler',
      inputs: {
        model: modelOutput,
        positive: [String(positiveNodeId), 0],
        negative: [String(negativeNodeId), 0],
        latent_image: [String(latentNodeId), 0],
        seed: actualSeed,
        steps: this.config.steps,
        cfg: this.config.cfg,
        sampler_name: this.config.sampler,
        scheduler: this.config.scheduler,
        denoise: 1.0,
      },
    };
    const samplerNodeId = nodeId++;

    // Node: VAE Decode
    workflow[String(nodeId)] = {
      class_type: 'VAEDecode',
      inputs: {
        samples: [String(samplerNodeId), 0],
        vae: [String(checkpointNodeId), 2],
      },
    };
    const decodeNodeId = nodeId++;

    // Node: Save Image
    workflow[String(nodeId)] = {
      class_type: 'SaveImage',
      inputs: {
        images: [String(decodeNodeId), 0],
        filename_prefix: `nft-forge/${prompt.tokenId}`,
      },
    };

    return workflow;
  }

  /**
   * Build workflows for entire collection with seed management
   * Uses latent space walking for controlled variation
   */
  buildBatchWorkflows(
    prompts: GenerationPrompt[]
  ): { tokenId: number; workflows: ComfyUIWorkflow[]; seeds: number[] }[] {
    const baseSeed = Math.floor(Math.random() * 2 ** 32);

    return prompts.map((prompt, index) => {
      const seeds: number[] = [];
      const workflows: ComfyUIWorkflow[] = [];

      for (let c = 0; c < this.config.candidatesPerCombo; c++) {
        // Latent space walking: small seed increments for related-but-different outputs
        const seed = baseSeed + index * 1000 + c * 7;
        seeds.push(seed);
        workflows.push(this.buildWorkflow(prompt, seed));
      }

      return { tokenId: prompt.tokenId, workflows, seeds };
    });
  }
}

// ─── ComfyUI API Client ─────────────────────────────────────

export class ComfyUIClient {
  private serverUrl: string;
  private clientId: string;

  constructor(serverUrl: string = 'http://127.0.0.1:8188') {
    this.serverUrl = serverUrl;
    this.clientId = crypto.randomUUID();
  }

  /**
   * Check if ComfyUI server is running
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serverUrl}/system_stats`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Queue a workflow for execution
   */
  async queueWorkflow(workflow: ComfyUIWorkflow): Promise<string> {
    const response = await fetch(`${this.serverUrl}/prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: workflow,
        client_id: this.clientId,
      }),
    });

    if (!response.ok) {
      throw new Error(`ComfyUI queue failed: ${response.statusText}`);
    }

    const data = (await response.json()) as { prompt_id: string };
    return data.prompt_id;
  }

  /**
   * Check status of a queued prompt
   */
  async getStatus(promptId: string): Promise<'queued' | 'running' | 'completed' | 'failed'> {
    const response = await fetch(`${this.serverUrl}/history/${promptId}`);

    if (!response.ok) {
      return 'queued';
    }

    const data = (await response.json()) as Record<string, { status: { completed: boolean } }>;
    const entry = data[promptId];

    if (!entry) return 'queued';
    if (entry.status?.completed) return 'completed';
    return 'running';
  }

  /**
   * Get output images for a completed prompt
   */
  async getOutputImages(promptId: string): Promise<string[]> {
    const response = await fetch(`${this.serverUrl}/history/${promptId}`);

    if (!response.ok) return [];

    const data = (await response.json()) as Record<
      string,
      { outputs: Record<string, { images: { filename: string; subfolder: string }[] }> }
    >;
    const entry = data[promptId];
    if (!entry) return [];

    const images: string[] = [];
    for (const nodeOutput of Object.values(entry.outputs)) {
      if (nodeOutput.images) {
        for (const img of nodeOutput.images) {
          images.push(`${this.serverUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}`);
        }
      }
    }

    return images;
  }

  /**
   * Batch generate: queue all workflows and wait for completion
   */
  async batchGenerate(
    workflows: { tokenId: number; workflow: ComfyUIWorkflow }[],
    onProgress?: (progress: BatchProgress) => void
  ): Promise<GenerationJob[]> {
    const jobs: GenerationJob[] = [];

    // Queue all workflows
    for (const { tokenId, workflow } of workflows) {
      const promptId = await this.queueWorkflow(workflow);
      jobs.push({ promptId, tokenId, status: 'queued' });
    }

    // Poll for completion
    const startTime = Date.now();
    let allDone = false;

    while (!allDone) {
      allDone = true;

      for (const job of jobs) {
        if (job.status === 'completed' || job.status === 'failed') continue;

        const status = await this.getStatus(job.promptId);
        if (status === 'completed') {
          job.status = 'completed';
          job.outputPaths = await this.getOutputImages(job.promptId);
        } else if (status === 'failed') {
          job.status = 'failed';
        } else {
          allDone = false;
          job.status = status === 'running' ? 'generating' : 'queued';
        }
      }

      if (!allDone) {
        // Report progress
        if (onProgress) {
          const completed = jobs.filter((j) => j.status === 'completed').length;
          const failed = jobs.filter((j) => j.status === 'failed').length;
          const elapsed = (Date.now() - startTime) / 1000;
          const rate = completed > 0 ? elapsed / completed : 0;
          const remaining = (jobs.length - completed - failed) * rate;

          onProgress({
            total: jobs.length,
            completed,
            failed,
            inProgress: jobs.length - completed - failed,
            passRate: completed / Math.max(1, completed + failed),
            estimatedTimeRemaining: remaining,
          });
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return jobs;
  }
}
