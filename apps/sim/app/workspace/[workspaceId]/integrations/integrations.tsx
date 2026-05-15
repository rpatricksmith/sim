'use client'

import {
  type ComponentType,
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createLogger } from '@sim/logger'
import { getErrorMessage } from '@sim/utils/errors'
import { Check, Search } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowRight,
  Badge,
  Button,
  ChevronDown,
  chipVariants,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  focusFirstTextInputIn,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  Textarea,
} from '@/components/emcn'
import { Input as UiInput } from '@/components/ui'
import { useSession } from '@/lib/auth/auth-client'
import { cn } from '@/lib/core/utils/cn'
import {
  clearPendingCredentialCreateRequest,
  PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
  type PendingCredentialCreateRequest,
  readPendingCredentialCreateRequest,
  writeOAuthReturnContext,
} from '@/lib/credentials/client-state'
import {
  blockTypeToIconMap,
  formatIntegrationType,
  INTEGRATIONS,
  type Integration,
} from '@/lib/integrations'
import { getCanonicalScopesForProvider, getServiceConfigByProviderId } from '@/lib/oauth'
import { getScopeDescription } from '@/lib/oauth/utils'
import { IntegrationSection } from '@/app/workspace/[workspaceId]/integrations/components/integration-section'
import { IntegrationTabsHeader } from '@/app/workspace/[workspaceId]/integrations/components/integration-tabs-header'
import { IntegrationTile } from '@/app/workspace/[workspaceId]/integrations/components/integrations-showcase'
import { ShowcaseWithExplore } from '@/app/workspace/[workspaceId]/integrations/components/showcase-with-explore'
import {
  getSampleConnectedCredentials,
  PREVIEW_CONNECTED_WITH_SAMPLES,
} from '@/app/workspace/[workspaceId]/integrations/fixtures/sample-credentials'
import {
  useCreateCredentialDraft,
  useCreateWorkspaceCredential,
  useWorkspaceCredentials,
  type WorkspaceCredential,
} from '@/hooks/queries/credentials'
import {
  useConnectOAuthService,
  useOAuthConnections,
} from '@/hooks/queries/oauth/oauth-connections'
import { useOAuthReturnRouter } from '@/hooks/use-oauth-return'

const logger = createLogger('Integrations')

const ALL_CATEGORY = 'All'
const FEATURED_LABEL = 'Featured'
const CONNECTED_LABEL = 'Connected'
/** Slugs surfaced in the pinned Featured section, in display order. */
const FEATURED_SLUGS = ['slack', 'gmail', 'jira', 'github', 'google-sheets', 'hubspot'] as const

const LINK_ROW_CLASSES =
  'flex items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover-hover:bg-[var(--surface-active)]'
const LINK_ROW_TITLE_CLASSES = 'truncate text-[14px] text-[var(--text-body)]'
const LINK_ROW_SUBTITLE_CLASSES = 'truncate text-[12px] text-[var(--text-muted)]'
const LINK_ROW_ARROW_CLASSES = 'h-4 w-4 flex-shrink-0 text-[var(--text-icon)]'
const MODAL_BACK_BUTTON_CLASSES =
  'h-6 w-6 rounded-[4px] p-0 text-[var(--text-muted)] hover-hover:bg-[var(--surface-5)] hover-hover:text-[var(--text-primary)]'

const FEATURED_INTEGRATIONS: readonly Integration[] = (() => {
  const bySlug = new Map(INTEGRATIONS.map((i) => [i.slug, i]))
  return FEATURED_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (i): i is Integration => i !== undefined
  )
})()

/** Lookup integration metadata by OAuth service display name (case-insensitive). */
const INTEGRATION_BY_LOWER_NAME: ReadonlyMap<string, Integration> = new Map(
  INTEGRATIONS.map((i) => [i.name.toLowerCase(), i])
)

