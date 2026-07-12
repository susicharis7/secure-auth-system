import { Sequelize } from "sequelize";
import { config } from "./env";

export const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: Number(config.db.port),
    dialect: "mysql",
    logging: false,
    dialectOptions: {
      connectTimeout: 20000,
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    retry: {
      max: 3,
    },
  }
);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase(): Promise<void> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sequelize.authenticate();
      console.log("DB connected via Sequelize");
      return;
    } catch (error) {
      console.error(`DB connect attempt ${attempt}/${maxAttempts} failed`);

      if (attempt === maxAttempts) {
        throw error;
      }

      await sleep(attempt * 3000);
    }
  }
}
