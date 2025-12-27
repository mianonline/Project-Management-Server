import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { inviteTeamEmailTemplate, addedToTeamEmailTemplate } from '../utils/EmailTemplate/emailTemplate';
import { mailTransport } from '../utils/EmailTemplate/mail';
import crypto from 'crypto';
import { emitNotification } from '../config/socket';

const prisma = new PrismaClient();

export const createTeam = async (req: AuthRequest, res: Response) => {
    try {
        const { name, memberIds } = req.body; // Expect memberIds array of userIds

        if (!name) return res.status(400).json({ message: "Team name is required" });

        const existingTeam = await prisma.team.findUnique({ where: { name } });
        if (existingTeam) return res.status(400).json({ message: "Team name already exists" });

        // Create team and assign members if provided
        const team = await prisma.team.create({
            data: {
                name,
                members: {
                    create: memberIds && memberIds.length > 0
                        ? memberIds.map((userId: string) => ({ userId }))
                        : []
                }
            },
            include: { members: true }
        });

        // Send notifications and emails to all members
        if (memberIds && memberIds.length > 0) {
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const users = await prisma.user.findMany({
                where: { id: { in: memberIds } }
            });

            for (const member of users) {
                // 1. In-app notification
                const notification = await prisma.notification.create({
                    data: {
                        userId: member.id,
                        type: "TEAM_CREATION",
                        title: "New Team Access",
                        message: `${req.user?.name || "Someone"} added you to team: ${name}`,
                        data: {
                            teamId: team.id,
                            teamName: team.name,
                            addedBy: req.user?.name || "Admin"
                        }
                    }
                });

                // Real-time emit
                emitNotification(member.id, notification);

                // 2. Email alert
                try {
                    const html = addedToTeamEmailTemplate(
                        req.user?.name || "Department Admin",
                        name,
                        `${frontendUrl}/dashboard`
                    );

                    await mailTransport.sendMail({
                        from: `"DEFCON Team" <${process.env.EMAIL_USER}>`,
                        to: member.email,
                        subject: `You've been added to ${name}`,
                        html,
                    });
                } catch (err) {
                    console.error(`Email failed for ${member.email}:`, err);
                }
            }
        }

        res.status(201).json({ team });

    } catch (error) {
        console.error("Create team error:", error);
        res.status(500).json({ message: "Error creating team" });
    }
};


export const getTeam = async (req: AuthRequest, res: Response) => {
    try {
        const { search } = req.query;

        const users = await prisma.team.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: String(search), mode: 'insensitive' } },

                    ]
                }
                : {},
            select: {
                id: true,
                name: true,

            }
        });

        res.json({ users });
    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
};

export const getTeamMembers = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId } = req.query;

        if (!teamId) return res.status(400).json({ message: "Team ID is required" });

        // 1️⃣ TeamMember table se members la lo
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: String(teamId) },
            select: { userId: true } // sirf userId chahiye
        });

        // 2️⃣ Agar koi member nahi
        if (teamMembers.length === 0) {
            return res.status(404).json({ message: "No members found for this team" });
        }

        // 3️⃣ User details fetch karo
        const userIds = teamMembers.map(m => m.userId);

        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, avatar: true, role: true }
        });

        res.json({ users });

    } catch (error) {
        console.error('Get team members error:', error);
        res.status(500).json({ message: 'Error fetching team members' });
    }
};


export const updateMemberRole = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role }
        });

        res.json({ user });
    } catch (error) {
        res.status(500).json({ message: 'Error updating member role' });
    }
};




export const inviteTeamMember = async (req: AuthRequest, res: Response) => {
    try {
        const { email, emails, teamName, role, message } = req.body;

        let emailList: string[] = [];
        if (emails && Array.isArray(emails)) {
            emailList = emails;
        } else if (email) {
            // Support comma separated string as well
            emailList = typeof email === 'string' ? email.split(',').map(e => e.trim()).filter(e => e) : [email];
        }

        if (emailList.length === 0 || !teamName || !role) {
            return res.status(400).json({ message: "Required fields missing" });
        }

        // Find the team
        const team = await prisma.team.findUnique({
            where: { name: teamName }
        });

        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        const results = [];
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

        for (const targetEmail of emailList) {
            try {
                // Generate unique token
                const token = crypto.randomBytes(32).toString('hex');

                // Create invitation in DB
                await prisma.invitation.upsert({
                    where: {
                        email_teamId: {
                            email: targetEmail,
                            teamId: team.id
                        }
                    },
                    update: {
                        token,
                        status: 'PENDING',
                        role,
                        invitedBy: req.user?.id
                    },
                    create: {
                        email: targetEmail,
                        teamId: team.id,
                        role,
                        token,
                        invitedBy: req.user?.id
                    }
                });

                const inviteLink = `${frontendUrl}/invitation/${token}`;
                const html = inviteTeamEmailTemplate(
                    req.user?.name || "Team Admin",
                    teamName,
                    role,
                    inviteLink,
                    message
                );

                await mailTransport.sendMail({
                    from: `"DEFCON Team" <${process.env.EMAIL_USER}>`,
                    to: targetEmail,
                    subject: `You're invited to join ${teamName}`,
                    html,
                });

                // NEW: Create in-app notification if user exists
                const existingUser = await prisma.user.findUnique({
                    where: { email: targetEmail }
                });

                if (existingUser) {
                    const notification = await prisma.notification.create({
                        data: {
                            userId: existingUser.id,
                            type: "TEAM_INVITATION",
                            title: "Team Invitation",
                            message: `${req.user?.name || "Someone"} invited you to join team ${teamName}`,
                            data: {
                                teamId: team.id,
                                teamName: team.name,
                                token: token,
                                invitedBy: req.user?.name || "Team Admin"
                            }
                        }
                    });

                    // Real-time emit
                    emitNotification(existingUser.id, notification);
                }
                results.push({ email: targetEmail, status: 'sent' });
            } catch (err) {
                console.error(`Failed to invite ${targetEmail}:`, err);
                results.push({ email: targetEmail, status: 'failed' });
            }
        }

        return res.status(200).json({
            message: emailList.length > 1 ? "Invitations processed" : "Invitation sent successfully",
            results
        });

    } catch (error) {
        console.error("Invite email error:", error);
        return res.status(500).json({ message: "Failed to process invitations" });
    }
};

