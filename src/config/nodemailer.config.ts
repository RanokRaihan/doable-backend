import nodemailer from "nodemailer";
import config from "./";

const { host, port, secure, user, pass } = config.smtp;

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: {
    user,
    pass,
  },
});

export default transporter;
