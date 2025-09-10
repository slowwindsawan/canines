import React, { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, User, Stethoscope } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useMessage } from "../context/MessageContext";
import { useDog } from "../context/DogContext";
import { jwtRequest } from "../env"; // adjust path if env is elsewhere
import { v4 as uuidv4 } from "uuid";

// Helper to parse inline *bold* text
function parseInlineFormatting(text: string): JSX.Element[] {
  const parts = text.split(/(\*[^*]+\*)/g); // split by *text*
  return parts.map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <strong key={index}>{part.slice(1, -1)}</strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function formatMessageToHTML(message: string) {
  const lines = message.split("\n");
  const formatted: JSX.Element[] = [];
  let inList = false;

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed === "") {
      formatted.push(<br key={index} />);
      return;
    }

    // List item
    if (trimmed.startsWith("- ")) {
      if (!inList) {
        inList = true;
        formatted.push(<ul key={`ul-${index}`}></ul>); // placeholder, will push li inside
      }

      formatted.push(
        <li key={index}>{parseInlineFormatting(trimmed.slice(2))}</li>
      );
      return;
    } else {
      inList = false;
    }

    // Treat *text* as bold
    formatted.push(<p key={index}>{parseInlineFormatting(trimmed)}</p>);
  });

  return formatted;
}

