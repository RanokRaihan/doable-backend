import config from "../config";
import resend from "../config/resend.config";
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
  const { error } = await resend.emails.send({
    from: from || `Doable <${config.resend.fromEmail}>`,
    to,
    subject,
    html,
    ...(text !== undefined && { text }),
  });

  if (error) {
    throw new AppError(500, "Failed to send email");
  }
};
