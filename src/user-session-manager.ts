#!/usr/bin/env node

import { SonarClient } from './sonar-client.js';

export interface UserSession {
  userId: string;
  token: string;
  baseUrl: string;
  lastActivity: Date;
  client: SonarClient;
}

export class UserSessionManager {
  private sessions: Map<string, UserSession> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private defaultToken: string | null = null;
  private defaultUrl: string | null = null;

  constructor() {
    this.defaultToken = process.env.SONARQUBE_TOKEN || null;
    this.defaultUrl = process.env.SONARQUBE_URL || null;
    
    // Auto-authenticate with default credentials if available
    if (this.defaultToken && this.defaultUrl) {
      this.authenticateUser('default', this.defaultToken, this.defaultUrl);
    }
  }

  authenticateUser(userId: string, token?: string, baseUrl?: string): boolean {
    try {
      const finalToken = token || this.defaultToken;
      const finalUrl = baseUrl || this.defaultUrl;
      
      if (!finalToken || !finalUrl) {
        throw new Error('Token and URL are required');
      }

      const client = new SonarClient({ baseUrl: finalUrl, token: finalToken });
      
      const session: UserSession = {
        userId,
        token: finalToken,
        baseUrl: finalUrl,
        lastActivity: new Date(),
        client
      };
      
      this.sessions.set(userId, session);
      console.error(`User ${userId} authenticated successfully`);
      return true;
    } catch (error) {
      console.error(`Authentication failed for user ${userId}:`, error);
      return false;
    }
  }

  getClientForUser(userId: string): SonarClient | null {
    // Try specific user first, then fall back to default
    let session = this.sessions.get(userId);
    if (!session && userId !== 'default') {
      session = this.sessions.get('default');
    }
    
    if (!session) {
      return null;
    }

    // Check session timeout
    const now = new Date();
    if (now.getTime() - session.lastActivity.getTime() > this.SESSION_TIMEOUT) {
      this.removeUser(session.userId);
      return null;
    }

    // Update last activity
    session.lastActivity = now;
    return session.client;
  }

  removeUser(userId: string): void {
    this.sessions.delete(userId);
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