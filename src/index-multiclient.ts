#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SonarClient } from './sonar-client.js';
import { UserSessionManager } from './user-session-manager.js';

class MultiClientSonarMCPServer {
  private server: Server;
  private sessionManager: UserSessionManager;

  constructor() {
    this.server = new Server(
      {
        name: 'sonarqube-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.sessionManager = new UserSessionManager();
    this.setupToolHandlers();
    this.startSessionCleanup();
  }

  private startSessionCleanup() {
    setInterval(() => {
      this.sessionManager.cleanupExpiredSessions();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'authenticate_user',
          description: 'Authenticate user with SonarQube credentials',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'Unique user identifier' },
              token: { type: 'string', description: 'SonarQube token (optional if using default)' },
              baseUrl: { type: 'string', description: 'SonarQube URL (optional if using default)' }
            },
            required: ['userId']
          }
        },
        {
          name: 'get_projects',
          description: 'Get all projects from SonarQube',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User identifier' }
            },
            required: ['userId']
          }
        },
        {
          name: 'get_project_metrics',
          description: 'Get metrics for a specific project',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User identifier' },
              projectKey: { type: 'string', description: 'Project key' },
              metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to retrieve' },
              branch: { type: 'string', description: 'Branch name (optional)' }
            },
            required: ['userId', 'projectKey']
          }
        },
        {
          name: 'analyze_project_branches',
          description: 'Complete analysis of all project branches',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string', description: 'User identifier' },
              projectKey: { type: 'string', description: 'Project key' }
            },
            required: ['userId', 'projectKey']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'authenticate_user':
            return this.authenticateUser(args as { userId: string; token?: string; baseUrl?: string });
          
          case 'get_projects':
            return this.getProjects(args as { userId: string });
          
          case 'get_project_metrics':
            return this.getProjectMetrics(args as { userId: string; projectKey: string; metrics?: string[]; branch?: string });
          
          case 'analyze_project_branches':
            return this.analyzeProjectBranches(args as { userId: string; projectKey: string });
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ]
        };
      }
    });
  }

  private async authenticateUser(args: { userId: string; token?: string; baseUrl?: string }) {
    const success = this.sessionManager.authenticateUser(args.userId, args.token, args.baseUrl);
    
    return {
      content: [
        {
          type: 'text',
          text: success ? `User ${args.userId} authenticated successfully` : `Authentication failed for user ${args.userId}`
        }
      ]
    };
  }

  private async getProjects(args: { userId: string }) {
    const client = this.sessionManager.getClientForUser(args.userId);
    if (!client) {
      throw new Error(`User ${args.userId} not authenticated or session expired.`);
    }

    const projects = await client.getProjects();
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${projects.length} projects:\\n${projects.map(p => `- ${p.name} (${p.key})`).join('\\n')}`
        }
      ]
    };
  }

  private async getProjectMetrics(args: { userId: string; projectKey: string; metrics?: string[]; branch?: string }) {
    const client = this.sessionManager.getClientForUser(args.userId);
    if (!client) {
      throw new Error(`User ${args.userId} not authenticated or session expired.`);
    }

    const metrics = await client.getProjectMetrics(args.projectKey, args.metrics, args.branch);
    const branchInfo = args.branch ? ` (${args.branch})` : '';
    
    return {
      content: [
        {
          type: 'text',
          text: `Metrics for ${args.projectKey}${branchInfo}:\\n${JSON.stringify(metrics, null, 2)}`
        }
      ]
    };
  }

  private async analyzeProjectBranches(args: { userId: string; projectKey: string }) {
    const client = this.sessionManager.getClientForUser(args.userId);
    if (!client) {
      throw new Error(`User ${args.userId} not authenticated or session expired.`);
    }

    const branches = await client.getProjectBranches(args.projectKey);
    let analysis = `Complete Analysis for ${args.projectKey}:\\n\\n`;
    
    for (const branch of branches) {
      analysis += `=== Branch: ${branch.name} (${branch.type}) ===\\n`;
      
      try {
        const metrics = await client.getBranchMetrics(args.projectKey, branch.name);
        const issues = await client.getIssues(args.projectKey, undefined, undefined, branch.name);
        const qualityGate = await client.getQualityGate(args.projectKey, branch.name);
        
        analysis += `Metrics:\\n`;
        if (metrics.measures && metrics.measures.length > 0) {
          metrics.measures.forEach((m: any) => {
            analysis += `  - ${m.metric}: ${m.value}\\n`;
          });
        } else {
          analysis += `  - No metrics available\\n`;
        }
        
        analysis += `Issues: ${issues.length}\\n`;
        analysis += `Quality Gate: ${qualityGate.status}\\n`;
        
        if (branch.analysisDate) {
          analysis += `Last Analysis: ${branch.analysisDate}\\n`;
        }
        
      } catch (error) {
        analysis += `Error analyzing branch: ${error instanceof Error ? error.message : 'Unknown error'}\\n`;
      }
      
      analysis += `\\n`;
    }
    
    return {
      content: [
        {
          type: 'text',
          text: analysis
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Multi-client SonarQube MCP server running on stdio');
  }
}

const server = new MultiClientSonarMCPServer();
server.run().catch(console.error);