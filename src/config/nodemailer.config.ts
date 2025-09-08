import nodemailer from "nodemailer";
import config from "./";

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port || 587,
  secure: config.smtp.secure,
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

export default transporter;
