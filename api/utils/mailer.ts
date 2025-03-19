import nodemailer from 'nodemailer';
import SMTPPool from "nodemailer/lib/smtp-pool";
import SMTPTransport from "nodemailer/lib/smtp-transport";


export const sendMail = async (options: SMTPPool.MailOptions): Promise<void> => {
    const port = Number(process.env.GMAIL_PORT)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: "smtp.gmail.com",
        port,
        secure: port === 465,
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.APP_PASSWORD,
        },
    });
    try {
        await transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options?.html,
        } as SMTPTransport.MailOptions);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};
