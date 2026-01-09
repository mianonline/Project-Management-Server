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
    connectionTimeout: 15000, // Increase to 15s
    greetingTimeout: 15000,
    socketTimeout: 15000,
    logger: true, // Log to console
    debug: true,  // Include SMTP traffic in logs
    tls: {
        rejectUnauthorized: false // Helps in some cloud environments
    }
});
