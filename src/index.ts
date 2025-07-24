#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SonarClient, SonarConfig } from './sonar-client.js';
import { UserSessionManager } from './user-session-manager.js';

class SonarMCPServer {
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
          name: 'get_issues',
          description: 'Get issues for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'Project key' },
              severity: { type: 'string', description: 'Filter by severity' },
              type: { type: 'string', description: 'Filter by type' },
              branch: { type: 'string', description: 'Branch name (optional)' }
            },
            required: ['projectKey']
          }
        },
        {
          name: 'get_quality_gate',
          description: 'Get quality gate status for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'Project key' },
              branch: { type: 'string', description: 'Branch name (optional)' }
            },
            required: ['projectKey']
          }
        },
        {
          name: 'get_project_branches',
          description: 'Get all branches for a project',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'Project key' }
            },
            required: ['projectKey']
          }
        },
        {
          name: 'get_branch_metrics',
          description: 'Get metrics for a specific branch',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'Project key' },
              branch: { type: 'string', description: 'Branch name' },
              metrics: { type: 'array', items: { type: 'string' }, description: 'Metrics to retrieve' }
            },
            required: ['projectKey', 'branch']
          }
        },
        {
          name: 'analyze_project_branches',
          description: 'Complete analysis of all project branches',
          inputSchema: {
            type: 'object',
            properties: {
              projectKey: { type: 'string', description: 'Project key' }
            },
            required: ['projectKey']
          }
        },
        {
          name: 'search_metrics',
          description: 'Search available metrics',
          inputSchema: {
            type: 'object',
            properties: {
              search: { type: 'string', description: 'Search term (optional)' }
            }
          }
        },
        {
          name: 'list_languages',
          description: 'List supported languages',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'change_issue_status',
          description: 'Change status of an issue',
          inputSchema: {
            type: 'object',
            properties: {
              issueKey: { type: 'string', description: 'Issue key' },
              transition: { type: 'string', description: 'Transition (confirm, resolve, reopen, falsepositive, wontfix)' }
            },
            required: ['issueKey', 'transition']
          }
        },
        {
          name: 'get_system_status',
          description: 'Get SonarQube system status',
          inputSchema: { type: 'object', properties: {} }
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
          
          case 'get_issues':
            return this.getIssues(args as { projectKey: string; severity?: string; type?: string; branch?: string });
          
          case 'get_quality_gate':
            return this.getQualityGate(args as { projectKey: string; branch?: string });
          
          case 'get_project_branches':
            return this.getProjectBranches(args as { projectKey: string });
          
          case 'get_branch_metrics':
            return this.getBranchMetrics(args as { projectKey: string; branch: string; metrics?: string[] });
          
          case 'analyze_project_branches':
            return this.analyzeProjectBranches(args as { projectKey: string });
          
          case 'search_metrics':
            return this.searchMetrics(args as { search?: string });
          
          case 'list_languages':
            return this.listLanguages();
          
          case 'change_issue_status':
            return this.changeIssueStatus(args as { issueKey: string; transition: string });
          
          case 'get_system_status':
            return this.getSystemStatus();
          
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
          text: `Found ${projects.length} projects:\n${projects.map(p => `- ${p.name} (${p.key})`).join('\n')}`
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
          text: `Metrics for ${args.projectKey}${branchInfo}:\n${JSON.stringify(metrics, null, 2)}`
        }
      ]
    };
  }

  private async getIssues(args: { projectKey: string; severity?: string; type?: string; branch?: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const issues = await this.sonarClient.getIssues(args.projectKey, args.severity, args.type, args.branch);
    const branchInfo = args.branch ? ` (${args.branch})` : '';
    
    return {
      content: [
        {
          type: 'text',
          text: `Found ${issues.length} issues for ${args.projectKey}${branchInfo}:\n${issues.slice(0, 10).map(i => `- ${i.severity}: ${i.message} (${i.rule})`).join('\n')}${issues.length > 10 ? '\n... and more' : ''}`
        }
      ]
    };
  }

  private async getQualityGate(args: { projectKey: string; branch?: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const qualityGate = await this.sonarClient.getQualityGate(args.projectKey, args.branch);
    const branchInfo = args.branch ? ` (${args.branch})` : '';
    
    return {
      content: [
        {
          type: 'text',
          text: `Quality Gate for ${args.projectKey}${branchInfo}: ${qualityGate.status}\n${JSON.stringify(qualityGate, null, 2)}`
        }
      ]
    };
  }

  private async getProjectBranches(args: { projectKey: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const branches = await this.sonarClient.getProjectBranches(args.projectKey);
    
    return {
      content: [
        {
          type: 'text',
          text: `Branches for ${args.projectKey}:\n${branches.map(b => `- ${b.name} (${b.type})`).join('\n')}`
        }
      ]
    };
  }

  private async getBranchMetrics(args: { projectKey: string; branch: string; metrics?: string[] }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const metrics = await this.sonarClient.getBranchMetrics(args.projectKey, args.branch, args.metrics);
    
    return {
      content: [
        {
          type: 'text',
          text: `Metrics for ${args.projectKey} (${args.branch}):\n${JSON.stringify(metrics, null, 2)}`
        }
      ]
    };
  }

  private async analyzeProjectBranches(args: { projectKey: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const branches = await this.sonarClient.getProjectBranches(args.projectKey);
    let analysis = `Complete Analysis for ${args.projectKey}:\n\n`;
    
    for (const branch of branches) {
      analysis += `=== Branch: ${branch.name} (${branch.type}) ===\n`;
      
      try {
        const metrics = await this.sonarClient.getBranchMetrics(args.projectKey, branch.name);
        const issues = await this.sonarClient.getIssues(args.projectKey, undefined, undefined, branch.name);
        const qualityGate = await this.sonarClient.getQualityGate(args.projectKey, branch.name);
        
        analysis += `Metrics:\n`;
        if (metrics.measures && metrics.measures.length > 0) {
          metrics.measures.forEach((m: any) => {
            analysis += `  - ${m.metric}: ${m.value}\n`;
          });
        } else {
          analysis += `  - No metrics available\n`;
        }
        
        analysis += `Issues: ${issues.length}\n`;
        analysis += `Quality Gate: ${qualityGate.status}\n`;
        
        if (branch.analysisDate) {
          analysis += `Last Analysis: ${branch.analysisDate}\n`;
        }
        
      } catch (error) {
        analysis += `Error analyzing branch: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
      }
      
      analysis += `\n`;
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

  private async searchMetrics(args: { search?: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const metrics = await this.sonarClient.searchMetrics(args.search);
    
    return {
      content: [
        {
          type: 'text',
          text: `Available metrics (${metrics.total}):\n${metrics.metrics.slice(0, 20).map((m: any) => `- ${m.key}: ${m.name} (${m.type})`).join('\n')}${metrics.metrics.length > 20 ? '\n... and more' : ''}`
        }
      ]
    };
  }

  private async listLanguages() {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const languages = await this.sonarClient.getLanguages();
    
    return {
      content: [
        {
          type: 'text',
          text: `Supported languages:\n${languages.map((l: any) => `- ${l.key}: ${l.name}`).join('\n')}`
        }
      ]
    };
  }

  private async changeIssueStatus(args: { issueKey: string; transition: string }) {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const result = await this.sonarClient.changeIssueStatus(args.issueKey, args.transition);
    
    return {
      content: [
        {
          type: 'text',
          text: `Issue ${args.issueKey} transitioned to ${args.transition}:\n${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }

  private async getSystemStatus() {
    if (!this.sonarClient) {
      throw new Error('SonarQube not configured. Check environment variables.');
    }

    const status = await this.sonarClient.getSystemStatus();
    
    return {
      content: [
        {
          type: 'text',
          text: `SonarQube System Status:\n- Status: ${status.status}\n- Version: ${status.version}\n${JSON.stringify(status, null, 2)}`
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SonarQube MCP server running on stdio');
  }
}

const server = new SonarMCPServer();
server.run().catch(console.error);