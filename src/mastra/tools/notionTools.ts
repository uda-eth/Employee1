import { createTool } from "@mastra/core/tools";
import type { IMastraLogger } from "@mastra/core/logger";
import { z } from "zod";
import { Client } from '@notionhq/client';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

async function getUncachableNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

export const readKanbanBoardTool = createTool({
  id: "read-kanban-board",
  description: "Read tasks from a Notion kanban board database, filtering by status columns",
  inputSchema: z.object({
    databaseId: z.string().describe("The Notion database ID for the kanban board"),
    statusFilter: z.string().optional().describe("Filter tasks by status (e.g., 'To Do', 'In Progress', 'Done')")
  }),
  outputSchema: z.object({
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      description: z.string().optional(),
      assignee: z.string().optional(),
      priority: z.string().optional(),
      createdTime: z.string(),
      lastEditedTime: z.string(),
      url: z.string(),
      properties: z.record(z.any())
    }))
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { databaseId, statusFilter } = context;
    
    logger?.info('🔧 [ReadKanbanBoard] Starting execution', { databaseId, statusFilter });
    
    try {
      const notion = await getUncachableNotionClient();
      
      logger?.info('📝 [ReadKanbanBoard] Querying database...');
      
      const filter: any = {};
      if (statusFilter) {
        filter.filter = {
          property: "Status",
          select: {
            equals: statusFilter
          }
        };
      }
      
      const queryParams: any = { database_id: databaseId };
      if (statusFilter) {
        queryParams.filter = {
          property: "Status",
          select: {
            equals: statusFilter
          }
        };
      }
      
      const searchParams: any = {
        filter: {
          value: 'page',
          property: 'object'
        },
        page_size: 100
      };
      
      // For database-specific filtering, we'll filter results after the search
      const response = await notion.search(searchParams);
      
      logger?.info('📝 [ReadKanbanBoard] Processing results', { count: response.results.length });
      
      const tasks = response.results.map((page: any) => {
        const properties = page.properties;
        
        // Extract title from Title or Name property
        const titleProperty = properties.Title || properties.Name || properties.title || properties.name;
        let title = "Untitled";
        if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
          title = titleProperty.title[0].plain_text;
        }
        
        // Extract status
        const statusProperty = properties.Status || properties.status;
        let status = "Unknown";
        if (statusProperty && statusProperty.select) {
          status = statusProperty.select.name;
        }
        
        // Extract description from rich text property
        const descriptionProperty = properties.Description || properties.description;
        let description = "";
        if (descriptionProperty && descriptionProperty.rich_text && descriptionProperty.rich_text.length > 0) {
          description = descriptionProperty.rich_text[0].plain_text;
        }
        
        // Extract assignee
        const assigneeProperty = properties.Assignee || properties.assignee;
        let assignee = "";
        if (assigneeProperty && assigneeProperty.people && assigneeProperty.people.length > 0) {
          assignee = assigneeProperty.people[0].name;
        }
        
        // Extract priority
        const priorityProperty = properties.Priority || properties.priority;
        let priority = "";
        if (priorityProperty && priorityProperty.select) {
          priority = priorityProperty.select.name;
        }
        
        return {
          id: page.id,
          title,
          status,
          description,
          assignee,
          priority,
          createdTime: page.created_time,
          lastEditedTime: page.last_edited_time,
          url: page.url,
          properties
        };
      });
      
      logger?.info('✅ [ReadKanbanBoard] Completed successfully', { taskCount: tasks.length });
      
      return { tasks };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [ReadKanbanBoard] Error occurred', { error: errorMessage });
      throw error;
    }
  }
});

