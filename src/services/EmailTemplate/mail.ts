import nodemailer from 'nodemailer'

export const mailTransport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for 465, false for other ports
    pool: true,   // reuse connections
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
});