export const acceptInvitation = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.params;

        const invitation = await prisma.invitation.findUnique({
            where: { token },
            include: { team: true }
        });

        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found." });
        }

        // Verify identity
        if (req.user?.email !== invitation.email) {
            return res.status(403).json({
                message: `This invitation was sent to ${invitation.email}. You are logged in as ${req.user?.email}.`
            });
        }

        // Check if already accepted
        if (invitation.status === 'ACCEPTED') {
            return res.status(200).json({ message: "You have already accepted this invitation!" });
        }

        if (invitation.status === 'DECLINED') {
            return res.status(400).json({ message: "This invitation was previously declined." });
        }

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: invitation.email }
        });

        if (!user) {
            return res.status(404).json({ message: "User account not found. Please register first." });
        }

        // Check if already in team (even if invitation record is pending)
        const existingMember = await prisma.teamMember.findUnique({
            where: {
                userId_teamId: {
                    userId: user.id,
                    teamId: invitation.teamId
                }
            }
        });

        if (existingMember) {
            // Sync invitation status just in case
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' }
            });
            return res.status(200).json({ message: "You are already a member of this team!" });
        }

        // Add user to team
        await prisma.teamMember.create({
            data: {
                userId: user.id,
                teamId: invitation.teamId,
                role: invitation.role
            }
        });

        // Update invitation status
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        return res.status(200).json({ message: `Successfully joined team ${invitation.team.name}` });

    } catch (error: any) {
        console.error("Accept invitation error:", error);
        return res.status(500).json({ message: "Error processing invitation" });
    }
};

export const declineInvitation = async (req: AuthRequest, res: Response) => {
    try {
        const { token } = req.params;

        const invitation = await prisma.invitation.findUnique({
            where: { token }
        });

        if (!invitation || invitation.status !== 'PENDING') {
            return res.status(400).json({ message: "Invalid or expired invitation" });
        }

        // Verify identity
        if (req.user?.email !== invitation.email) {
            return res.status(403).json({
                message: "You cannot decline an invitation sent to another email."
            });
        }

        // Update invitation status
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'DECLINED' }
        });

        return res.status(200).json({ message: "Invitation declined successfully" });

    } catch (error) {
        console.error("Decline invitation error:", error);
        return res.status(500).json({ message: "Error declining invitation" });
    }
};


