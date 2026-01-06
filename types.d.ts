import { Request } from 'express';
import { Socket } from 'socket.io';

// ==================== Enums ====================

export enum UserRole {
    MEMBER = 'MEMBER',
    MANAGER = 'MANAGER'
}

export enum TaskStatus {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    CANCELED = 'CANCELED'
}

export enum TaskPriority {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH'
}

export enum EventType {
    MEETING = 'MEETING',
    DEADLINE = 'DEADLINE',
    EVENT = 'EVENT'
}

export enum NotificationType {
    TEAM_INVITATION = 'TEAM_INVITATION',
    NEW_COMMENT = 'NEW_COMMENT',
    TASK_ASSIGNED = 'TASK_ASSIGNED',
    EVENT = 'EVENT',
    PROJECT_UPDATE = 'PROJECT_UPDATE'
}

export enum InvitationStatus {
    PENDING = 'PENDING',
    ACCEPTED = 'ACCEPTED',
    DECLINED = 'DECLINED'
}

// ==================== User Related ====================

export interface User {
    id: string;
    email: string;
    password?: string;
    name: string;
    role: UserRole;
    avatar?: string;
    createdAt: Date;
    updatedAt: Date;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
}

export interface UserPayload {
    id: string;
    email: string;
    role: string;
    name: string;
}

export interface AuthRequest extends Request {
    user?: UserPayload;
}

// ==================== Socket Related ====================

export interface SocketUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface AuthenticatedSocket extends Socket {
    user?: SocketUser;
}

// ==================== Project Related ====================

export interface Project {
    id: string;
    name: string;
    description?: string;
    status: string;
    progress: number;
    startDate: Date;
    endDate: Date;
    budget: number;
    spent: number;
    managerId: string;
    teamId?: string;
    priority: TaskPriority;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProjectDTO {
    name: string;
    description?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    budget?: number;
    teamId?: string;
}

export interface UpdateProjectDTO {
    name?: string;
    description?: string;
    status?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    budget?: number;
}

// ==================== Task Related ====================

export interface Task {
    id: string;
    name: string;
    description?: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate?: Date;
    label: string[];
    order: number;
    budget: number;
    projectId: string;
    sectionId: string;
    assignedToId?: string;
    createdById: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateTaskDTO {
    name: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | Date;
    label?: string[];
    budget?: number;
    projectId: string;
    sectionId: string;
    assignedToId?: string;
}

export interface UpdateTaskDTO {
    name?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: string | Date;
    label?: string[];
    budget?: number;
    assignedToId?: string;
    sectionId?: string;
}

// ==================== Subtask Related ====================

export interface Subtask {
    id: string;
    title: string;
    completed: boolean;
    taskId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSubtaskDTO {
    title: string;
    taskId: string;
}

export interface ToggleSubtaskDTO {
    completed: boolean;
}

// ==================== Section Related ====================

export interface Section {
    id: string;
    title: string;
    order: number;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSectionDTO {
    title: string;
    projectId: string;
    order?: number;
}

// ==================== Team Related ====================

export interface Team {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TeamMember {
    id: string;
    role: string;
    userId: string;
    teamId: string;
    joinedAt: Date;
    updatedAt: Date;
}

export interface CreateTeamDTO {
    name: string;
    memberIds?: string[];
}

export interface InviteTeamMemberDTO {
    email: string;
    teamId: string;
    role?: string;
}

export interface UpdateMemberRoleDTO {
    role: string;
}

// ==================== Invitation Related ====================

export interface Invitation {
    id: string;
    email: string;
    teamId: string;
    role: string;
    token: string;
    status: InvitationStatus;
    invitedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface AcceptInvitationDTO {
    token: string;
}

// ==================== Calendar/Event Related ====================

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    type: EventType;
    startTime: Date;
    endTime: Date;
    projectId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface EventAttendee {
    id: string;
    userId: string;
    eventId: string;
}

export interface CreateEventDTO {
    title: string;
    description?: string;
    type: EventType;
    startTime: string | Date;
    endTime: string | Date;
    projectId?: string;
    attendees?: string[];
}

export interface GetEventsQuery {
    start?: string;
    end?: string;
    projectId?: string;
}

// ==================== Comment Related ====================

export interface Comment {
    id: string;
    content: string;
    taskId: string;
    authorId: string;
    attachments: string[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCommentDTO {
    content: string;
    attachments?: string[];
}

// ==================== Notification Related ====================

export interface Notification {
    id: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateNotificationDTO {
    userId: string;
    type: NotificationType | string;
    title: string;
    message: string;
    data?: any;
}

// ==================== Budget Related ====================

export interface BudgetOverview {
    totalBudget: number;
    totalSpent: number;
    remaining: number;
}

export interface UpdateBudgetDTO {
    budget?: number;
    spent?: number;
}

// ==================== Auth Related ====================

export interface RegisterDTO {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}

export interface LoginDTO {
    email: string;
    password: string;
}

export interface GoogleAuthDTO {
    token: string;
}

export interface EditProfileDTO {
    name?: string;
    avatar?: string;
}

export interface ChangePasswordDTO {
    currentPassword: string;
    newPassword: string;
}

export interface ForgotPasswordDTO {
    email: string;
}

export interface ResetPasswordDTO {
    token: string;
    newPassword: string;
}

// ==================== Response Types ====================

export interface AuthResponse {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        avatar?: string;
    };
}

export interface ApiResponse<T = any> {
    message?: string;
    data?: T;
    error?: string;
}

// ==================== Dashboard/Stats Related ====================

export interface TeamStats {
    totalProjects: number;
    activeProjects: number;
    completedTasks: number;
    totalTasks: number;
    teamMembers: number;
    recentActivity: any[];
}

export interface ProjectStats {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    todoTasks: number;
    progress: number;
}

// ==================== Email Template Related ====================

export interface EmailTemplateData {
    name?: string;
    email?: string;
    teamName?: string;
    inviteLink?: string;
    resetLink?: string;
    token?: string;
}

// ==================== Utility Types ====================

export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;
