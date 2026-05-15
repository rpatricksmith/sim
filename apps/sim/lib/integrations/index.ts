/**
 * Canonical entry point for everything integrations-related. Landing
 * `/integrations`, workspace integrations, and the sitemap all import from
 * here so the data shape and helpers stay in lockstep.
 *
 * `INTEGRATIONS` is the serialized projection of `BlockConfig` written by
 * `scripts/generate-docs.ts` whenever a block changes.
 *
 * `TEMPLATES` and `POPULAR_WORKFLOWS` are derived from each block's
 * `*BlockMeta` export (see `apps/sim/blocks/registry.ts`, which now hosts
 * both the execution `BlockConfig` lookups and the presentation `BlockMeta`
 * lookups). Block files are the source of truth for both surfaces.
 */

import integrationsJson from '@/lib/integrations/integrations.json'
import type { Integration } from '@/lib/integrations/types'
import { getAllBlockMeta } from '@/blocks/registry'
import type { BlockTemplate } from '@/blocks/types'

/** All integrations surfaced in the catalog, ordered by `scripts/generate-docs.ts`. */
export const INTEGRATIONS: readonly Integration[] = integrationsJson as readonly Integration[]

/** All templates across all blocks. Each template carries its owner implicitly via its position in a block's meta. */
export const TEMPLATES: readonly BlockTemplate[] = Object.values(getAllBlockMeta()).flatMap(
  (meta) => meta.templates ?? []
)

/** A curated `from → to` block-pair workflow surfaced on the landing page. */
export interface PopularWorkflow {
  /** Integration display name (matches `Integration.name`). */
  from: string
  /** Integration display name. */
  to: string
  headline: string
  description: string
}

const TYPE_TO_NAME = new Map<string, string>()
for (const integration of INTEGRATIONS) {
  TYPE_TO_NAME.set(integration.type, integration.name)
  TYPE_TO_NAME.set(integration.type.replace(/_v\d+$/, ''), integration.name)
}

/**
 * Curated popular workflow pairs (templates flagged `featured: true` that
 * reference at least one other integration). Derived from per-block meta —
 * each entry's `from` is the owner block, `to` is the first
 * `alsoIntegrations` entry, and `headline`/`description` come from the
 * template title and prompt.
 */
export const POPULAR_WORKFLOWS: readonly PopularWorkflow[] = (() => {
  const pairs: PopularWorkflow[] = []
  for (const [ownerType, meta] of Object.entries(getAllBlockMeta())) {
    for (const template of meta.templates ?? []) {
      if (!template.featured) continue
      const toType = template.alsoIntegrations?.[0]
      if (!toType) continue
      const from = TYPE_TO_NAME.get(ownerType) ?? TYPE_TO_NAME.get(ownerType.replace(/_v\d+$/, ''))
      const to = TYPE_TO_NAME.get(toType) ?? TYPE_TO_NAME.get(toType.replace(/_v\d+$/, ''))
      if (!from || !to) continue
      pairs.push({ from, to, headline: template.title, description: template.prompt })
    }
  }
  return pairs
})()

export { blockTypeToIconMap } from '@/lib/integrations/icon-mapping'
export type { AuthType, FAQItem, Integration } from '@/lib/integrations/types'
export { getAllBlockMeta, getBlockMeta, getTemplatesForBlock } from '@/blocks/registry'
export type { BlockMeta, BlockTemplate } from '@/blocks/types'
export { formatIntegrationType } from '@/blocks/types'
