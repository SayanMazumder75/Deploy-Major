import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASS =", process.env.EMAIL_PASS ? "Loaded" : "Missing");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const sendOTPEmail = async (toEmail, otp) => {
    await transporter.sendMail({
        from: `"MeetMind" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Email Change Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; border: 1px solid #e5e7eb;">
                <h2 style="color: #a21caf; margin-bottom: 8px;">Verify your new email</h2>
                <p style="color: #64748b;">Use the code below to confirm your email change. It expires in <strong>10 minutes</strong>.</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #1e1b4b; text-align: center; padding: 24px 0;">
                    ${otp}
                </div>
                <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>
            </div>
        `,
    });
};