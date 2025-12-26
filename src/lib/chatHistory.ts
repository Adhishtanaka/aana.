interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatSession {
  id: string;
  url?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  lastActivity: Date;
}

class ChatHistoryManager {
  private storageKey = 'aana-chat-history';
  private maxSessions = 50;
  private maxAge = 30 * 24 * 60 * 60 * 1000;

  createSession(url?: string): string {
    const id = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const session: ChatSession = {
      id,
      url,
      title: url ? new URL(url).hostname : 'New Chat',
      messages: [],
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    const sessions = this.getAllSessions();
    sessions.unshift(session);
    
    const recentSessions = sessions.slice(0, this.maxSessions);
    this.saveSessions(recentSessions);
    
    return id;
  }

  getSession(id: string): ChatSession | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s.id === id) || null;
  }

  saveMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): void {
    const sessions = this.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) return;

    const messageWithId: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    sessions[sessionIndex].messages.push(messageWithId);
    sessions[sessionIndex].lastActivity = new Date();
    
    this.saveSessions(sessions);
  }

  getAllSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return [];
      
      const sessions = JSON.parse(stored).map((s: any) => ({
        ...s,
        createdAt: new Date(s.createdAt),
        lastActivity: new Date(s.lastActivity),
        messages: s.messages.map((m: any) => ({
          ...m,
          createdAt: new Date(m.createdAt),
        })),
      }));

      const now = Date.now();
      return sessions.filter((s: ChatSession) => 
        now - s.lastActivity.getTime() < this.maxAge
      );
    } catch {
      return [];
    }
  }

  cleanupOldSessions(): void {
    const sessions = this.getAllSessions();
    this.saveSessions(sessions); 
  }

  private saveSessions(sessions: ChatSession[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Failed to save chat history:', e);
      if (sessions.length > 10) {
        this.saveSessions(sessions.slice(0, 10));
      }
    }
  }
}

export const chatHistory = new ChatHistoryManager();