import "dotenv/config";
import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";
import { cors } from "hono/cors";

import performanceMiddleware from "../middlewares/performanceMiddleware.js";
import authMiddleware from "../middlewares/authMiddleware.js";

import "../utils/logger";
import "./db";
import "./clerk";

import userRoute from "../routes/userRoute.js";
import chatRoute from "../routes/chatRoute.js";

import { clerkMiddleware } from "@hono/clerk-auth";

const app = new Hono();

app.use("*", clerkMiddleware())
app.use(prettyJSON());
app.use(cors());
app.use(performanceMiddleware);
app.use(authMiddleware);

app.route("/users", userRoute);
app.route('/chats', chatRoute);

export default app;