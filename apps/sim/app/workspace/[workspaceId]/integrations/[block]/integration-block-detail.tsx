'use client'

import { type ReactNode, useMemo } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ChipLink } from '@/components/emcn'
import { LandingPromptStorage } from '@/lib/core/utils/browser-storage'
import { cn } from '@/lib/core/utils/cn'
import { blockTypeToIconMap, type Integration } from '@/lib/integrations'
import { IntegrationTile } from '@/app/workspace/[workspaceId]/integrations/components/integrations-showcase'
import { getBlock, getTemplatesForBlock, type ScopedBlockTemplate } from '@/blocks/registry'

/** Maximum number of overlapping icon tiles rendered per template row. */
const TEMPLATE_CLUSTER_MAX = 3 as const

/**
 * Z-index per cluster position so the primary tile reads on top and trailing
 * tiles cascade behind it.
 */
const TEMPLATE_TILE_Z = ['z-30', 'z-20', 'z-10'] as const

interface IntegrationBlockDetailProps {
  integration: Integration
  workspaceId: string
}

export function IntegrationBlockDetail({ integration, workspaceId }: IntegrationBlockDetailProps) {
  const Icon = blockTypeToIconMap[integration.type]
  const matchingTemplates = getTemplatesForBlock(integration.type)
  const operations = useMemo(() => getBlockOperations(integration.type), [integration.type])

  return (
    <div className='flex h-full flex-col bg-[var(--bg)]'>
      <div className='flex flex-shrink-0 items-center bg-[var(--bg)] px-[16px] pt-[8.5px] pb-[8.5px]'>
        <ChipLink href={`/workspace/${workspaceId}/integrations`} leftIcon={ArrowLeft}>
          Integrations
        </ChipLink>
      </div>
      <div className='min-h-0 flex-1 overflow-y-auto px-6 [scrollbar-gutter:stable_both-edges]'>
        <div className='mx-auto flex max-w-[48rem] flex-col gap-7 pb-3'>
          <div className='flex flex-col gap-3'>
            {Icon ? (
              <IntegrationTile blockType={integration.type} icon={Icon} />
            ) : (
              <div
                className='flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-1)] text-white'
                style={{ background: integration.bgColor }}
              >
                {integration.name.charAt(0)}
              </div>
            )}
            <div className='flex flex-col gap-1'>
              <h1 className='font-medium text-[var(--text-body)] text-lg'>{integration.name}</h1>
              <p className='text-[var(--text-muted)] text-md'>{integration.description}</p>
            </div>
          </div>

          {operations.length > 0 && (
            <OperationsSection integration={integration} operations={operations} />
          )}

          {matchingTemplates.length > 0 && (
            <TemplatesSection
              integration={integration}
              templates={matchingTemplates}
              workspaceId={workspaceId}
            />
          )}
        </div>
      </div>
    </div>
  )
}

interface IntegrationRowProps {
  leftIcon: ReactNode
  title: string
  subtitle?: string
  onClick?: () => void
}

/**
 * Shared row primitive for the integration detail page's "Operations" and
 * "Templates" sections. Layout is identical in both modes — same `p-2`,
 * `gap-2.5`, same title typography (`text-[14px] text-[var(--text-body)]`) so
 * row heights line up regardless of whether a subtitle is present (the
 * 36px-tall `IntegrationTile` icon sets the minimum height).
 *
 * Interactive mode (when `onClick` is supplied) renders a `<button>` with a
 * `group` class enabling hover-state coordination with child icons, a
 * `hover-hover:` background, and a trailing `ArrowRight`. Read-only mode
 * renders a plain `<div>` with no hover affordance and no trailing chevron.
 */
function IntegrationRow({ leftIcon, title, subtitle, onClick }: IntegrationRowProps) {
  const content = (
    <>
      {leftIcon}
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className='truncate text-[14px] text-[var(--text-body)]'>{title}</span>
        {subtitle ? (
          <span className='truncate text-[12px] text-[var(--text-muted)]'>{subtitle}</span>
        ) : null}
      </div>
      {onClick ? <ArrowRight className='size-4 flex-shrink-0 text-[var(--text-icon)]' /> : null}
    </>
  )

  if (onClick) {
    return (
      <button
        type='button'
        onClick={onClick}
        className='group flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover-hover:bg-[var(--surface-active)]'
      >
        {content}
      </button>
    )
  }

  return <div className='flex items-center gap-2.5 rounded-lg p-2'>{content}</div>
}

interface TemplatesSectionProps {
  integration: Integration
  templates: readonly ScopedBlockTemplate[]
  workspaceId: string
}

