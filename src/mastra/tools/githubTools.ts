import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import { Octokit } from '@octokit/rest';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

export const createBranchTool = createTool({
  id: "create-github-branch",
  description: "Create a new branch in the GitHub repository for feature development",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner/organization"),
    repo: z.string().describe("Repository name"),
    branchName: z.string().describe("Name for the new branch"),
    baseBranch: z.string().default("main").describe("Base branch to create from (default: main)")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    branchName: z.string(),
    sha: z.string(),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { owner, repo, branchName, baseBranch } = context;
    
    logger?.info('🔧 [CreateBranch] Starting execution', { owner, repo, branchName, baseBranch });
    
    try {
      const github = await getUncachableGitHubClient();
      
      logger?.info('📝 [CreateBranch] Getting base branch reference...');
      
      // Get the base branch reference
      const baseRef = await github.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`
      });
      
      logger?.info('📝 [CreateBranch] Creating new branch...');
      
      // Create the new branch
      const newBranch = await github.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.data.object.sha
      });
      
      logger?.info('✅ [CreateBranch] Branch created successfully');
      
      return {
        success: true,
        branchName,
        sha: newBranch.data.object.sha,
        message: `Branch "${branchName}" created successfully from "${baseBranch}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [CreateBranch] Error occurred', { error: errorMessage });
      return {
        success: false,
        branchName,
        sha: "",
        message: `Failed to create branch: ${errorMessage}`
      };
    }
  }
});

export const commitCodeTool = createTool({
  id: "commit-code-changes",
  description: "Commit code changes to a GitHub repository branch",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner/organization"),
    repo: z.string().describe("Repository name"),
    branch: z.string().describe("Branch name to commit to"),
    message: z.string().describe("Commit message"),
    files: z.array(z.object({
      path: z.string().describe("File path"),
      content: z.string().describe("File content"),
      encoding: z.enum(["utf-8", "base64"]).default("utf-8").describe("File encoding")
    })).describe("Array of files to commit")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    commitSha: z.string().optional(),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { owner, repo, branch, message, files } = context;
    
    logger?.info('🔧 [CommitCode] Starting execution', { owner, repo, branch, message, fileCount: files.length });
    
    try {
      const github = await getUncachableGitHubClient();
      
      logger?.info('📝 [CommitCode] Getting current branch reference...');
      
      // Get current branch reference
      const ref = await github.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${branch}`
      });
      
      logger?.info('📝 [CommitCode] Getting current tree...');
      
      // Get current commit
      const commit = await github.rest.git.getCommit({
        owner,
        repo,
        commit_sha: ref.data.object.sha
      });
      
      logger?.info('📝 [CommitCode] Creating blobs for files...');
      
      // Create blobs for each file
      const blobs = await Promise.all(
        files.map(async (file) => {
          const blob = await github.rest.git.createBlob({
            owner,
            repo,
            content: file.content,
            encoding: file.encoding
          });
          return {
            path: file.path,
            sha: blob.data.sha,
            mode: "100644" as const,
            type: "blob" as const
          };
        })
      );
      
      logger?.info('📝 [CommitCode] Creating new tree...');
      
      // Create new tree
      const tree = await github.rest.git.createTree({
        owner,
        repo,
        base_tree: commit.data.tree.sha,
        tree: blobs
      });
      
      logger?.info('📝 [CommitCode] Creating commit...');
      
      // Create commit
      const newCommit = await github.rest.git.createCommit({
        owner,
        repo,
        message,
        tree: tree.data.sha,
        parents: [ref.data.object.sha]
      });
      
      logger?.info('📝 [CommitCode] Updating branch reference...');
      
      // Update branch reference
      await github.rest.git.updateRef({
        owner,
        repo,
        ref: `heads/${branch}`,
        sha: newCommit.data.sha
      });
      
      logger?.info('✅ [CommitCode] Code committed successfully');
      
      return {
        success: true,
        commitSha: newCommit.data.sha,
        message: `Successfully committed ${files.length} files to branch "${branch}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [CommitCode] Error occurred', { error: errorMessage });
      return {
        success: false,
        message: `Failed to commit code: ${errorMessage}`
      };
    }
  }
});

