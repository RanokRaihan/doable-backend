import dotenv from "dotenv";

dotenv.config();

// Fail fast if critical secrets are missing — prevents silent startup with insecure defaults
const requiredEnvVars = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`FATAL: Missing required environment variable: ${key}`);
  }
}

interface Config {
  databaseUrl: string;
  port: number;
  nodeEnv: string;
  commissionRate: number;
  appUrl: string;
  frontendUrl: string;
  corsOrigin: string | string[];
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

const appUrl = process.env.APP_URL || "http://localhost:8000";
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

const config: Config = {
  databaseUrl: process.env.DATABASE_URL!,
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  appUrl,
  frontendUrl,
  // CORS origin — supports comma-separated list for multiple allowed origins
  corsOrigin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.includes(",")
      ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
      : process.env.CORS_ORIGIN
    : frontendUrl,
  commissionRate: Number(process.env.COMMISSION_RATE) || 0.15,
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    accessExpiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
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
    successUrl: `${appUrl}/api/v1/payment/success`,
    failUrl: `${appUrl}/api/v1/payment/fail`,
    cancelUrl: `${appUrl}/api/v1/payment/cancel`,
    successUrlFrontend: `${frontendUrl}/profile/payments/success`,
    failUrlFrontend: `${frontendUrl}/profile/payments/fail`,
    cancelUrlFrontend: `${frontendUrl}/profile/payments/cancel`,
    ipnUrl: `${frontendUrl}/profile/payments/ipn`,
    gatewayBaseUrl: process.env.GATEWAY_BASE_URL || "",
    validationApiUrl: process.env.VALIDATION_API_URL || "",
  },
};

export default config;
