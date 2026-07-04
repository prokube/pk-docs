import { defineConfig } from 'vitepress'

const base = process.env.VITEPRESS_BASE ?? '/docs/'

export default defineConfig({
  title: 'prokube Docs',
  description: 'Documentation for prokube',
  base,
  cleanUrls: false,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', href: `${base}_static/favicon.svg` }],
    ['meta', { name: 'theme-color', content: '#111827' }]
  ],
  markdown: {
    image: {
      lazyLoading: true
    }
  },
  themeConfig: {
    logo: {
      light: '/_static/prokube-logo-positive.svg',
      dark: '/_static/prokube-logo-negative.svg'
    },
    siteTitle: false,
    search: {
      provider: 'local'
    },
    nav: [
      { text: 'Welcome', link: '/' },
      { text: 'Labs', link: '/labs/' },
      { text: 'AgentOps', link: '/agentops/' },
      { text: 'MLOps', link: '/mlops/' },
      { text: 'Foundation', link: '/platform/' },
      { text: 'Admin', link: '/admin/' }
    ],
    sidebar: [
      {
        text: 'Labs',
        collapsed: false,
        items: [
          { text: 'Using Labs', link: '/labs/' },
          { text: 'JupyterLab', link: '/labs/jupyterlab.html' },
          { text: 'VS Code', link: '/labs/vscode.html' },
          { text: 'RStudio', link: '/labs/rstudio.html' },
          { text: 'OpenCode', link: '/labs/opencode.html' },
          { text: 'Custom Notebooks', link: '/labs/custom_notebooks.html' }
        ]
      },
      {
        text: 'AgentOps',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/agentops/' },
          { text: 'Agent Gateway', link: '/agentops/agent_gateway.html' },
          { text: 'Agent Sandboxes', link: '/agentops/sandboxes.html' },
          { text: 'MCP Servers', link: '/agentops/mcp_servers.html' },
          { text: 'Memory Stores', link: '/agentops/memory_stores.html' },
          { text: 'Agents', link: '/agentops/agents.html' }
        ]
      },
      {
        text: 'MLOps',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/mlops/' },
          { text: 'Pipelines', link: '/mlops/pipelines.html' },
          { text: 'Model Serving', link: '/mlops/model_serving.html' },
          { text: 'MLflow', link: '/mlops/mlflow.html' }
        ]
      },
      {
        text: 'Foundation',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/platform/' },
          { text: 'Observability', link: '/platform/observability.html' },
          { text: 'API Access', link: '/platform/api_access.html' },
          { text: 'API Keys', link: '/platform/api_keys.html' }
        ]
      },
      {
        text: 'Admin',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/admin/' }
        ]
      }
    ],
    footer: {
      message: 'Built with open-source tools. Deployed as a static site.',
      copyright: 'Copyright © 2024-2026 prokube.ai GmbH'
    }
  }
})