const ALL_CATEGORY_SECTIONS: readonly { label: string; integrations: Integration[] }[] = (() => {
  const grouped = new Map<string, Integration[]>()
  for (const integration of INTEGRATIONS) {
    const bucket = grouped.get(integration.integrationType)
    if (bucket) bucket.push(integration)
    else grouped.set(integration.integrationType, [integration])
  }
  return Array.from(grouped, ([label, items]) => ({
    label,
    integrations: [...items].sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.label.localeCompare(b.label))
})()

interface IntegrationItemProps {
  blockType: string
  slug: string
  workspaceId: string
  name: string
  description?: string | null
  icon: ComponentType<{ className?: string }>
}

function IntegrationItem({
  blockType,
  slug,
  workspaceId,
  name,
  description,
  icon: Icon,
}: IntegrationItemProps) {
  return (
    <Link href={`/workspace/${workspaceId}/integrations/${slug}`} className={LINK_ROW_CLASSES}>
      <IntegrationTile blockType={blockType} icon={Icon} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className={LINK_ROW_TITLE_CLASSES}>{name}</span>
        {description && <span className={LINK_ROW_SUBTITLE_CLASSES}>{description}</span>}
      </div>
      <ArrowRight className={LINK_ROW_ARROW_CLASSES} />
    </Link>
  )
}

interface ConnectedDisplayItem {
  credential: WorkspaceCredential
  name: string
  description: string
  serviceName: string
  integrationType: string | null
  blockType: string
  icon: ComponentType<{ className?: string }>
}

interface ConnectedItemProps {
  href: string
  blockType: string
  name: string
  description: string
  icon: ComponentType<{ className?: string }>
}

function ConnectedItem({ href, blockType, name, description, icon: Icon }: ConnectedItemProps) {
  return (
    <Link href={href} className={LINK_ROW_CLASSES}>
      <IntegrationTile blockType={blockType} icon={Icon} />
      <div className='flex min-w-0 flex-1 flex-col'>
        <span className={LINK_ROW_TITLE_CLASSES}>{name}</span>
        <span className={LINK_ROW_SUBTITLE_CLASSES}>{description}</span>
      </div>
      <ArrowRight className={LINK_ROW_ARROW_CLASSES} />
    </Link>
  )
}

export function Integrations() {
  const params = useParams()
  const workspaceId = (params?.workspaceId as string) || ''

  useOAuthReturnRouter()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>(ALL_CATEGORY)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDisplayName, setCreateDisplayName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createOAuthProviderId, setCreateOAuthProviderId] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)
  const [createStep, setCreateStep] = useState<1 | 2>(1)
  const [serviceSearch, setServiceSearch] = useState('')
  const [saJsonInput, setSaJsonInput] = useState('')
  const [saDisplayName, setSaDisplayName] = useState('')
  const [saDescription, setSaDescription] = useState('')
  const [saError, setSaError] = useState<string | null>(null)
  const [saIsSubmitting, setSaIsSubmitting] = useState(false)
  const [saDragActive, setSaDragActive] = useState(false)

  const createModalContentRef = useRef<HTMLDivElement>(null)
  const pendingReturnOriginRef = useRef<
    | { type: 'workflow'; workflowId: string }
    | { type: 'kb-connectors'; knowledgeBaseId: string }
    | undefined
  >(undefined)

  useEffect(() => {
    if (!showCreateModal || createStep !== 2) return
    const id = window.setTimeout(() => {
      focusFirstTextInputIn(createModalContentRef.current)
    }, 0)
    return () => window.clearTimeout(id)
  }, [showCreateModal, createStep])

  const { data: session } = useSession()
  const currentUserId = session?.user?.id || ''

  const { data: credentials = [], isPending: credentialsLoading } = useWorkspaceCredentials({
    workspaceId,
    enabled: Boolean(workspaceId),
  })

  const { data: oauthConnections = [] } = useOAuthConnections()
  const connectOAuthService = useConnectOAuthService()

  const oauthCredentials = useMemo(() => {
    const real = credentials.filter((c) => c.type === 'oauth' || c.type === 'service_account')
    if (!PREVIEW_CONNECTED_WITH_SAMPLES) return real
    return [...real, ...getSampleConnectedCredentials(workspaceId, currentUserId)]
  }, [credentials, workspaceId, currentUserId])

  const createDraft = useCreateCredentialDraft()
  const createCredential = useCreateWorkspaceCredential()

  const resolveProviderLabel = (providerId?: string | null): string => {
    if (!providerId) return ''
    const match = oauthConnections.find((service) => service.providerId === providerId)
    return match?.name || providerId
  }

  const oauthServiceOptions = useMemo(
    () =>
      oauthConnections.map((service) => ({
        value: service.providerId,
        label: service.name,
        icon: getServiceConfigByProviderId(service.providerId)?.icon,
      })),
    [oauthConnections]
  )

  const selectedOAuthService =
    oauthConnections.find((service) => service.providerId === createOAuthProviderId) || null

  const createOAuthRequiredScopes = useMemo(() => {
    if (!createOAuthProviderId) return []
    if (selectedOAuthService?.scopes?.length) {
      return selectedOAuthService.scopes
    }
    return getCanonicalScopesForProvider(createOAuthProviderId)
  }, [selectedOAuthService, createOAuthProviderId])

  const createDisplayScopes = createOAuthRequiredScopes.filter(
    (s) => !s.includes('userinfo.email') && !s.includes('userinfo.profile')
  )

  const existingOAuthDisplayName = useMemo(() => {
    const name = createDisplayName.trim()
    if (!name) return null
    return (
      credentials.find(
        (row) => row.type === 'oauth' && row.displayName.toLowerCase() === name.toLowerCase()
      ) ?? null
    )
  }, [credentials, createDisplayName])

  const applyPendingCredentialCreateRequest = useCallback(
    (request: PendingCredentialCreateRequest) => {
      if (request.workspaceId !== workspaceId) {
        return
      }

      if (Date.now() - request.requestedAt > 15 * 60 * 1000) {
        clearPendingCredentialCreateRequest()
        return
      }

      if (request.type !== 'oauth') return

      pendingReturnOriginRef.current = request.returnOrigin

      setShowCreateModal(true)
      setCreateError(null)
      setCreateDescription('')
      setCreateOAuthProviderId(request.providerId)
      setCreateDisplayName(request.displayName)

      clearPendingCredentialCreateRequest()
    },
    [workspaceId]
  )

  useEffect(() => {
    if (!workspaceId) return
    const request = readPendingCredentialCreateRequest()
    if (!request) return
    applyPendingCredentialCreateRequest(request)
  }, [workspaceId, applyPendingCredentialCreateRequest])

  useEffect(() => {
    if (!workspaceId) return

    const handlePendingCreateRequest = (event: Event) => {
      const request = (event as CustomEvent<PendingCredentialCreateRequest>).detail
      if (!request) return
      applyPendingCredentialCreateRequest(request)
    }

    window.addEventListener(
      PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
      handlePendingCreateRequest as EventListener
    )

    return () => {
      window.removeEventListener(
        PENDING_CREDENTIAL_CREATE_REQUEST_EVENT,
        handlePendingCreateRequest as EventListener
      )
    }
  }, [workspaceId, applyPendingCredentialCreateRequest])

  const resetCreateForm = () => {
    setCreateDisplayName('')
    setCreateDescription('')
    setCreateOAuthProviderId('')
    setCreateError(null)
    setCreateStep(1)
    setServiceSearch('')
    setSaJsonInput('')
    setSaDisplayName('')
    setSaDescription('')
    setSaError(null)
    pendingReturnOriginRef.current = undefined
  }

  const handleConnectOAuthService = async () => {
    if (!selectedOAuthService) {
      setCreateError('Select an OAuth service before connecting.')
      return
    }

    const displayName = createDisplayName.trim()
    if (!displayName) {
      setCreateError('Display name is required.')
      return
    }

    setCreateError(null)
    try {
      await createDraft.mutateAsync({
        workspaceId,
        providerId: selectedOAuthService.providerId,
        displayName,
        description: createDescription.trim() || undefined,
      })

      const oauthPreCount = credentials.filter(
        (c) => c.type === 'oauth' && c.providerId === selectedOAuthService.providerId
      ).length
      const returnOrigin = pendingReturnOriginRef.current
      pendingReturnOriginRef.current = undefined

      if (returnOrigin?.type === 'workflow') {
        writeOAuthReturnContext({
          origin: 'workflow',
          workflowId: returnOrigin.workflowId,
          displayName,
          providerId: selectedOAuthService.providerId,
          preCount: oauthPreCount,
          workspaceId,
          requestedAt: Date.now(),
        })
      } else if (returnOrigin?.type === 'kb-connectors') {
        writeOAuthReturnContext({
          origin: 'kb-connectors',
          knowledgeBaseId: returnOrigin.knowledgeBaseId,
          displayName,
          providerId: selectedOAuthService.providerId,
          preCount: oauthPreCount,
          workspaceId,
          requestedAt: Date.now(),
        })
      } else {
        writeOAuthReturnContext({
          origin: 'integrations',
          displayName,
          providerId: selectedOAuthService.providerId,
          preCount: oauthPreCount,
          workspaceId,
          requestedAt: Date.now(),
        })
      }

      await connectOAuthService.mutateAsync({
        providerId: selectedOAuthService.providerId,
        callbackURL: window.location.href,
      })
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to start OAuth connection')
      setCreateError(message)
      logger.error('Failed to connect OAuth service', error)
    }
  }

  const connectedItems = useMemo<ConnectedDisplayItem[]>(() => {
    return oauthCredentials.flatMap((credential) => {
      if (!credential.providerId) return []
      const service = getServiceConfigByProviderId(credential.providerId)
      if (!service) return []
      const integration = INTEGRATION_BY_LOWER_NAME.get(service.name.toLowerCase())
      return [
        {
          credential,
          name: credential.displayName,
          description: credential.description || `${service.name} integration`,
          serviceName: service.name,
          integrationType: integration?.integrationType ?? null,
          blockType: integration?.type ?? '',
          icon: service.icon as ComponentType<{ className?: string }>,
        },
      ]
    })
  }, [oauthCredentials])

  const categoryOptions = [
    ALL_CATEGORY,
    ...(connectedItems.length > 0 ? [CONNECTED_LABEL] : []),
    FEATURED_LABEL,
    ...ALL_CATEGORY_SECTIONS.map((section) => section.label),
  ]

  const isAllCategorySelected = selectedCategory === ALL_CATEGORY
  const isFeaturedSelected = selectedCategory === FEATURED_LABEL
  const isConnectedSelected = selectedCategory === CONNECTED_LABEL

  const filteredCategorySections = useMemo(() => {
    // Connected-only view: integration sections are suppressed entirely.
    if (isConnectedSelected) return []

    const normalizedSearch = searchTerm.trim().toLowerCase()
    const matchesSearch = (integration: Integration) =>
      !normalizedSearch ||
      integration.name.toLowerCase().includes(normalizedSearch) ||
      integration.description.toLowerCase().includes(normalizedSearch)

    if (isFeaturedSelected) {
      const items = FEATURED_INTEGRATIONS.filter(matchesSearch)
      return items.length > 0 ? [{ label: FEATURED_LABEL, integrations: items }] : []
    }

    const matchesCategory = (integration: Integration) =>
      isAllCategorySelected || integration.integrationType === selectedCategory

    // Featured is a curated home-row pin: hide it during search so results
    // are not duplicated between the Featured section and the category list.
    const featured = normalizedSearch ? [] : FEATURED_INTEGRATIONS.filter(matchesCategory)
    const featuredSection =
      featured.length > 0 ? [{ label: FEATURED_LABEL, integrations: featured }] : []

    if (isAllCategorySelected) {
      const rest = ALL_CATEGORY_SECTIONS.map((section) => ({
        label: section.label,
        integrations: section.integrations.filter(matchesSearch),
      })).filter((section) => section.integrations.length > 0)
      return [...featuredSection, ...rest]
    }

    const integrations = INTEGRATIONS.filter(matchesCategory)
      .filter(matchesSearch)
      .sort((a, b) => a.name.localeCompare(b.name))

    return [
      ...featuredSection,
      ...(integrations.length > 0 ? [{ label: selectedCategory, integrations }] : []),
    ]
  }, [isAllCategorySelected, isConnectedSelected, isFeaturedSelected, searchTerm, selectedCategory])

  const visibleConnectedItems = useMemo(() => {
    // Featured-only view: Connected is suppressed (mirror behavior of the
    // Featured-only branch above, which renders only the Featured section).
    if (isFeaturedSelected) return []

    const normalizedSearch = searchTerm.trim().toLowerCase()
    return connectedItems.filter((item) => {
      const matchesCategory =
        isAllCategorySelected || isConnectedSelected || item.integrationType === selectedCategory
      if (!matchesCategory) return false
      if (!normalizedSearch) return true
      return (
        item.name.toLowerCase().includes(normalizedSearch) ||
        item.description.toLowerCase().includes(normalizedSearch) ||
        item.serviceName.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [
    connectedItems,
    isAllCategorySelected,
    isConnectedSelected,
    isFeaturedSelected,
    searchTerm,
    selectedCategory,
  ])

  const showNoResults =
    Boolean(searchTerm.trim() || !isAllCategorySelected) &&
    filteredCategorySections.length === 0 &&
    visibleConnectedItems.length === 0

  const validateServiceAccountJson = (raw: string): { valid: boolean; error?: string } => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { valid: false, error: 'Invalid JSON. Paste the full service account key file.' }
    }
    if (parsed.type !== 'service_account') {
      return { valid: false, error: 'JSON key must have "type": "service_account".' }
    }
    if (!parsed.client_email || typeof parsed.client_email !== 'string') {
      return { valid: false, error: 'Missing "client_email" field.' }
    }
    if (!parsed.private_key || typeof parsed.private_key !== 'string') {
      return { valid: false, error: 'Missing "private_key" field.' }
    }
    if (!parsed.project_id || typeof parsed.project_id !== 'string') {
      return { valid: false, error: 'Missing "project_id" field.' }
    }
    return { valid: true }
  }

  const handleCreateServiceAccount = async () => {
    setSaError(null)
    const trimmed = saJsonInput.trim()
    if (!trimmed) {
      setSaError('Paste the service account JSON key.')
      return
    }
    const validation = validateServiceAccountJson(trimmed)
    if (!validation.valid) {
      setSaError(validation.error ?? 'Invalid JSON')
      return
    }
    setSaIsSubmitting(true)
    try {
      await createCredential.mutateAsync({
        workspaceId,
        type: 'service_account',
        displayName: saDisplayName.trim() || undefined,
        description: saDescription.trim() || undefined,
        serviceAccountJson: trimmed,
      })
      setShowCreateModal(false)
      resetCreateForm()
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to add service account')
      setSaError(message)
      logger.error('Failed to create service account credential', error)
    } finally {
      setSaIsSubmitting(false)
    }
  }

  const readSaJsonFile = (file: File) => {
    if (!file.name.endsWith('.json')) {
      setSaError('Only .json files are supported')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === 'string') {
        setSaJsonInput(text)
        setSaError(null)
        try {
          const parsed = JSON.parse(text)
          if (parsed.client_email && !saDisplayName.trim()) {
            setSaDisplayName(parsed.client_email)
          }
        } catch {
          // validation will catch this on submit
        }
      }
    }
    reader.readAsText(file)
  }

  const handleSaFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    readSaJsonFile(file)
    event.target.value = ''
  }

  const handleSaDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSaDragActive(true)
  }

  const handleSaDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSaDragActive(false)
  }

  const handleSaDrop = (event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setSaDragActive(false)
    const file = event.dataTransfer.files[0]
    if (file) readSaJsonFile(file)
  }

  const normalizedServiceSearch = serviceSearch.trim().toLowerCase()
  const filteredServices = normalizedServiceSearch
    ? oauthServiceOptions.filter((s) => s.label.toLowerCase().includes(normalizedServiceSearch))
    : oauthServiceOptions

  const createModalJsx = (
    <Modal
      open={showCreateModal}
      onOpenChange={(open) => {
        setShowCreateModal(open)
        if (!open) resetCreateForm()
      }}
    >
      <ModalContent size='md' ref={createModalContentRef}>
        {createStep === 1 ? (
          <>
            <ModalHeader>Connect Integration</ModalHeader>
            <ModalBody>
              <ModalDescription className='sr-only'>
                Select a service to connect an integration
              </ModalDescription>
              <div className='flex flex-col gap-3'>
                <div className='flex items-center gap-2 rounded-[8px] border border-[var(--border)] bg-transparent px-2 py-[5px]'>
                  <Search
                    className='h-[14px] w-[14px] flex-shrink-0 text-[var(--text-tertiary)]'
                    strokeWidth={2}
                  />
                  <UiInput
                    placeholder='Search services...'
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    className='h-auto flex-1 border-0 bg-transparent p-0 leading-none placeholder:text-[var(--text-tertiary)] focus-visible:ring-0 focus-visible:ring-offset-0'
                  />
                </div>
                <div className='flex max-h-[320px] flex-col overflow-y-auto'>
                  {filteredServices.map((service) => {
                    const config = getServiceConfigByProviderId(service.value)
                    return (
                      <Button
                        key={service.value}
                        type='button'
                        variant='ghost'
                        onClick={() => {
                          setCreateOAuthProviderId(service.value)
                          setCreateStep(2)
                          setServiceSearch('')
                        }}
                        className='h-auto w-full justify-start gap-2.5 rounded-[6px] px-2 py-2 text-left hover-hover:bg-[var(--surface-5)]'
                      >
                        <div className='flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] bg-[var(--surface-5)]'>
                          {config ? (
                            createElement(config.icon, { className: 'h-4 w-4' })
                          ) : (
                            <span className='font-medium text-[11px] text-[var(--text-tertiary)]'>
                              {service.label.slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <span className='font-medium text-[15px] text-[var(--text-primary)]'>
                          {service.label}
                        </span>
                      </Button>
                    )
                  })}
                  {filteredServices.length === 0 && (
                    <div className='py-6 text-center text-[13px] text-[var(--text-muted)]'>
                      No services found
                    </div>
                  )}
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant='default' onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
            </ModalFooter>
          </>
        ) : selectedOAuthService?.authType !== 'service_account' ? (
          <>
            <ModalHeader>
              <div className='flex items-center gap-2.5'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => {
                    setCreateStep(1)
                    setCreateError(null)
                  }}
                  className={MODAL_BACK_BUTTON_CLASSES}
                  aria-label='Back'
                >
                  ←
                </Button>
                <span>
                  Connect{' '}
                  {selectedOAuthService?.name || resolveProviderLabel(createOAuthProviderId)}
                </span>
              </div>
            </ModalHeader>
            <ModalBody>
              <ModalDescription className='sr-only'>
                Connect your OAuth account for this integration
              </ModalDescription>
              {(createError || existingOAuthDisplayName) && (
                <div className='mb-3 flex flex-col gap-2'>
                  {createError && (
                    <Badge variant='red' size='lg' dot className='max-w-full'>
                      {createError}
                    </Badge>
                  )}
                  {existingOAuthDisplayName && (
                    <Badge variant='red' size='lg' dot className='max-w-full'>
                      An integration named "{existingOAuthDisplayName.displayName}" already exists.
                    </Badge>
                  )}
                </div>
              )}
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-5)]'>
                    {selectedOAuthService &&
                      createElement(selectedOAuthService.icon, { className: 'h-[18px] w-[18px]' })}
                  </div>
                  <div>
                    <p className='font-medium text-[13px] text-[var(--text-primary)]'>
                      Connect your {selectedOAuthService?.name} account
                    </p>
                    <p className='text-[12px] text-[var(--text-tertiary)]'>
                      Grant access to use {selectedOAuthService?.name} in your workflows
                    </p>
                  </div>
                </div>

                {createDisplayScopes.length > 0 && (
                  <div className='rounded-[8px] border border-[var(--border-1)] bg-[var(--surface-5)]'>
                    <div className='border-[var(--border-1)] border-b px-3.5 py-2.5'>
                      <h4 className='font-medium text-[12px] text-[var(--text-primary)]'>
                        Permissions requested
                      </h4>
                    </div>
                    <ul className='max-h-[200px] space-y-2.5 overflow-y-auto px-3.5 py-3'>
                      {createDisplayScopes.map((scope) => (
                        <li key={scope} className='flex items-start gap-2.5'>
                          <div className='mt-0.5 flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center'>
                            <Check className='h-[10px] w-[10px] text-[var(--text-primary)]' />
                          </div>
                          <span className='text-[12px] text-[var(--text-primary)]'>
                            {getScopeDescription(scope)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <Label>
                    Display name<span className='ml-1'>*</span>
                  </Label>
                  <Input
                    value={createDisplayName}
                    onChange={(event) => setCreateDisplayName(event.target.value)}
                    placeholder='Integration name'
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-1.5'
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={createDescription}
                    onChange={(event) => setCreateDescription(event.target.value)}
                    placeholder='Optional description'
                    maxLength={500}
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-1.5 min-h-[80px] resize-none'
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant='default'
                onClick={() => {
                  setCreateStep(1)
                  setCreateError(null)
                }}
              >
                Back
              </Button>
              <Button
                variant='primary'
                onClick={handleConnectOAuthService}
                disabled={
                  !createOAuthProviderId ||
                  !createDisplayName.trim() ||
                  connectOAuthService.isPending ||
                  Boolean(existingOAuthDisplayName)
                }
              >
                {connectOAuthService.isPending ? 'Connecting...' : 'Connect'}
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader>
              <div className='flex items-center gap-2.5'>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => {
                    setCreateStep(1)
                    setSaError(null)
                  }}
                  className={MODAL_BACK_BUTTON_CLASSES}
                  aria-label='Back'
                >
                  ←
                </Button>
                <span>
                  Add {selectedOAuthService?.name || resolveProviderLabel(createOAuthProviderId)}
                </span>
              </div>
            </ModalHeader>
            <ModalBody>
              {saError && (
                <div className='mb-3'>
                  <Badge variant='red' size='lg' dot className='max-w-full'>
                    {saError}
                  </Badge>
                </div>
              )}
              <div className='flex flex-col gap-4'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-[40px] w-[40px] flex-shrink-0 items-center justify-center rounded-[8px] bg-[var(--surface-5)]'>
                    {selectedOAuthService &&
                      createElement(selectedOAuthService.icon, { className: 'h-[18px] w-[18px]' })}
                  </div>
                  <div>
                    <p className='font-medium text-[13px] text-[var(--text-primary)]'>
                      Add {selectedOAuthService?.name || 'service account'}
                    </p>
                    <p className='text-[12px] text-[var(--text-tertiary)]'>
                      {selectedOAuthService?.description || 'Paste or upload the JSON key file'}
                    </p>
                    <a
                      href='https://docs.sim.ai/credentials/google-service-account'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-[12px] text-[var(--accent)] hover:underline'
                    >
                      View setup guide
                    </a>
                  </div>
                </div>

                <div>
                  <Label>
                    JSON Key<span className='ml-1'>*</span>
                  </Label>
                  <div
                    onDragOver={handleSaDragOver}
                    onDragLeave={handleSaDragLeave}
                    onDrop={handleSaDrop}
                    className={cn(
                      'relative mt-1.5 rounded-md border-2 border-dashed transition-colors',
                      saDragActive
                        ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                        : 'border-transparent'
                    )}
                  >
                    {saDragActive && (
                      <div className='pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md bg-[var(--accent)]/5'>
                        <p className='font-medium text-[13px] text-[var(--accent)]'>
                          Drop JSON key file here
                        </p>
                      </div>
                    )}
                    <Textarea
                      value={saJsonInput}
                      onChange={(event) => {
                        setSaJsonInput(event.target.value)
                        setSaError(null)
                        if (!saDisplayName.trim()) {
                          try {
                            const parsed = JSON.parse(event.target.value)
                            if (parsed.client_email) setSaDisplayName(parsed.client_email)
                          } catch {
                            // not valid yet
                          }
                        }
                      }}
                      placeholder='Paste your service account JSON key here or drag & drop a .json file...'
                      autoComplete='off'
                      data-lpignore='true'
                      className={cn(
                        'min-h-[120px] resize-none border-0 font-mono text-[12px]',
                        saDragActive && 'opacity-30'
                      )}
                    />
                  </div>
                  <div className='mt-1.5'>
                    <label className='inline-flex cursor-pointer items-center gap-1.5 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'>
                      <input
                        type='file'
                        accept='.json'
                        onChange={handleSaFileUpload}
                        className='hidden'
                      />
                      Or upload a .json file
                    </label>
                  </div>
                </div>
                <div>
                  <Label>Display name</Label>
                  <Input
                    value={saDisplayName}
                    onChange={(event) => setSaDisplayName(event.target.value)}
                    placeholder='Auto-populated from client_email'
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-1.5'
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={saDescription}
                    onChange={(event) => setSaDescription(event.target.value)}
                    placeholder='Optional description'
                    maxLength={500}
                    autoComplete='off'
                    data-lpignore='true'
                    className='mt-1.5 min-h-[80px] resize-none'
                  />
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant='default'
                onClick={() => {
                  setCreateStep(1)
                  setSaError(null)
                }}
              >
                Back
              </Button>
              <Button
                variant='primary'
                onClick={handleCreateServiceAccount}
                disabled={!saJsonInput.trim() || saIsSubmitting}
              >
                {saIsSubmitting ? 'Adding...' : 'Add Service Account'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )

  return (
    <div className='flex h-full flex-col bg-[var(--bg)]'>
      <IntegrationTabsHeader active='integrations' workspaceId={workspaceId} />
      <div className='min-h-0 flex-1 overflow-y-auto px-6 [scrollbar-gutter:stable_both-edges]'>
        <div className='mx-auto flex max-w-[48rem] flex-col gap-7 pb-3'>
          <ShowcaseWithExplore prompt='Explain the integrations in Sim and what I should connect.' />
          <div className='flex items-center gap-2'>
            <div className='flex h-[30px] flex-1 items-center gap-2 rounded-lg border border-[var(--border-1)] bg-[var(--surface-5)] px-2 dark:bg-[var(--surface-4)]'>
              <Search className='h-[14px] w-[14px] flex-shrink-0 text-[var(--text-muted)]' />
              <input
                placeholder='Search integrations...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={credentialsLoading}
                className='h-full w-full bg-transparent text-[var(--text-body)] text-sm outline-none placeholder:text-[var(--text-muted)] focus:outline-none'
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type='button' className={cn(chipVariants({ variant: 'filled' }), 'mx-0')}>
                  <span className='text-[var(--text-body)]'>
                    {selectedCategory === ALL_CATEGORY
                      ? selectedCategory
                      : formatIntegrationType(selectedCategory)}
                  </span>
                  <ChevronDown className='h-[7px] w-[9px] text-[var(--text-icon)]' />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='min-w-[160px]'>
                {categoryOptions.map((category) => (
                  <DropdownMenuItem key={category} onSelect={() => setSelectedCategory(category)}>
                    {category === ALL_CATEGORY ? category : formatIntegrationType(category)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className='flex flex-col gap-7'>
            {visibleConnectedItems.length > 0 && (
              <IntegrationSection label={CONNECTED_LABEL}>
                {visibleConnectedItems.map((item) => (
                  <ConnectedItem
                    key={item.credential.id}
                    href={`/workspace/${workspaceId}/integrations/connected/${item.credential.id}`}
                    blockType={item.blockType}
                    name={item.name}
                    description={item.description}
                    icon={item.icon}
                  />
                ))}
              </IntegrationSection>
            )}

            {filteredCategorySections.map((section) => (
              <IntegrationSection key={section.label} label={formatIntegrationType(section.label)}>
                {section.integrations.map((integration) => {
                  const Icon = blockTypeToIconMap[integration.type]
                  if (!Icon) return null
                  return (
                    <IntegrationItem
                      key={integration.type}
                      blockType={integration.type}
                      slug={integration.slug}
                      workspaceId={workspaceId}
                      name={integration.name}
                      description={integration.description}
                      icon={Icon}
                    />
                  )
                })}
              </IntegrationSection>
            ))}

            {showNoResults && (
              <div className='py-4 text-center text-[var(--text-muted)] text-sm'>
                {searchTerm.trim()
                  ? `No integrations found matching “${searchTerm}”`
                  : 'No integrations in this category'}
              </div>
            )}
          </div>

          {createModalJsx}
        </div>
      </div>
    </div>
  )
}
