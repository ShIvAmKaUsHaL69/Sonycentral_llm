"use client";

import React, { useRef, useState, useEffect } from "react";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import { useRouter } from "next/navigation";
import AdminPanelLayout from "@/components/admin-panel/admin-panel-layout";
import { Trash2, MessageSquare, Plus, Pin } from "lucide-react";

export const dynamic = 'force-dynamic';

type ChatMessage = { text: string; from: string; typing?: boolean };
type ChatSession = { 
  chat_id: string; 
  last_message_time: string; 
  message_count: number; 
  last_message: string; 
  pinned: boolean; // Added pinned property
};

const ROUTE = "general";

// UUID generator with fallback
function getUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback: RFC4122 version 4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkSession() {
      const res = await fetch('/api/session');
      const data = await res.json();
      if (!data.loggedIn) {
        router.replace('/login');
      }
    }
    checkSession();
  }, [router]);

  // Load chat sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load chat history when currentChatId changes
  useEffect(() => {
    if (currentChatId) {
      loadChatHistory(currentChatId);
    } else {
      // Show welcome message for new chat
      setMessages([
        { text: "LLM is working.<br>Please ask your query in the chat.", from: "bot" }
      ]);
    }
  }, [currentChatId]);

  useEffect(() => {
    chatBodyRef.current?.scrollTo({ top: chatBodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      // Don't set sessions to empty array to avoid clearing existing sessions on error
    }
  };

  const loadChatHistory = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chat/history?chatId=${chatId}`);
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      
             if (data.messages && data.messages.length > 0) {
                   const formattedMessages = data.messages.map((msg: any) => {
            let text = msg.message.replace(/\n/g, '<br>');
            text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
            text = text.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>');
            text = text.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto"><code>$1</code></pre>');
            text = text.replace(/^- (.*)/gm, '<li>$1</li>');
            text = text.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1">$1</ul>');
            return { text, from: msg.sender };
          });
         setMessages(formattedMessages);
      } else {
        setMessages([
          { text: "LLM is working.<br>Please ask your query in the chat.", from: "bot" }
        ]);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
      setMessages([
        { text: "LLM is working.<br>Please ask your query in the chat.", from: "bot" }
      ]);
    }
  };

  const startNewChat = () => {
    const newChatId = getUUID();
    setCurrentChatId(newChatId);
    setShowSessions(false);
    setMessages([
      { text: "LLM is working.<br>Please ask your query in the chat.", from: "bot" }
    ]);
  };

  const deleteChat = async (chatId: string) => {
    try {
      const res = await fetch(`/api/chat/history?chatId=${chatId}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      await loadSessions();
      if (currentChatId === chatId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
      // Could add a toast notification here for better UX
    }
  };

  const pinChat = async (chatId: string, pinned: boolean) => {
    try {
      const res = await fetch('/api/chat/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, pinned }),
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      await loadSessions();
    } catch (error) {
      console.error('Failed to pin chat:', error);
      // Could add a toast notification here for better UX
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = { text: input, from: "user" };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput("");
    setLoading(true);
    
    // Add typing indicator
    setMessages((msgs) => [
      ...msgs,
      { text: "typing...", from: "bot", typing: true }
    ]);

    let chatId = currentChatId;
    if (!chatId) {
      chatId = getUUID();
      setCurrentChatId(chatId);
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          message: userMsg.text,
          route: ROUTE
        })
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      setMessages((msgs) => msgs.filter((m) => !m.typing));
      let content = data.output || "Sorry, I couldn't understand that.";
      content = content.replace(/\n/g, '<br>');
      content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
      content = content.replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>');
      content = content.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm overflow-x-auto"><code>$1</code></pre>');
      content = content.replace(/^- (.*)/gm, '<li>$1</li>');
      content = content.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside space-y-1">$1</ul>');
      setMessages((msgs) => [
        ...msgs,
        { text: content, from: "bot" }
      ]);
      
      // Reload sessions to show the new chat
      await loadSessions();
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages((msgs) => msgs.filter((m) => !m.typing));
      setMessages((msgs) => [
        ...msgs,
        { text: "Sorry, there was an error sending your message. Please try again.", from: "bot" }
      ]);
    }
    setLoading(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AdminPanelLayout>
             <ContentLayout title="Chat">
         <div className="flex h-full overflow-hidden">
          {/* Chat Sessions Sidebar */}
          <div className={`w-80 border-r bg-muted/50 transition-all duration-300 ${showSessions ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:relative lg:block`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Chat History</h2>
                <button
                  onClick={startNewChat}
                  className="p-2 hover:bg-muted rounded-lg"
                  title="New Chat"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <button
                onClick={() => setShowSessions(false)}
                className="lg:hidden w-full text-left p-2 hover:bg-muted rounded-lg"
              >
                ← Back to Chat
              </button>
            </div>
                         <div className="h-[calc(100vh-200px)] overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No chat history yet
                </div>
              ) : (
                // Sort sessions: pinned first, then by last_message_time descending
                [...sessions].sort((a, b) => {
                  if (a.pinned === b.pinned) {
                    return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
                  }
                  return Number(b.pinned) - Number(a.pinned);
                }).map((session) => (
                  <div
                    key={session.chat_id}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      currentChatId === session.chat_id ? 'bg-muted' : ''
                    }`}
                    onClick={() => {
                      setCurrentChatId(session.chat_id);
                      setShowSessions(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {session.last_message?.substring(0, 50) || 'New conversation'}...
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(session.last_message_time)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {session.message_count} messages
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pinChat(session.chat_id, !session.pinned);
                        }}
                                                 className={`p-1 rounded mr-2 ${session.pinned ? 'bg-blue-200 text-blue-800' : 'hover:bg-blue-100 hover:text-blue-700'}`}
                        title={session.pinned ? 'Unpin chat' : 'Pin chat'}
                      >
                        <Pin className="h-4 w-4" fill={session.pinned ? 'currentColor' : 'none'} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(session.chat_id);
                        }}
                        className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                        title="Delete chat"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSessions(true)}
                  className="lg:hidden p-2 hover:bg-muted rounded-lg"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <h1 className="text-lg font-semibold">
                  {currentChatId ? 'Chat' : 'New Chat'}
                </h1>
              </div>
              <button
                onClick={startNewChat}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                New Chat
              </button>
            </div>

                         {/* Chat Messages */}
             <div className="flex-1 flex flex-col p-4 overflow-hidden">
                             <div
                 ref={chatBodyRef}
                 className="flex-1 overflow-y-auto border rounded-lg bg-card dark:bg-zinc-800 p-2 sm:p-4 mb-2 sm:mb-4 shadow max-w-full scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
               >
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-lg">
                    Start your conversation
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-2 flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`px-4 py-2 rounded-lg max-w-[95vw] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl break-words text-base shadow-sm ${
                          msg.from === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-muted text-foreground dark:bg-zinc-700 dark:text-zinc-100 rounded-bl-none"
                        } ${msg.typing ? "italic opacity-70" : ""}`}
                        style={{ wordBreak: 'break-word', width: 'fit-content' }}
                        dangerouslySetInnerHTML={{ __html: msg.text }}
                      />
                    </div>
                  ))
                )}
              </div>
              
              {/* Input */}
              <div className="flex gap-2 items-center bg-card dark:bg-zinc-800 p-2 sm:p-3 rounded-lg shadow w-full max-w-full flex-shrink-0">
                <input
                  type="text"
                  placeholder="Type a message"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="flex-1 border rounded-full px-3 py-2 sm:px-4 sm:py-2 focus:outline-none focus:ring focus:border-blue-400 bg-background text-foreground dark:bg-zinc-900 text-base"
                  autoFocus
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-full disabled:opacity-50 text-lg"
                  disabled={loading || !input.trim()}
                >
                  &#10148;
                </button>
              </div>
            </div>
          </div>
        </div>
      </ContentLayout>
    </AdminPanelLayout>
  );
} 