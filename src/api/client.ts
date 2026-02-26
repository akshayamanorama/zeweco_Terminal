
import { Business, User } from '../../types';

const API_BASE = '/api';

let authUserId: string | null = null;
export function setAuthUser(id: string | null) {
    authUserId = id;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit, requireAuth = false): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
    };
    if (requireAuth && authUserId) headers['X-User-Id'] = authUserId;
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export const api = {
    setAuthUser,
    // Businesses
    getBusinesses: () => fetchAPI<Business[]>('/businesses'),
    updateBusiness: (id: string, data: Partial<Business>) =>
        fetchAPI<Business>(`/businesses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // Checklists
    createChecklist: (businessId: string, title: string) =>
        fetchAPI(`/businesses/${businessId}/checklists`, { method: 'POST', body: JSON.stringify({ title }) }),
    updateChecklist: (id: string, title: string) =>
        fetchAPI(`/checklists/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
    deleteChecklist: (id: string) =>
        fetchAPI(`/checklists/${id}`, { method: 'DELETE' }),

    // Tasks
    createTask: (checklistId: string, text: string) =>
        fetchAPI(`/checklists/${checklistId}/tasks`, { method: 'POST', body: JSON.stringify({ text }) }),
    updateTask: (id: string, data: { completed?: boolean; text?: string }) =>
        fetchAPI(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteTask: (id: string) =>
        fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),

    // Auth
    login: (email: string, password?: string) =>
        fetchAPI<User>('/login', { method: 'POST', body: JSON.stringify({ email, password: password || 'password' }) }),

    // Users
    getUsers: () => fetchAPI<User[]>('/users'),
    getCxo: () => fetchAPI<User>('/users/cxo'),
    createUser: (user: Partial<User>) =>
        fetchAPI<User>('/users', { method: 'POST', body: JSON.stringify(user) }),
    deleteUser: (id: string) =>
        fetchAPI(`/users/${id}`, { method: 'DELETE' }),
    updateUserPermissions: (id: string, permissions: string[]) =>
        fetchAPI<User>(`/users/${id}/permissions`, { method: 'PUT', body: JSON.stringify({ permissions }) }),
    updateUserCredentials: (id: string, data: { email?: string; password?: string }) =>
        fetchAPI<User>(`/users/${id}/credentials`, { method: 'PUT', body: JSON.stringify(data) }),
    /** Reset password by email so login works (CXO sets manager password) */
    resetCredentialsByEmail: (email: string, data: { newEmail?: string; newPassword?: string }) =>
        fetchAPI<User>('/users/reset-credentials', { method: 'POST', body: JSON.stringify({ email, ...data }) }, true),

    // Chat (requires X-User-Id)
    getChatThreads: () => fetchAPI<import('../../types').ChatThread[]>('/chat/threads', {}, true),
    createChatThread: (data: { type: 'DIRECT' | 'ENTITY' | 'GROUP'; entityId?: string; otherUserId?: string; memberIds?: string[]; name?: string; avatar?: string }) =>
        fetchAPI<import('../../types').ChatThread>('/chat/threads', { method: 'POST', body: JSON.stringify(data) }, true),
    getChatMessages: (threadId: string) => fetchAPI<import('../../types').ChatMessage[]>(`/chat/threads/${threadId}/messages`, {}, true),
    sendChatMessage: (threadId: string, body: string, messageType: 'USER' | 'SYSTEM' = 'USER', opts?: { replyToMessageId?: string; replyToBody?: string }) =>
        fetchAPI<import('../../types').ChatMessage>(`/chat/threads/${threadId}/messages`, { method: 'POST', body: JSON.stringify({ body, messageType, replyToMessageId: opts?.replyToMessageId, replyToBody: opts?.replyToBody }) }, true),
    markThreadRead: (threadId: string) =>
        fetchAPI<import('../../types').ChatThread>(`/chat/threads/${threadId}/read`, { method: 'PATCH', body: JSON.stringify({}) }, true),
    addGroupMembers: (threadId: string, userIds: string[]) =>
        fetchAPI<import('../../types').ChatThread>(`/chat/threads/${threadId}/members`, { method: 'POST', body: JSON.stringify({ userIds }) }, true),
    updateGroup: (threadId: string, data: { name?: string; avatar?: string }) =>
        fetchAPI<import('../../types').ChatThread>(`/chat/threads/${threadId}`, { method: 'PATCH', body: JSON.stringify(data) }, true),
    removeGroupMember: (threadId: string, userId: string) =>
        fetchAPI<import('../../types').ChatThread>(`/chat/threads/${threadId}/members/${userId}`, { method: 'DELETE' }, true),
    leaveChatThread: (threadId: string) =>
        fetchAPI<{ left: boolean }>(`/chat/threads/${threadId}/leave`, { method: 'POST' }, true),
    deleteGroup: (threadId: string) =>
        fetchAPI<{ deleted: boolean }>(`/chat/threads/${threadId}`, { method: 'DELETE' }, true),

    // Meetings (Instant Meet)
    startMeeting: (entityId: string, meetLink?: string) =>
        fetchAPI<import('../../types').Meeting>(`/entities/${entityId}/meetings/start`, { method: 'POST', body: JSON.stringify({ meetLink: meetLink || undefined }) }, true),
    endMeeting: (entityId: string, meetingId: string) =>
        fetchAPI<{ endTime: string; durationMinutes: number }>(`/entities/${entityId}/meetings/${meetingId}/end`, { method: 'POST' }, true),
    getMeetingHistory: (entityId: string) =>
        fetchAPI<import('../../types').Meeting[]>(`/entities/${entityId}/meetings/history`, {}, true),
};