function TemplatesSection({ integration, templates, workspaceId }: TemplatesSectionProps) {
  const router = useRouter()

  const handleSelect = (prompt: string) => {
    LandingPromptStorage.store(prompt)
    router.push(`/workspace/${workspaceId}/home`)
  }

  return (
    <section className='flex flex-col'>
      <span className='pl-0.5 text-[var(--text-muted)] text-small'>Templates</span>
      <div className='mt-[9px] mb-3 h-px bg-[var(--border)]' />
      <div className='-mx-2 flex flex-col gap-y-0.5'>
        {templates.map((template) => {
          const blockTypes = [integration.type, ...template.otherBlockTypes].slice(
            0,
            TEMPLATE_CLUSTER_MAX
          )
          return (
            <IntegrationRow
              key={template.title}
              leftIcon={<TemplateIcons blockTypes={blockTypes} />}
              title={template.title}
              subtitle={template.prompt}
              onClick={() => handleSelect(template.prompt)}
            />
          )
        })}
      </div>
    </section>
  )
}

interface TemplateIconsProps {
  blockTypes: string[]
}

/**
 * Horizontal overlapping icon cluster. Primary integration (idx === 0) sits
 * left and on top, rendered identically to a bare `IntegrationTile` so it
 * matches `IntegrationItem` outside the templates list with no halo. Trailing
 * tiles cascade behind with negative margin and carry a non-layout-affecting
 * outline whose color tracks the row background exactly — `--bg` at rest and
 * `--surface-active` on row hover via the parent `group`. The outline is
 * visually invisible in both states yet cleanly cuts each silhouette from the
 * tile behind it. `outline` is preferred over `ring` here because it has no
 * `box-shadow` specificity collisions and lets us transition just the
 * `outline-color` token rather than the full shadow stack.
 */
function TemplateIcons({ blockTypes }: TemplateIconsProps) {
  return (
    <span aria-hidden className='flex items-center'>
      {blockTypes.map((bt, idx) => {
        const ToolIcon = blockTypeToIconMap[bt]
        if (!ToolIcon) return null
        const z = TEMPLATE_TILE_Z[idx]
        if (!z) return null
        const isTrailing = idx > 0
        return (
          <span
            key={bt}
            className={cn(
              '[&:not(:first-child)]:-ml-2 relative rounded-xl first:ml-0',
              z,
              isTrailing &&
                'outline outline-2 outline-[var(--bg)] transition-[outline-color] duration-150 group-hover:outline-[var(--surface-active)]'
            )}
          >
            <IntegrationTile blockType={bt} icon={ToolIcon} />
          </span>
        )
      })}
    </span>
  )
}

interface OperationOption {
  label: string
  id: string
}

/**
 * Extracts the operation list from a block's `subBlocks`. Looks for a dropdown
 * subBlock with `id === 'operation'` and returns its `options` flattened to
 * `{ label, id }`. Supports both static array `options` and function `options`,
 * filters out entries marked `hidden`. Returns an empty array when the block
 * has no operation selector or no visible options.
 */
function getBlockOperations(blockType: string): OperationOption[] {
  const block = getBlock(blockType)
  if (!block) return []
  const operationSubBlock = block.subBlocks.find(
    (sb) => sb.id === 'operation' && sb.type === 'dropdown'
  )
  if (!operationSubBlock?.options) return []
  const rawOptions =
    typeof operationSubBlock.options === 'function'
      ? operationSubBlock.options()
      : operationSubBlock.options
  return rawOptions
    .filter((option) => !option.hidden)
    .map((option) => ({ label: option.label, id: option.id }))
}

interface OperationsSectionProps {
  integration: Integration
  operations: OperationOption[]
}

/**
 * Lists every operation exposed by the block's `operation` subBlock. Mirrors
 * `TemplatesSection`'s heading, divider, and outer spacing so the two sections
 * stack uniformly on the detail page. Each row reuses the same
 * `IntegrationRow` primitive as templates with no `onClick` and a single
 * `IntegrationTile` icon — no cluster, no chevron, no hover state.
 */
function OperationsSection({ integration, operations }: OperationsSectionProps) {
  const Icon = blockTypeToIconMap[integration.type]
  const leftIcon = Icon ? (
    <IntegrationTile blockType={integration.type} icon={Icon} />
  ) : (
    <div
      className='flex size-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--border-1)] text-white'
      style={{ background: integration.bgColor }}
    >
      {integration.name.charAt(0)}
    </div>
  )

  return (
    <section className='flex flex-col'>
      <span className='pl-0.5 text-[var(--text-muted)] text-small'>Operations</span>
      <div className='mt-[9px] mb-3 h-px bg-[var(--border)]' />
      <div className='-mx-2 flex flex-col gap-y-0.5'>
        {operations.map((operation) => (
          <IntegrationRow key={operation.id} leftIcon={leftIcon} title={operation.label} />
        ))}
      </div>
    </section>
  )
}
