import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export function registerFetch(server: McpServer, api: TodoistApi) {
    server.tool(
        'fetch',
        'Retrieve complete item content by ID from Todoist',
        {
            id: z.string().describe('Item ID (e.g., task-123, project-456)'),
        },
        { readOnlyHint: true },
        async ({ id }) => {
            if (!id) {
                throw new Error('Item ID is required')
            }

            try {
                const [type, itemId] = id.split('-', 2)

                if (!type || !itemId) {
                    throw new Error('Invalid ID format. Expected format: task-123 or project-456')
                }

                let result: any = null

                if (type === 'task') {
                    const task = await api.getTask(itemId)
                    result = {
                        id: id,
                        title: task.content,
                        text:
                            `**Task:** ${task.content}\n\n` +
                            `**Description:** ${task.description || 'No description'}\n\n` +
                            `**Project:** ${task.projectId || 'No project'}\n\n` +
                            `**Labels:** ${(task as any).labels?.join(', ') || 'No labels'}\n\n` +
                            `**Priority:** ${task.priority || 1}\n\n` +
                            `**Due:** ${(task as any).due?.string || 'No due date'}\n\n` +
                            `**Completed:** ${(task as any).completedAt ? 'Yes' : 'No'}`,
                        url: `https://todoist.com/app/task/${task.id}`,
                        metadata: {
                            type: 'task',
                            projectId: task.projectId,
                            labels: (task as any).labels,
                            priority: task.priority,
                            due: (task as any).due,
                        },
                    }
                } else if (type === 'project') {
                    const project = await api.getProject(itemId)
                    result = {
                        id: id,
                        title: project.name,
                        text:
                            `**Project:** ${project.name}\n\n` +
                            `**Color:** ${project.color || 'default'}\n\n` +
                            `**Is Shared:** ${(project as any).isShared || false}\n\n` +
                            `**Is Favorite:** ${(project as any).isFavorite || false}`,
                        url: `https://todoist.com/app/project/${project.id}`,
                        metadata: {
                            type: 'project',
                            color: project.color,
                        },
                    }
                } else {
                    throw new Error(
                        `Unsupported item type: ${type}. Supported types: task, project`,
                    )
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(result),
                        },
                    ],
                }
            } catch (error) {
                console.error('Fetch error:', error)
                throw new Error(
                    `Failed to fetch item: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
            }
        },
    )
}
