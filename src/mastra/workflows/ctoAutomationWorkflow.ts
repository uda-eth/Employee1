import { createWorkflow, createStep } from "../inngest";
import { z } from "zod";

// Define the main automation workflow step
const taskDiscoveryStep = createStep({
  id: "task-discovery-step",
  description: "Discover and process new tasks from Notion kanban board",
  inputSchema: z.object({}) as any, // Empty object schema for time-based trigger - type assertion to fix generic constraint
  outputSchema: z.object({
    tasksProcessed: z.number(),
    completedTasks: z.array(z.string()),
    errors: z.array(z.string()),
    summary: z.string()
  }),
  
  execute: async ({ mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🚀 [CTOAutomation] Starting autonomous CTO workflow execution');
    
    try {
      // Get the CTO agent
      const ctoAgent = mastra?.getAgent('ctoAgent');
      if (!ctoAgent) {
        throw new Error('CTO Agent not found - ensure it is registered in the Mastra instance');
      }
      
      logger?.info('🤖 [CTOAutomation] CTO Agent loaded successfully');
      
      // Execute the main autonomous development cycle
      const response = await ctoAgent.generate([
        {
          role: "system",
          content: `You are starting your autonomous development cycle. Use these configuration values for your tools:

**Required Configuration:**
- Notion Database ID: ${process.env.NOTION_DATABASE_ID || '[REQUIRED: Set NOTION_DATABASE_ID environment variable]'}
- GitHub Owner: ${process.env.GITHUB_OWNER || '[REQUIRED: Set GITHUB_OWNER environment variable]'}
- GitHub Repository: ${process.env.GITHUB_REPO || '[REQUIRED: Set GITHUB_REPO environment variable]'}
- Base Branch: ${process.env.GITHUB_BASE_BRANCH || 'main'}

Follow your instructions to:

1. Check for new tasks in the Notion kanban board using readKanbanBoard tool with:
   - databaseId: "${process.env.NOTION_DATABASE_ID || '[SET_NOTION_DATABASE_ID]'}"
   - statusFilter: "To Do"

2. **IMPORTANT: Process ONLY ONE task per execution run to avoid context overflows**
   
   For the FIRST task found (ignore others for now):
   - Use queryTaskDetails to get full requirements
   - Move task to 'In Progress' using updateTaskStatus  
   - Use GitHub tools with owner: "${process.env.GITHUB_OWNER || '[SET_GITHUB_OWNER]'}" and repo: "${process.env.GITHUB_REPO || '[SET_GITHUB_REPO]'}"
   - Follow your complete development workflow (lay-of-land → build → code review)
   - Create pull request and update task status to 'Done'
   - Add completion comment with PR link

**CRITICAL: Stop after completing ONE task. Do not attempt to process multiple tasks in a single run.**

Return a summary of the ONE task you completed.`
        }
      ], {
        resourceId: "cto-automation",
        threadId: `cto-session-${new Date().toISOString()}`,
        maxSteps: 20, // Reduced from 50 to prevent context overflows - focus on ONE task
        onStepFinish: ({ text, toolCalls, toolResults }) => {
          logger?.info('📝 [CTOAutomation] Agent step completed', { 
            text: text?.substring(0, 200) + '...',
            toolCallCount: toolCalls?.length || 0,
            toolResultCount: toolResults?.length || 0
          });
        }
      });
      
      logger?.info('✅ [CTOAutomation] Agent execution completed', { 
        responseLength: response.text.length 
      });
      
      // Parse the agent's response to extract metrics
      const agentResponse = response.text;
      
      // Extract basic metrics from the response (simplified parsing)
      const tasksProcessedMatch = agentResponse.match(/(\d+)\s*tasks?\s*(processed|completed|handled)/i);
      const tasksProcessed = tasksProcessedMatch ? parseInt(tasksProcessedMatch[1]) : 0;
      
      const completedTasks = [];
      const pullRequestMatches = agentResponse.match(/pull request[s]?\s*[#]?(\d+)/gi);
      if (pullRequestMatches) {
        completedTasks.push(...pullRequestMatches);
      }
      
      const errors = [];
      if (agentResponse.toLowerCase().includes('error') || agentResponse.toLowerCase().includes('failed')) {
        errors.push('Some tasks encountered errors - check agent logs for details');
      }
      
      const summary = `CTO Automation completed: ${tasksProcessed} tasks processed, ${completedTasks.length} pull requests created. Agent response: ${agentResponse.substring(0, 500)}${agentResponse.length > 500 ? '...' : ''}`;
      
      logger?.info('📊 [CTOAutomation] Workflow summary', {
        tasksProcessed,
        completedTasksCount: completedTasks.length,
        errorsCount: errors.length
      });
      
      return {
        tasksProcessed,
        completedTasks,
        errors,
        summary
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [CTOAutomation] Workflow execution failed', { error: errorMessage });
      
      return {
        tasksProcessed: 0,
        completedTasks: [],
        errors: [`Workflow execution failed: ${errorMessage}`],
        summary: `CTO Automation failed: ${errorMessage}`
      };
    }
  }
});

const notificationStep = createStep({
  id: "notification-step", 
  description: "Send notifications and reports about the automation cycle",
  inputSchema: z.object({
    tasksProcessed: z.number(),
    completedTasks: z.array(z.string()),
    errors: z.array(z.string()),
    summary: z.string()
  }),
  outputSchema: z.object({
    notificationsSent: z.number(),
    reportGenerated: z.boolean()
  }),
  
  execute: async ({ inputData, mastra }) => {
    const logger = mastra?.getLogger();
    const { tasksProcessed, completedTasks, errors, summary } = inputData;
    
    logger?.info('📢 [CTOAutomation] Sending notifications and generating reports');
    
    try {
      // Log comprehensive automation report
      logger?.info('📋 [CTOAutomation] Daily Report', {
        timestamp: new Date().toISOString(),
        tasksProcessed,
        pullRequestsCreated: completedTasks.length,
        errors: errors.length,
        summary,
        completedTasks,
        errorDetails: errors
      });
      
      // In a production environment, this could:
      // - Send Slack notifications to the team
      // - Update a dashboard with metrics
      // - Send email reports to stakeholders
      // - Update project management tools
      
      const notificationsSent = 1; // Console/log notification sent
      const reportGenerated = true;
      
      logger?.info('✅ [CTOAutomation] Notifications and reporting completed');
      
      return {
        notificationsSent,
        reportGenerated
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [CTOAutomation] Notification step failed', { error: errorMessage });
      
      return {
        notificationsSent: 0,
        reportGenerated: false
      };
    }
  }
});

// Create the main CTO automation workflow
export const ctoAutomationWorkflow = createWorkflow({
  id: "cto-automation-workflow",
  description: "Autonomous CTO workflow that continuously monitors Notion kanban boards, completes development tasks, and creates production-ready pull requests",
  inputSchema: z.object({}) as any, // Empty object schema since this is triggered by cron - type assertion to fix generic constraint
  outputSchema: z.object({
    workflowExecuted: z.boolean(),
    tasksProcessed: z.number(),
    completedTasks: z.array(z.string()),
    errors: z.array(z.string()),
    summary: z.string(),
    notificationsSent: z.number(),
    reportGenerated: z.boolean()
  })
})
  .then(taskDiscoveryStep)
  .then(notificationStep)
  .commit();