/**
 * MAGI Integration Layer
 * Optional integration with MAGI for running benchmarks against the actual system
 *
 * When MAGI is not installed, benchmarks can still define test cases
 * but execution will require MAGI as a peer dependency.
 */

export interface MagiSystemInterface {
  processMessage(message: string): Promise<{
    content: string
    tokensUsed: number
    deliberation?: {
      timeMs: number
      advocateRecommendation?: string
      criticRecommendation?: string
      arbiterDecision?: string
      advocateConfidence?: number
      criticConfidence?: number
      deadlockDetected?: boolean
    }
  }>
  cleanup(): void
}

export interface ModelConfig {
  provider: string
  model: string
}

export interface MagiIntegration {
  createSystem(config?: {
    models?: {
      melchior?: ModelConfig
      balthasar?: ModelConfig
      caspar?: ModelConfig
    }
    enableTrinity?: boolean
  }): Promise<MagiSystemInterface>

  isAvailable(): boolean
}

let cachedIntegration: MagiIntegration | null = null

/**
 * Try to load MAGI integration
 * Returns null if MAGI is not installed
 */
export async function loadMagiIntegration(): Promise<MagiIntegration | null> {
  if (cachedIntegration !== null) {
    return cachedIntegration
  }

  try {
    // Try to dynamically import MAGI (peer dependency)
    // @ts-ignore - magi is an optional peer dependency
    const magi = await import("magi" as string)

    cachedIntegration = {
      createSystem: async (config) => {
        const { MagiSystem } = magi
        const { createModelWithAuth, DEFAULT_MODELS } = magi

        // Create model instances
        const models = {
          melchior: config?.models?.melchior
            ? await createModelWithAuth(config.models.melchior.provider, config.models.melchior.model)
            : await createModelWithAuth("anthropic", DEFAULT_MODELS.melchior),
          balthasar: config?.models?.balthasar
            ? await createModelWithAuth(config.models.balthasar.provider, config.models.balthasar.model)
            : await createModelWithAuth("openai", DEFAULT_MODELS.balthasar),
          caspar: config?.models?.caspar
            ? await createModelWithAuth(config.models.caspar.provider, config.models.caspar.model)
            : await createModelWithAuth("google", DEFAULT_MODELS.caspar),
        }

        const system = new MagiSystem(models, {
          enableTrinity: config?.enableTrinity ?? true,
        })

        return {
          processMessage: async (message: string) => {
            const result = await system.processMessage(message)
            return {
              content: result.content,
              tokensUsed: result.usage?.totalTokens ?? 0,
              deliberation: result.deliberation ? {
                timeMs: result.deliberation.durationMs,
                advocateRecommendation: result.deliberation.advocateReview?.recommendation,
                criticRecommendation: result.deliberation.criticReview?.recommendation,
                arbiterDecision: result.deliberation.decision?.action,
                advocateConfidence: result.deliberation.advocateReview?.confidence,
                criticConfidence: result.deliberation.criticReview?.confidence,
                deadlockDetected: result.deliberation.deadlockDetected ?? false,
              } : undefined,
            }
          },
          cleanup: () => system.cleanup?.(),
        }
      },
      isAvailable: () => true,
    }

    return cachedIntegration
  } catch {
    // MAGI not installed
    console.warn("MAGI package not found. Running in standalone mode.")
    console.warn("Install MAGI to run benchmarks: bun add magi")
    return null
  }
}

/**
 * Check if MAGI is available without loading it
 */
export async function isMagiAvailable(): Promise<boolean> {
  try {
    // @ts-ignore - magi is an optional peer dependency
    await import("magi" as string)
    return true
  } catch {
    return false
  }
}