export const createPullRequestTool = createTool({
  id: "create-pull-request",
  description: "Create a pull request with detailed description and link to Notion task",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner/organization"),
    repo: z.string().describe("Repository name"),
    title: z.string().describe("Pull request title"),
    head: z.string().describe("Branch containing the changes"),
    base: z.string().default("main").describe("Base branch to merge into (default: main)"),
    body: z.string().describe("Pull request description"),
    notionTaskUrl: z.string().optional().describe("URL of the original Notion task"),
    reviewers: z.array(z.string()).optional().describe("GitHub usernames to request reviews from"),
    draft: z.boolean().default(false).describe("Create as draft pull request")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    pullRequestUrl: z.string().optional(),
    pullRequestNumber: z.number().optional(),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { owner, repo, title, head, base, body, notionTaskUrl, reviewers, draft } = context;
    
    logger?.info('🔧 [CreatePullRequest] Starting execution', { owner, repo, title, head, base });
    
    try {
      const github = await getUncachableGitHubClient();
      
      logger?.info('📝 [CreatePullRequest] Creating pull request...');
      
      // Build comprehensive PR body
      let prBody = body;
      if (notionTaskUrl) {
        prBody += `\n\n## Related Task\n- Original Notion Task: ${notionTaskUrl}`;
      }
      prBody += `\n\n## Review Checklist\n- [ ] Code follows ZenQuill coding standards\n- [ ] Tests have been added/updated\n- [ ] Documentation has been updated\n- [ ] No breaking changes introduced\n- [ ] Security considerations addressed`;
      
      // Create pull request
      const pullRequest = await github.rest.pulls.create({
        owner,
        repo,
        title,
        head,
        base,
        body: prBody,
        draft
      });
      
      logger?.info('📝 [CreatePullRequest] Pull request created', { number: pullRequest.data.number });
      
      // Request reviews if specified
      if (reviewers && reviewers.length > 0) {
        logger?.info('📝 [CreatePullRequest] Requesting reviews...');
        await github.rest.pulls.requestReviewers({
          owner,
          repo,
          pull_number: pullRequest.data.number,
          reviewers
        });
      }
      
      logger?.info('✅ [CreatePullRequest] Pull request created successfully');
      
      return {
        success: true,
        pullRequestUrl: pullRequest.data.html_url,
        pullRequestNumber: pullRequest.data.number,
        message: `Pull request #${pullRequest.data.number} created successfully`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [CreatePullRequest] Error occurred', { error: errorMessage });
      return {
        success: false,
        message: `Failed to create pull request: ${errorMessage}`
      };
    }
  }
});

export const getRepositoryContentTool = createTool({
  id: "get-repository-content",
  description: "Get the content of files from a GitHub repository for codebase analysis",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner/organization"),
    repo: z.string().describe("Repository name"),
    path: z.string().default("").describe("Path to directory or file (empty for root)"),
    ref: z.string().optional().describe("Branch or commit SHA (defaults to default branch)")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    items: z.array(z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(["file", "dir"]),
      size: z.number().optional(),
      content: z.string().optional(),
      sha: z.string()
    })),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { owner, repo, path, ref } = context;
    
    logger?.info('🔧 [GetRepositoryContent] Starting execution', { owner, repo, path, ref });
    
    try {
      const github = await getUncachableGitHubClient();
      
      logger?.info('📝 [GetRepositoryContent] Fetching content...');
      
      const response = await github.rest.repos.getContent({
        owner,
        repo,
        path,
        ...(ref ? { ref } : {})
      });
      
      logger?.info('📝 [GetRepositoryContent] Processing content...');
      
      const items = Array.isArray(response.data) ? response.data : [response.data];
      
      const processedItems = await Promise.all(
        items.map(async (item) => {
          const baseItem = {
            name: item.name,
            path: item.path,
            type: item.type as "file" | "dir",
            size: item.size,
            sha: item.sha
          };
          
          // If it's a file and small enough, fetch its content
          if (item.type === 'file' && item.size && item.size < 100000) { // 100KB limit
            try {
              const fileResponse = await github.rest.repos.getContent({
                owner,
                repo,
                path: item.path,
                ...(ref ? { ref } : {})
              });
              
              if ('content' in fileResponse.data && fileResponse.data.content) {
                return {
                  ...baseItem,
                  content: Buffer.from(fileResponse.data.content, 'base64').toString('utf-8')
                };
              }
            } catch (error) {
              logger?.warn('⚠️ [GetRepositoryContent] Could not fetch file content', { path: item.path });
            }
          }
          
          return baseItem;
        })
      );
      
      logger?.info('✅ [GetRepositoryContent] Content retrieved successfully', { itemCount: processedItems.length });
      
      return {
        success: true,
        items: processedItems,
        message: `Retrieved ${processedItems.length} items from ${path || 'root'}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [GetRepositoryContent] Error occurred', { error: errorMessage });
      return {
        success: false,
        items: [],
        message: `Failed to get repository content: ${errorMessage}`
      };
    }
  }
});

export const listRepositoryBranchesTool = createTool({
  id: "list-repository-branches",
  description: "List all branches in a GitHub repository",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner/organization"),
    repo: z.string().describe("Repository name")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    branches: z.array(z.object({
      name: z.string(),
      sha: z.string(),
      protected: z.boolean()
    })),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { owner, repo } = context;
    
    logger?.info('🔧 [ListBranches] Starting execution', { owner, repo });
    
    try {
      const github = await getUncachableGitHubClient();
      
      logger?.info('📝 [ListBranches] Fetching branches...');
      
      const response = await github.rest.repos.listBranches({
        owner,
        repo
      });
      
      const branches = response.data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected
      }));
      
      logger?.info('✅ [ListBranches] Branches retrieved successfully', { branchCount: branches.length });
      
      return {
        success: true,
        branches,
        message: `Found ${branches.length} branches`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [ListBranches] Error occurred', { error: errorMessage });
      return {
        success: false,
        branches: [],
        message: `Failed to list branches: ${errorMessage}`
      };
    }
  }
});