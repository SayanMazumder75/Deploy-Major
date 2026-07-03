import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const sendReminderEmail = async (
    to,
    title,
    date,
    startTime
) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject: `📚 Study Reminder: ${title}`,
            html: `
                <h2>Study Session Reminder</h2>
                <p>Your study session is scheduled.</p>

                <p><strong>Title:</strong> ${title}</p>
                <p><strong>Date:</strong> ${new Date(date).toDateString()}</p>
                <p><strong>Time:</strong> ${startTime}</p>

                <p>Best of luck! 🚀</p>
            `
        });

        console.log("Reminder email sent");
    } catch (error) {
        console.log(error);
    }
};