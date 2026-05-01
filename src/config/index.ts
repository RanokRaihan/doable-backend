import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  commissionRate: number;
  appUrl: string;
  frontendUrl: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  sslcommerz: {
    storeId: string;
    storePassword: string;
    successUrl: string;
    failUrl: string;
    cancelUrl: string;
    successUrlFrontend: string;
    failUrlFrontend: string;
    cancelUrlFrontend: string;
    gatewayBaseUrl: string;
    validationApiUrl: string;
    ipnUrl: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl: process.env.APP_URL || "http://localhost:8000",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  commissionRate: Number(process.env.COMMISSION_RATE) || 0.15,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
    accessExpiresIn: process.env.JWT_EXPIRES_IN || "15d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  smtp: {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
  sslcommerz: {
    storeId: process.env.STORE_ID || "",
    storePassword: process.env.STORE_PASSWORD || "",
    successUrl: process.env.SUCCESS_URL || "",
    failUrl: process.env.FAIL_URL || "",
    cancelUrl: process.env.CANCEL_URL || "",
    successUrlFrontend: process.env.SUCCESS_URL_FRONTEND || "",
    failUrlFrontend: process.env.FAIL_URL_FRONTEND || "",
    cancelUrlFrontend: process.env.CANCEL_URL_FRONTEND || "",
    ipnUrl: process.env.IPN_URL || "",
    gatewayBaseUrl: process.env.GATEWAY_BASE_URL || "",
    validationApiUrl: process.env.VALIDATION_API_URL || "",
  },
};

export default config;
