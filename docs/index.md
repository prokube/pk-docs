# Welcome to prokube.ai

prokube.ai is a Kubernetes-native AI platform for teams that need to run AI workloads on infrastructure they control.

Most of prokube.ai is built from established open-source tools. We are huge fans of the open-source ecosystem and contribute changes back whenever they are useful beyond our own platform. prokube.ai is the integration and operations layer around that ecosystem: it turns a fragmented set of tools into a coherent platform with sane defaults and shared operational concerns such as tested upgrade paths, workspace and user management, observability, storage integration, audit trails, and operational guardrails.

For convenience, we add our own UI to the mix. It helps users configure, connect, and operate the underlying open-source components without having to write YAML or run a long series of `kubectl` commands for every common task. However, the UI is not required to use the platform. Production workloads, from classic ML models to agent systems, can still be developed and operated through APIs, SDKs, Kubernetes resources, GitOps, and the underlying tools directly.

The platform is organized around two product tracks, Labs for interactive development, and a shared foundation:

- **AgentOps** for building and operating AI agents with governed model access, tools, memory, and isolated code execution.
- **MLOps** for developing, training, tracking, and serving machine learning models.
- **Labs** for interactive development environments such as JupyterLab, VS Code, RStudio, and OpenCode.

Both tracks use the same platform foundation: workspaces, identity, access control, storage, observability, GitOps operations, and Kubernetes infrastructure.

## Documentation Structure

### AgentOps

AgentOps covers the runtime layer for production AI agents: Agent Gateway, Sandboxes, MCP servers, memory stores, and agent runtimes.

### MLOps

MLOps covers the classic machine learning lifecycle: pipelines, MLflow, model serving, GPU workloads, and data science workflows.

### Labs

Labs cover interactive development environments for experiments, notebooks, prototypes, data exploration, and agent or tool development.

### Platform Foundation

The foundation contains the shared services used by both tracks: users, workspaces, storage, API access, monitoring, logging, and Kubernetes integration.

### Admin

Admin documentation covers installation, operations, upgrades, identity, observability, storage providers, backups, and troubleshooting.
