import express from "express";
import dotenv from "dotenv";
import Groq from "groq-sdk";
import cors from "cors";
import { supabase } from "./supabase";

dotenv.config();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
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

async function getSupportAgentReply(userMessage: any) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a helpful customer support assistant for 'ShoeStore'. You are polite, concise, and only answer questions about shipping, returns, and inventory. If you don't know the answer, ask the user to leave their email."
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 1,
      max_tokens: 1024,
    });
    return chatCompletion.choices[0]?.message?.content || "Sorry, I'm having trouble thinking.";
  } catch (error: any) {
    if (error.status === 429) {
      return "I'm a bit busy right now! Please wait a few seconds and try again.";
    }
    console.error("Groq API Error:", error);
    return "Sorry, there was an error processing your request.";
  }
}


  const reply = await getSupportAgentReply(message);
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