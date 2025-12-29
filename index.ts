import express from "express";
import cors from "cors";
import { supabase } from "./supabase";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/chat/message", async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ error: "Empty message" });
  }

  let conversationId = sessionId;

  if (!conversationId) {
    const { data } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    conversationId = data.id;
  }

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message
  });

  // fake AI reply for now
  const reply = "This is a placeholder response.";

  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content: reply
  });

  await supabase
    .from("conversations")
    .update({ last_activity_at: new Date().toISOString() })
    .eq("id", conversationId);

  res.json({ reply, sessionId: conversationId });
});

app.listen(3001, () => {
    console.log("Server running on 3001");
})