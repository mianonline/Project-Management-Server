import nodemailer from 'nodemailer'

export const mailTransport = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 30000, // Increase to 30s
    greetingTimeout: 30000,
    socketTimeout: 30000,
    logger: true,
    debug: true,
});
