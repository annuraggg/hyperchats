import { Hono } from "hono";
import chatController from "../controllers/chatController.js";
const app = new Hono();

app.post("/", chatController.handleChat);
app.get("/", chatController.getUserChats);
app.get("/:id", chatController.getChat);
app.delete("/:id", chatController.deleteChat);

export default app;
