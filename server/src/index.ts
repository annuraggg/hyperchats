import "dotenv/config";
import app from "./config/init.js";
import logger from "./utils/logger.js";
import { serve } from "@hono/node-server";

const port = parseInt(process.env.PORT!);

app.get("/health", (c) => {
  return c.json({ status: "ok", version: "alpha_0.0.9" });
});

app.get("/*", (c) => {
  return c.json({ status: "not found" }, 404);
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  () => {
    logger.info(`Server is running on port ${port}`);
  }
);
