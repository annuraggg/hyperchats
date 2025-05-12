import { getAuth } from "@hono/clerk-auth";
import { createMiddleware } from "hono/factory";
import type { Context } from "hono";
import { sendError } from "../utils/sendResponse.js";

const authMiddleware = createMiddleware(async (c: Context, next) => {
  const auth = getAuth(c);

  const credentials = {
    userId: auth?.userId,
    _id: auth?.sessionClaims?._id,
  };
  c.set("auth", credentials);

  if (!auth) {
    return sendError(c, 401, "Request Unauthorized");
  }

  return next();
});

export default authMiddleware;
