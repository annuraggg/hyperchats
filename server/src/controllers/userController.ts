import type { Context } from "hono";
import User from "@/models/User.js";
import { sendError, sendSuccess } from "@/utils/sendResponse.js";
import logger from "@/utils/logger.js";
import clerkClient from "@/config/clerk.js";

const userCreated = async (c: Context) => {
  const { data } = await c.req.json();
  const { id, primary_email_address_id } = data;
  const email = data.email_addresses.find(
    (email: { id: string }) => email.id === primary_email_address_id
  );

  const cUser = await clerkClient.users.getUser(id);
  const publicMetadata = cUser.publicMetadata;
  const privateMetadata = cUser.privateMetadata;

  try {
    const user = await User.create({
      clerkId: id,
      email: email.email_address,
    });

    await clerkClient.users.updateUser(id, {
      publicMetadata: { ...publicMetadata, _id: user._id },
    });

    return sendSuccess(c, 200, "User created successfully");
  } catch (error) {
    logger.error(error as string);
    return sendError(c, 500, "Failed to create user");
  }
};

const userDeleted = async (c: Context) => {
  const { data } = await c.req.json();
  const { id } = data;

  try {
    const u = await User.findOne({ clerkId: id });
    if (u) {
      await u.deleteOne();
    }

    return sendSuccess(c, 200, "User deleted successfully");
  } catch (error) {
    logger.error(error as string);
    return sendError(c, 500, "Failed to delete user");
  }
};

const userUpdated = async (c: Context) => {
  const { data } = await c.req.json();
  const { id, primary_email_address_id } = data;
  const email = data.email_addresses.find(
    (email: { id: string }) => email.id === primary_email_address_id
  );

  try {
    const u = await User.findOne({ clerkId: id });

    if (!u) {
      sendError(c, 404, "User not found");
      return;
    }

    await u.updateOne({
      email: email.email_address,
    });

    return sendSuccess(c, 200, "User updated successfully");
  } catch (error) {
    logger.error(error as string);
    return sendError(c, 500, "Failed to update user");
  }
};

export default {
  userCreated,
  userDeleted,
  userUpdated,
};
