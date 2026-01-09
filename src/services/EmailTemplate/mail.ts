import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
    try {
        if (!BREVO_API_KEY) {
            throw new Error("BREVO_API_KEY is missing in environment variables");
        }

        const data = {
            sender: {
                name: "Project Management",
                email: "noteworthyuziham@gmail.com" // This should be verified in Brevo
            },
            to: [{ email: to }],
            subject: subject,
            htmlContent: html,
        };

        const response = await axios.post(BREVO_API_URL, data, {
            headers: {
                'accept': 'application/json',
                'api-key': BREVO_API_KEY,
                'content-type': 'application/json',
            },
        });

        return response.data;
    } catch (err: any) {
        console.error("[Email Service] Brevo Error:", err.response?.data || err.message);
        throw err;
    }
};

// Backward compatibility shim for authController
export const mailTransport = {
    sendMail: async (options: any) => {
        return sendEmail({
            to: options.to,
            subject: options.subject,
            html: options.html
        });
    }
};
