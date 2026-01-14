import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string; // Optional since we use hardcoded sender
}

export const sendEmail = async ({ to, subject, html }: SendMailOptions) => {
  try {
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is missing in environment variables');
    }

    const data = {
      sender: {
        name: 'Project Management',
        email: 'noteworthyuziham@gmail.com',
      },
      to: [{ email: to }],
      subject: subject,
      htmlContent: html,
    };

    const response = await axios.post(BREVO_API_URL, data, {
      headers: {
        accept: 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json',
      },
    });

    return response.data;
  } catch (err: unknown) {}
};

export const mailTransport = {
  sendMail: async (options: SendMailOptions) => {
    return sendEmail({
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
  },
};
