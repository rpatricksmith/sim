import { OpenAIIcon } from '@/components/icons'
import type { BlockConfig, BlockMeta } from '@/blocks/types'
import { AuthMode, IntegrationType } from '@/blocks/types'

export const OpenAIBlock: BlockConfig = {
  type: 'openai',
  name: 'Embeddings',
  description: 'Generate Open AI embeddings',
  authMode: AuthMode.ApiKey,
  longDescription: 'Integrate Embeddings into the workflow. Can generate embeddings from text.',
  category: 'tools',
  integrationType: IntegrationType.AI,
  docsLink: 'https://docs.sim.ai/tools/openai',
  bgColor: '#10a37f',
  icon: OpenAIIcon,
  subBlocks: [
    {
      id: 'input',
      title: 'Input Text',
      type: 'long-input',
      placeholder: 'Enter text to generate embeddings for',
      required: true,
    },
    {
      id: 'model',
      title: 'Model',
      type: 'dropdown',
      options: [
        { label: 'text-embedding-3-small', id: 'text-embedding-3-small' },
        { label: 'text-embedding-3-large', id: 'text-embedding-3-large' },
        { label: 'text-embedding-ada-002', id: 'text-embedding-ada-002' },
      ],
      value: () => 'text-embedding-3-small',
    },
    {
      id: 'apiKey',
      title: 'API Key',
      type: 'short-input',
      placeholder: 'Enter your OpenAI API key',
      password: true,
      required: true,
    },
  ],
  tools: {
    access: ['openai_embeddings'],
  },
  inputs: {
    input: { type: 'string', description: 'Text to embed' },
    model: { type: 'string', description: 'Embedding model' },
    apiKey: { type: 'string', description: 'OpenAI API key' },
  },
  outputs: {
    embeddings: { type: 'json', description: 'Generated embeddings' },
    model: { type: 'string', description: 'Model used' },
    usage: { type: 'json', description: 'Token usage' },
  },
}

export const OpenAIBlockMeta = {
  tags: ['llm', 'vector-search'],
  templates: [
    {
      icon: OpenAIIcon,
      title: 'Document embedding pipeline',
      prompt:
        'Build a workflow that watches a files folder, chunks each new document, generates embeddings with OpenAI, and upserts vectors into Pinecone with rich metadata for retrieval.',
      modules: ['files', 'knowledge-base', 'agent', 'workflows'],
      category: 'engineering',
      tags: ['automation', 'sync'],
      alsoIntegrations: ['pinecone'],
    },
    {
      icon: OpenAIIcon,
      title: 'Multimodal report builder',
      prompt:
        'Create a workflow that takes a topic, generates a written report with OpenAI, produces matching hero images with the OpenAI image model, and saves the bundle as a single file deliverable.',
      modules: ['agent', 'files', 'workflows'],
      category: 'marketing',
      tags: ['content', 'automation'],
    },
    {
      icon: OpenAIIcon,
      title: 'OpenAI structured-output evaluator',
      prompt:
        'Build a workflow that runs a tables of test inputs through an OpenAI structured-output schema, compares against expected outputs, and writes pass/fail and diff reasons to an evaluation table.',
      modules: ['tables', 'agent', 'workflows'],
      category: 'engineering',
      tags: ['engineering', 'analysis'],
    },
    {
      icon: OpenAIIcon,
      title: 'OpenAI image asset factory',
      prompt:
        'Create a workflow that takes a list of product names from a table, generates on-brand product images with OpenAI, saves them as files, and writes the file URL back to the row.',
      modules: ['tables', 'files', 'agent', 'workflows'],
      category: 'marketing',
      tags: ['marketing', 'content'],
    },
  ],
} as const satisfies BlockMeta
