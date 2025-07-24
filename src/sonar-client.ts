import axios, { AxiosInstance } from 'axios';

export interface SonarConfig {
  baseUrl: string;
  token: string;
}

export interface ProjectInfo {
  key: string;
  name: string;
  qualifier: string;
  visibility: string;
}

export interface Metric {
  key: string;
  name: string;
  description: string;
  type: string;
}

export interface Issue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  message: string;
  line?: number;
  status: string;
  type: string;
}

export interface UserSession {
  userId: string;
  token: string;
  baseUrl: string;
  lastActivity: Date;
}

export class SonarClient {
  private client: AxiosInstance;

  constructor(config: SonarConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  static createFromSession(session: UserSession): SonarClient {
    return new SonarClient({
      baseUrl: session.baseUrl,
      token: session.token
    });
  }

  async getProjects(): Promise<ProjectInfo[]> {
    const response = await this.client.get('/api/projects/search');
    return response.data.components;
  }

  async getProjectMetrics(projectKey: string, metrics: string[] = ['ncloc', 'bugs', 'vulnerabilities', 'code_smells', 'coverage'], branch?: string): Promise<any> {
    const params: any = {
      component: projectKey,
      metricKeys: metrics.join(',')
    };
    if (branch) {
      params.branch = branch;
      console.error(`DEBUG: Requesting metrics for branch: ${branch}`);
    }
    
    console.error(`DEBUG: Request params:`, JSON.stringify(params));
    const response = await this.client.get('/api/measures/component', { params });
    return response.data.component;
  }

  async getIssues(projectKey: string, severity?: string, type?: string, branch?: string): Promise<Issue[]> {
    const params: any = { componentKeys: projectKey };
    if (severity) params.severities = severity;
    if (type) params.types = type;
    if (branch) params.branch = branch;
    
    const response = await this.client.get('/api/issues/search', { params });
    return response.data.issues;
  }

  async getQualityGate(projectKey: string, branch?: string): Promise<any> {
    const params: any = { projectKey };
    if (branch) params.branch = branch;
    
    const response = await this.client.get('/api/qualitygates/project_status', { params });
    return response.data.projectStatus;
  }

  async getProjectBranches(projectKey: string): Promise<any[]> {
    const response = await this.client.get('/api/project_branches/list', {
      params: { project: projectKey }
    });
    return response.data.branches;
  }

  async getBranchMetrics(projectKey: string, branch: string, metrics: string[] = ['ncloc', 'bugs', 'vulnerabilities', 'code_smells', 'coverage']): Promise<any> {
    const response = await this.client.get('/api/measures/component', {
      params: {
        component: projectKey,
        branch: branch,
        metricKeys: metrics.join(',')
      }
    });
    return response.data.component;
  }

  async searchMetrics(search?: string): Promise<any> {
    const params: any = {};
    if (search) params.f = 'name,description,type';
    if (search) params.ps = 100;
    
    const response = await this.client.get('/api/metrics/search', { params });
    return response.data;
  }

  async getLanguages(): Promise<any> {
    const response = await this.client.get('/api/languages/list');
    return response.data.languages;
  }

  async changeIssueStatus(issueKey: string, transition: string): Promise<any> {
    const response = await this.client.post('/api/issues/do_transition', {
      issue: issueKey,
      transition: transition
    });
    return response.data;
  }

  async getSystemStatus(): Promise<any> {
    const response = await this.client.get('/api/system/status');
    return response.data;
  }
}

export class MultiClientSonarManager {
  private sessions: Map<string, UserSession> = new Map();
  private clients: Map<string, SonarClient> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  authenticateUser(userId: string, token: string, baseUrl: string): boolean {
    try {
      const session: UserSession = {
        userId,
        token,
        baseUrl,
        lastActivity: new Date()
      };
      
      const client = SonarClient.createFromSession(session);
      
      this.sessions.set(userId, session);
      this.clients.set(userId, client);
      
      console.error(`User ${userId} authenticated successfully`);
      return true;
    } catch (error) {
      console.error(`Authentication failed for user ${userId}:`, error);
      return false;
    }
  }

  getClientForUser(userId: string): SonarClient | null {
    const session = this.sessions.get(userId);
    if (!session) {
      return null;
    }

    // Check session timeout
    const now = new Date();
    if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      this.removeUser(userId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return this.clients.get(userId) || null;
  }

  removeUser(userId: string): void {
    this.sessions.delete(userId);
    this.clients.delete(userId);
    console.error(`User ${userId} session removed`);
  }

  getActiveUsers(): string[] {
    return Array.from(this.sessions.keys());
  }

  cleanupExpiredSessions(): void {
    const now = new Date();
    for (const [userId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
        this.removeUser(userId);
      }
    }
  }
}