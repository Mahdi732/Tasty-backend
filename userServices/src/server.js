import { app } from "./app.js";
import { connectDatabase, disconnectDatabase } from "./config/database.js";
import { env } from "./config/env.js";

const start = async () => {
  try {
    await connectDatabase();
    const server = app.listen(env.port, () => {
      process.stdout.write(`User service listening on ${env.port}\n`);
    });

    const shutdown = async (signal) => {
      process.stdout.write(`${signal} received: closing server\n`);
      server.close(() => {
        process.stdout.write("HTTP server closed\n");
      });
      await disconnectDatabase().catch(() => {
        process.stderr.write("Error closing database connection\n");
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      process.exit(0);
    };

    ["SIGINT", "SIGTERM"].forEach((signal) => {
      process.on(signal, () => {
        shutdown(signal).catch((err) => {
          process.stderr.write(`Error during shutdown: ${err.message}\n`);
          process.exit(1);
        });
      });
    });

    process.on("unhandledRejection", (reason) => {
      process.stderr.write(`Unhandled rejection: ${reason}\n`);
    });

    process.on("uncaughtException", (err) => {
      process.stderr.write(`Uncaught exception: ${err.message}\n`);
      process.exit(1);
    });
  } catch (err) {
    process.stderr.write(`Failed to start: ${err.message}\n`);
    process.exit(1);
  }
};

start();
