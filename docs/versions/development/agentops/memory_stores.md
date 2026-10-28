# Memory Stores

::: info Documentation in progress
This page covers document management for existing RAG stores. Store deployment, configuration, and Graph Memory workflows are still being documented.
:::

Memory Stores persist context for agents to retrieve through Memory MCP tools. Stores belong to the selected workspace.

The document workflow below is available only for **RAG + pgvector** stores, currently marked **Experimental**. **Graphiti + Neo4j** stores provide graph memory and don't have a **Documents** tab.

## Open a Store's Documents

1. Select the workspace and open **Memory** in the sidebar.
2. Under **Deployed Memory Systems**, open an existing **RAG + pgvector** store by selecting its name or **Details**.
3. Select **Documents**. **Uploaded Documents** lists files added through this workflow, not memories added through MCP tools.

Workspace owners, workspace admins, and platform admins can upload and delete documents. Other users with workspace access can view the list, but don't see upload, selection, or deletion controls. An editor role alone isn't enough to manage documents.

## Upload or Replace Documents

1. Select **Add documents** and choose up to 10 files. Upload starts as soon as you select them; there's no separate submit step.
2. Wait for **Adding documents...** to finish. The page reports how many documents were added, refreshes the list, and shows any per-file errors.
3. To replace a document, upload a file with exactly the same filename. It replaces the stored content and embeddings rather than adding a second document.

Each file must be UTF-8 text with a `.txt`, `.md`, or `.markdown` extension, no larger than **1 MiB (1,048,576 bytes) per file**. Empty or whitespace-only files and binary content are rejected. Filenames must be plain names without path separators or control characters and at most 255 characters long. PDFs and other document formats aren't supported.

A batch can partly succeed. Check the per-file errors, correct the failed files, and select them again to retry. Uploaded text becomes available through the store's existing Memory tools.

## Delete Documents

1. In **Uploaded Documents**, select the checkboxes next to the files to remove.
2. Select **Delete selected documents**.
3. Review the filenames and confirm with **Delete documents**.

Deletion removes the selected documents' content and embeddings. Unselected documents and MCP-added memories aren't changed. Wait for **Deleting documents...** to finish, then check the deleted count and any errors. The list refreshes automatically; retry only the files that failed.

## Troubleshoot Document Operations

If the list can't load, check that the Memory runtime is available, then reload the page. For an upload or deletion error, check your workspace access and the runtime before retrying. Upload and delete controls are disabled while an operation is running.
