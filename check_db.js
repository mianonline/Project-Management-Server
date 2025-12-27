const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const teams = await prisma.team.findMany();
        console.log('Teams found:', teams.length);
        for (const team of teams) {
            console.log(`--- Team: ${team.name} (${team.id}) ---`);
            const projects = await prisma.project.findMany({ where: { teamId: team.id } });
            console.log(`Projects: ${projects.length}`);

            const projectIds = projects.map(p => p.id);
            if (projectIds.length > 0) {
                const tasks = await prisma.task.findMany({ where: { projectId: { in: projectIds } } });
                console.log(`Tasks: ${tasks.length}`);

                const taskIds = tasks.map(t => t.id);
                if (taskIds.length > 0) {
                    const comments = await prisma.comment.findMany({ where: { taskId: { in: taskIds } } });
                    console.log(`Comments: ${comments.length}`);

                    const withFiles = comments.filter(c => c.attachments && c.attachments.length > 0);
                    console.log(`Comments with files: ${withFiles.length}`);
                    if (withFiles.length > 0) {
                        console.log('File URLs:', withFiles.flatMap(c => c.attachments));
                    }
                }
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}
run();
