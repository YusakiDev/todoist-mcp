import type { TodoistApi } from '@doist/todoist-api-typescript'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { getMaxPaginatedResults } from '../utils/get-max-paginated-results.js'

export function registerSearch(server: McpServer, api: TodoistApi) {
    server.tool(
        'search',
        'Search for tasks, projects, and other items in Todoist',
        {
            query: z.string().describe('Search query string'),
        },
        { readOnlyHint: true },
        async ({ query }) => {
            if (!query || !query.trim()) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ results: [] }),
                        },
                    ],
                }
            }

            const results: Array<{
                id: string
                title: string
                url: string
            }> = []

            try {
                // Search tasks
                const tasks = await getMaxPaginatedResults((params) => api.getTasks({ ...params }))

                // Filter tasks that match the query
                const matchingTasks = tasks
                    .filter(
                        (task: any) =>
                            (task.content &&
                                task.content.toLowerCase().includes(query.toLowerCase())) ||
                            (task.description &&
                                task.description.toLowerCase().includes(query.toLowerCase())),
                    )
                    .slice(0, 10) // Limit to 10 tasks

                for (const task of matchingTasks) {
                    const taskObj = task as any
                    results.push({
                        id: `task-${taskObj.id}`,
                        title: taskObj.content,
                        url: `https://todoist.com/app/task/${taskObj.id}`,
                    })
                }

                // Search projects
                const projects = await getMaxPaginatedResults((params) => api.getProjects(params))

                const matchingProjects = projects
                    .filter(
                        (project: any) =>
                            project.name &&
                            project.name.toLowerCase().includes(query.toLowerCase()),
                    )
                    .slice(0, 5) // Limit to 5 projects

                for (const project of matchingProjects) {
                    const projectObj = project as any
                    results.push({
                        id: `project-${projectObj.id}`,
                        title: projectObj.name,
                        url: `https://todoist.com/app/project/${projectObj.id}`,
                    })
                }

                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ results }),
                        },
                    ],
                }
            } catch (error) {
                console.error('Search error:', error)
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({ results: [] }),
                        },
                    ],
                }
            }
        },
    )
}
