import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  jwt: {
    accessSecret: string;
    refreshSecret: string;
    expiresIn: string;
    refreshExpiresIn: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "access-secret",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "15d",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
};

export default config;