export const getTeamStats = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId } = req.params;

        if (!teamId) return res.status(400).json({ message: "Team ID is required" });

        // 1. Get all projects belonging to this team
        const teamProjects = await prisma.project.findMany({
            where: { teamId: String(teamId) },
            select: { id: true, name: true, budget: true, spent: true }
        });

        const projectIds = teamProjects.map(p => p.id);

        // 2. Task Status Counts
        const [completedTasks, totalTasks, overdueTasks] = await Promise.all([
            prisma.task.count({ where: { projectId: { in: projectIds }, status: 'COMPLETED' } }),
            prisma.task.count({ where: { projectId: { in: projectIds } } }),
            prisma.task.count({
                where: {
                    projectId: { in: projectIds },
                    status: { not: 'COMPLETED' },
                    dueDate: { lt: new Date() }
                }
            }),
        ]);

        const incompleteTasks = totalTasks - completedTasks;

        // 3. Financials
        const totalBudget = teamProjects.reduce((sum, p) => sum + p.budget, 0);
        const totalSpent = teamProjects.reduce((sum, p) => sum + p.spent, 0);

        // 4. Monthly completed tasks for Chart (last 12 months)
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
        twelveMonthsAgo.setDate(1);

        const tasksLastYear = await prisma.task.findMany({
            where: {
                projectId: { in: projectIds },
                status: 'COMPLETED',
                updatedAt: { gte: twelveMonthsAgo }
            },
            select: { updatedAt: true, budget: true }
        });

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const barchartData = Array.from({ length: 12 }).map((_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (11 - i));
            const monthTasks = tasksLastYear.filter(t =>
                t.updatedAt.getMonth() === date.getMonth() &&
                t.updatedAt.getFullYear() === date.getFullYear()
            );
            const totalMonthlySpend = monthTasks.reduce((sum, t: any) => sum + (t.budget || 0), 0);
            return { label: months[date.getMonth()], value: totalMonthlySpend };
        });

        // 5. Top Team Members (by completed tasks)
        const teamMembers = await prisma.teamMember.findMany({
            where: { teamId: String(teamId) },
            include: { user: { select: { id: true, name: true, avatar: true, role: true } } }
        });

        const memberStats = await Promise.all(teamMembers.map(async (m) => {
            const completedCount = await prisma.task.count({
                where: { assignedToId: m.userId, status: 'COMPLETED', projectId: { in: projectIds } }
            });
            return {
                id: m.userId,
                name: m.user.name,
                avatar: m.user.avatar,
                role: m.user.role,
                completedTasks: completedCount
            };
        }));

        const topMembers = memberStats.sort((a, b) => b.completedTasks - a.completedTasks).slice(0, 5);

        // 6. Top Earning/Spend Projects
        const topProjects = [...teamProjects]
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                name: p.name,
                spent: p.spent,
                completedTasks: 0 // Will fill if needed
            }));

        // 7. Recent Activity (Timeline)
        const recentActivities = await prisma.task.findMany({
            where: { projectId: { in: projectIds } },
            orderBy: { updatedAt: 'desc' },
            take: 10,
            select: {
                id: true,
                name: true,
                updatedAt: true,
                status: true
            }
        });

        res.json({
            stats: [
                { title: "Completed tasks", value: completedTasks, meta: `${totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0}%` },
                { title: "Incompleted tasks", value: incompleteTasks, meta: `${totalTasks > 0 ? ((incompleteTasks / totalTasks) * 100).toFixed(2) : 0}%` },
                { title: "Overdue tasks", value: overdueTasks, meta: `${totalTasks > 0 ? ((overdueTasks / totalTasks) * 100).toFixed(2) : 0}%` },
                { title: "Total Income", value: `$${totalBudget.toLocaleString()}`, meta: `${totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(2) : 0}% consumed` },
            ],
            overview: {
                totalSpent: `$${totalSpent.toLocaleString()}`,
                chartData: barchartData
            },
            topMembers,
            topProjects,
            recentActivities
        });

    } catch (error) {
        console.error("Get team stats error:", error);
        res.status(500).json({ message: "Error fetching team statistics" });
    }
};

export const getTeamFiles = async (req: AuthRequest, res: Response) => {
    try {
        const { teamId } = req.params;
        console.log("Fetching files for teamId:", teamId);

        if (!teamId) return res.status(400).json({ message: "Team ID is required" });

        // 1. Get all projects in this team
        const projects = await prisma.project.findMany({
            where: { teamId: String(teamId) },
            select: { id: true }
        });

        const projectIds = projects.map(p => p.id);
        console.log(`Found ${projectIds.length} projects for team ${teamId}`);

        if (projectIds.length === 0) {
            return res.json({ files: [] });
        }

        // 2. Get all tasks for these projects
        const tasks = await prisma.task.findMany({
            where: { projectId: { in: projectIds } },
            select: { id: true, name: true }
        });

        const taskIds = tasks.map(t => t.id);
        console.log(`Found ${taskIds.length} tasks for these projects`);

        if (taskIds.length === 0) {
            return res.json({ files: [] });
        }

        // 3. Find all comments in these tasks
        const comments = await prisma.comment.findMany({
            where: { taskId: { in: taskIds } },
            include: {
                author: { select: { name: true, avatar: true } },
                task: { select: { name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        // 4. Flatten and map to file structure (filtering non-empty attachments)
        const files: any[] = [];
        comments.forEach((comment: any) => {
            if (comment.attachments && Array.isArray(comment.attachments)) {
                comment.attachments.forEach((url: string, index: number) => {
                    const fileName = url.split('/').pop()?.split('#')[0].split('?')[0] || `File-${index}`;
                    const fileType = fileName.split('.').pop()?.toLowerCase() || 'unknown';

                    let type: 'pdf' | 'image' | 'ppt' = 'pdf';
                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType)) type = 'image';
                    else if (['ppt', 'pptx'].includes(fileType)) type = 'ppt';

                    files.push({
                        id: `${comment.id}-${index}`,
                        name: decodeURIComponent(fileName),
                        type,
                        size: 'Unknown',
                        date: new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        author: {
                            name: comment.author.name,
                            avatar: comment.author.avatar || `https://ui-avatars.com/api/?name=${comment.author.name}`
                        },
                        url
                    });
                });
            }
        });

        console.log(`Returning ${files.length} filtered files`);
        res.json({ files });

    } catch (error) {
        console.error("Get team files error:", error);
        res.status(500).json({ message: "Error fetching team files" });
    }
};