const AIChatbot: React.FC = () => {
  const { user } = useAuth();
  const { selectedDog } = useDog();
  const {
    getUserConversation,
    createConversation,
    sendMessage,
    getConversationMessages,
    markAsRead,
    isLoading,
  } = useMessage();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // synchronous ref copy to avoid stale closures when building history
  const messagesRef = useRef<any[]>([]);
  const setMessagesAndRef = (next: any[]) => {
    messagesRef.current = next;
    setMessages(next);
  };

  // normalize messages coming from the provider/backend to UI shape
  const normalizePersistedMessages = (arr: any[] | undefined) => {
    return (arr || []).map((m: any) => {
      const authorId = m.author_id ?? m.user_id ?? m.authorId;
      const senderType =
        m.senderType ||
        m.role ||
        (authorId && user && String(authorId) === String(user.id)
          ? "user"
          : "assistant");

      return {
        id: m.id ?? uuidv4(),
        threadId: m.threadId ?? m.conversation_id ?? conversationId,
        content: m.content ?? m.message ?? "",
        senderType: senderType === "user" ? "user" : "assistant",
        type: m.type ?? "text",
        timestamp: m.timestamp ?? m.created_at ?? new Date().toISOString(),
        __raw: m,
      };
    });
  };

  const scrollToBottom = (smooth = true) => {
    // small timeout to allow layout to settle, avoids jitter
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "end",
      });
    }, 40);
  };

  // load persisted messages once when conversation opens
  useEffect(() => {
    if (!conversationId) return;
    let mounted = true;

    try {
      const persisted = getConversationMessages(conversationId) || [];
      const normalized = normalizePersistedMessages(persisted).filter(
        (m) => !String(m.id || "").startsWith("tmp-")
      );
      if (mounted) {
        setMessagesAndRef(normalized);
        scrollToBottom(false);
      }
      // mark read best-effort
      try {
        markAsRead(conversationId);
      } catch {}
    } catch (err) {
      console.error("Failed to load conversation messages:", err);
    }

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // initialize conversation when user opens chat or selectedDog changes
  useEffect(() => {
    if (user && isOpen) {
      (async () => {
        // try to find existing conversation
        let conversation = getUserConversation(user.id, selectedDog?.id);
        if (!conversation) {
          const newConvId = await createConversation(user.id, selectedDog?.id);
          setConversationId(newConvId);
        } else {
          setConversationId(conversation.id);
        }
      })();
    }
    // only depend on IDs to avoid re-running from changing function refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedDog?.id, isOpen]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !conversationId || isLoading || sending) return;

    const text = inputText.trim();
    setInputText("");
    setSending(true);

    // Build history: last 4 user/assistant messages BEFORE this message
    // Use the synchronous messagesRef.current so we are not subject to setState timing
    const prior = (messagesRef.current || []).filter(
      (m) =>
        m &&
        (m.senderType === "user" || m.senderType === "assistant") &&
        !String(m.id || "").startsWith("tmp-")
    );
    const history = messagesRef.current
      .slice(-4) // get last 4 items
      .map((item) => ({
        content: item.content,
        role: item.senderType === "user" ? "user" : "assistant",
      }));

    // optimistic temp user message
    const tempUserMsg = {
      id: `tmp-${uuidv4()}`,
      threadId: conversationId,
      content: text,
      senderType: "user",
      type: "text",
      timestamp: new Date().toISOString(),
    };

    // append locally (update ref synchronously)
    const withTemp = [...messagesRef.current, tempUserMsg];
    setMessagesAndRef(withTemp); // <--- important: keep ref in sync
    scrollToBottom(true);

    try {
      // persist user message (best-effort). We don't refetch entire conversation to avoid replacing UI
      try {
        await sendMessage(conversationId, text);
      } catch (err) {
        console.warn(
          "sendMessage (user) failed, continuing optimistic flow:",
          err
        );
      }

      // Call AI with the prior history (explicitly excluding the current message)
      const payload = {
        message: text,
        dog_id: selectedDog?.id ?? null,
        conversation_id: conversationId,
        history, // last 4 prior messages
      };

      const aiResp = await jwtRequest("/chat", "POST", payload);
      const aiReply = aiResp?.reply ?? aiResp?.data?.reply ?? null;
      const assistantContent =
        aiReply ?? "Sorry — I could not get a response. Please try again.";

      // create optimistic assistant message using the assistant content (NOT the user's text)
      const tempAIres = {
        id: `tmp-${uuidv4()}`,
        threadId: conversationId,
        content: assistantContent, // <- fixed: use assistant reply
        senderType: "assistant",
        type: "text",
        timestamp: new Date().toISOString(),
      };

      const aitemp = [
        ...messagesRef.current.filter((m) => !String(m.id).startsWith("tmp-")),
        ...messagesRef.current.filter((m) => String(m.id).startsWith("tmp-")),
        tempAIres,
      ];

      // Simpler: just append the assistant temp message to the current ref array
      const appended = [...messagesRef.current, tempAIres];
      setMessagesAndRef(appended);
      scrollToBottom(true);

      // Optionally persist assistant message (best-effort)
      // try {
      //   await sendMessage(conversationId, assistantContent);
      // } catch (err) {
      //   console.warn("sendMessage (assistant) failed:", err);
      // }
    } catch (err) {
      console.error("AI flow error:", err);
      // remove tmp messages and show error assistant message
      const errorMsg = {
        id: `err-${uuidv4()}`,
        threadId: conversationId,
        content: "Failed to get a reply. Please try again.",
        senderType: "assistant",
        type: "error",
        timestamp: new Date().toISOString(),
      };

      const afterError = [
        ...messagesRef.current.filter((m) => !String(m.id).startsWith("tmp-")),
        errorMsg,
      ];
      setMessagesAndRef(afterError);
      scrollToBottom(true);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickQuestions = [
    "How is my dog's protocol working?",
    "When should I see improvements?",
    "Can I adjust the meal portions?",
    "Are there any side effects to watch for?",
    "How often should I update progress?",
  ];

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r bg-brand-charcoal text-white p-4 rounded-full shadow-lg hover:bg-brand-midgrey hover:to-teal-700 transition-all duration-200 transform hover:scale-[1.02] z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[calc(100vh-2rem)] sm:h-[600px] max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
          <div className="bg-gradient-to-r bg-brand-charcoal text-white p-4 rounded-t-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Stethoscope className="h-6 w-6" />
              <div>
                <h3 className="font-semibold text-sm sm:text-base">
                  Chat with Nutritionist
                </h3>
                <p className="text-xs opacity-90 hidden sm:block">
                  {selectedDog
                    ? `About ${selectedDog.name}`
                    : "General Support"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1 rounded transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Questions */}
          {messages.length === 0 && (
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                Quick Questions:
              </h4>
              <div className="space-y-2">
                {quickQuestions.slice(0, 3).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputText(q)}
                    className="w-full text-left text-xs sm:text-sm bg-white border border-gray-200 rounded-lg p-2 sm:p-3 text-gray-700 hover:border-brand-midgrey hover:bg-brand-offwhite transition-all duration-200"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">
                  Start a conversation with your nutritionist
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderType === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`flex items-start space-x-2 max-w-[85%] sm:max-w-[80%] ${
                    message.senderType === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <div
                    className={`p-2 rounded-full ${
                      message.senderType === "user"
                        ? "bg-emerald-600"
                        : "bg-emerald-100"
                    }`}
                  >
                    {message.senderType === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Stethoscope className="h-4 w-4 text-emerald-800" />
                    )}
                  </div>

                  <div
                    className={`p-3 rounded-lg ${
                      message.senderType === "user"
                        ? "bg-emerald-600 text-white"
                        : message.type === "plan_update"
                        ? "bg-blue-100 text-blue-900 border border-blue-200"
                        : message.type === "error"
                        ? "bg-red-50 text-red-900 border border-red-200"
                        : "bg-gray-100 text-gray-900"
                    }`}
                  >
                    {message.type === "plan_update" && (
                      <div className="text-xs font-medium text-blue-700 mb-1">
                        📋 Protocol Update
                      </div>
                    )}
                    <p className="text-xs sm:text-sm break-words">
                      {formatMessageToHTML(message.content)}
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        message.senderType === "user"
                          ? "text-emerald-100"
                          : "text-gray-500"
                      }`}
                    >
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {(isLoading || sending) && (
              <div className="flex justify-start">
                <div className="flex items-start space-x-2 max-w-[85%] sm:max-w-[80%]">
                  <div className="p-2 rounded-full bg-emerald-100">
                    <Stethoscope className="h-4 w-4 text-emerald-800" />
                  </div>
                  <div className="bg-gray-100 p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      />
                      <div
                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 sm:p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about your dog's health..."
                className="flex-1 px-2 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-charcoal focus:border-brand-charcoal text-xs sm:text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isLoading || sending}
                className="bg-gradient-to-r bg-brand-charcoal text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-brand-midgrey duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
