"use client";

import { useState } from "react";

export default function ChatBot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi 👋 I’m your finance assistant. Ask me about future expenses.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ UPDATED FUNCTION (CONNECTED TO API)
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage.text }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "⚠️ Failed to fetch response." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-80 bg-white border rounded-xl shadow-lg z-50">
      <div className="p-3 font-semibold border-b">Finance Chatbot</div>

      <div className="h-64 overflow-y-auto p-3 space-y-2 text-sm">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-2 rounded-lg max-w-[90%] ${
              msg.role === "user"
                ? "bg-blue-100 ml-auto text-right"
                : "bg-gray-100 mr-auto"
            }`}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div className="text-xs text-gray-500">Thinking...</div>
        )}
      </div>

      <div className="flex p-2 border-t gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about expenses..."
          className="flex-1 border rounded px-2 py-1 text-sm"
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-black text-white px-3 rounded text-sm"
        >
          Send
        </button>
      </div>
    </div>
  );
}
