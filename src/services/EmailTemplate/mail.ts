import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'Project Management <onboarding@resend.dev>', // You can change this after domain verification
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error("[Email Service] Resend Error:", error);
            throw error;
        }

        return data;
    } catch (err) {
        console.error("[Email Service] Failed to send email:", err);
        throw err;
    }
};

// Keep for backward compatibility if needed, but we should migrate to sendEmail
export const mailTransport = {
    sendMail: async (options: any) => {
        return sendEmail({
            to: options.to,
            subject: options.subject,
            html: options.html
        });
    }
};