export const updateTaskStatusTool = createTool({
  id: "update-task-status",
  description: "Update the status of a task in the Notion kanban board",
  inputSchema: z.object({
    pageId: z.string().describe("The Notion page ID of the task"),
    newStatus: z.string().describe("The new status to set (e.g., 'To Do', 'In Progress', 'Done', 'Blocked')")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { pageId, newStatus } = context;
    
    logger?.info('🔧 [UpdateTaskStatus] Starting execution', { pageId, newStatus });
    
    try {
      const notion = await getUncachableNotionClient();
      
      logger?.info('📝 [UpdateTaskStatus] Updating page properties...');
      
      await notion.pages.update({
        page_id: pageId,
        properties: {
          Status: {
            select: {
              name: newStatus
            }
          }
        }
      });
      
      logger?.info('✅ [UpdateTaskStatus] Task status updated successfully');
      
      return {
        success: true,
        message: `Task status updated to "${newStatus}"`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [UpdateTaskStatus] Error occurred', { error: errorMessage });
      return {
        success: false,
        message: `Failed to update task status: ${errorMessage}`
      };
    }
  }
});

export const addTaskCommentTool = createTool({
  id: "add-task-comment",
  description: "Add a comment to a task in Notion with progress updates or completion details",
  inputSchema: z.object({
    pageId: z.string().describe("The Notion page ID of the task"),
    comment: z.string().describe("The comment text to add to the task")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string()
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { pageId, comment } = context;
    
    logger?.info('🔧 [AddTaskComment] Starting execution', { pageId, comment });
    
    try {
      const notion = await getUncachableNotionClient();
      
      logger?.info('📝 [AddTaskComment] Adding comment to page...');
      
      await notion.comments.create({
        parent: {
          page_id: pageId
        },
        rich_text: [
          {
            text: {
              content: comment
            }
          }
        ]
      });
      
      logger?.info('✅ [AddTaskComment] Comment added successfully');
      
      return {
        success: true,
        message: "Comment added successfully"
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [AddTaskComment] Error occurred', { error: errorMessage });
      return {
        success: false,
        message: `Failed to add comment: ${errorMessage}`
      };
    }
  }
});

export const queryTaskDetailsTool = createTool({
  id: "query-task-details",
  description: "Get detailed information about a specific task including its full content and properties",
  inputSchema: z.object({
    pageId: z.string().describe("The Notion page ID of the task")
  }),
  outputSchema: z.object({
    task: z.object({
      id: z.string(),
      title: z.string(),
      status: z.string(),
      description: z.string(),
      assignee: z.string().optional(),
      priority: z.string().optional(),
      createdTime: z.string(),
      lastEditedTime: z.string(),
      url: z.string(),
      content: z.string(),
      properties: z.record(z.any())
    })
  }),
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    const { pageId } = context;
    
    logger?.info('🔧 [QueryTaskDetails] Starting execution', { pageId });
    
    try {
      const notion = await getUncachableNotionClient();
      
      logger?.info('📝 [QueryTaskDetails] Retrieving page details...');
      
      // Get page properties
      const page = await notion.pages.retrieve({ page_id: pageId });
      
      // Get page content blocks
      const blocks = await notion.blocks.children.list({
        block_id: pageId
      });
      
      logger?.info('📝 [QueryTaskDetails] Processing page content...');
      
      // Extract content from blocks
      let content = "";
      for (const block of blocks.results as any[]) {
        if (block.type === 'paragraph' && block.paragraph?.rich_text) {
          content += block.paragraph.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (block.type === 'heading_1' && block.heading_1?.rich_text) {
          content += '# ' + block.heading_1.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (block.type === 'heading_2' && block.heading_2?.rich_text) {
          content += '## ' + block.heading_2.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (block.type === 'heading_3' && block.heading_3?.rich_text) {
          content += '### ' + block.heading_3.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item?.rich_text) {
          content += '- ' + block.bulleted_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        } else if (block.type === 'numbered_list_item' && block.numbered_list_item?.rich_text) {
          content += '1. ' + block.numbered_list_item.rich_text.map((text: any) => text.plain_text).join('') + '\n';
        }
      }
      
      // Extract task properties
      const properties = (page as any).properties;
      
      const titleProperty = properties.Title || properties.Name || properties.title || properties.name;
      let title = "Untitled";
      if (titleProperty && titleProperty.title && titleProperty.title.length > 0) {
        title = titleProperty.title[0].plain_text;
      }
      
      const statusProperty = properties.Status || properties.status;
      let status = "Unknown";
      if (statusProperty && statusProperty.select) {
        status = statusProperty.select.name;
      }
      
      const descriptionProperty = properties.Description || properties.description;
      let description = "";
      if (descriptionProperty && descriptionProperty.rich_text && descriptionProperty.rich_text.length > 0) {
        description = descriptionProperty.rich_text[0].plain_text;
      }
      
      const assigneeProperty = properties.Assignee || properties.assignee;
      let assignee = "";
      if (assigneeProperty && assigneeProperty.people && assigneeProperty.people.length > 0) {
        assignee = assigneeProperty.people[0].name;
      }
      
      const priorityProperty = properties.Priority || properties.priority;
      let priority = "";
      if (priorityProperty && priorityProperty.select) {
        priority = priorityProperty.select.name;
      }
      
      const task = {
        id: (page as any).id,
        title,
        status,
        description,
        assignee,
        priority,
        createdTime: (page as any).created_time,
        lastEditedTime: (page as any).last_edited_time,
        url: (page as any).url,
        content: content.trim(),
        properties
      };
      
      logger?.info('✅ [QueryTaskDetails] Task details retrieved successfully');
      
      return { task };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger?.error('❌ [QueryTaskDetails] Error occurred', { error: errorMessage });
      throw error;
    }
  }
});