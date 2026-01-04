import config from "../config";
import transporter from "../config/nodemailer.config";
import { AppError } from "./appError";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  text?: string;
}

export const sendEmail = async ({
  to,
  subject,
  html,
  from,
  text,
}: EmailOptions): Promise<void> => {
  try {
    await transporter.sendMail({
      from: from || `"Get it. done - " <${config.smtp.user}>`,
      to,
      subject,
      text,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new AppError(500, "Failed to send email");
  }
};
