import { Resend } from "resend";
import config from "./";

const resend = new Resend(config.resend.apiKey);

export default resend;
