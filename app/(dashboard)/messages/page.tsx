"use client";

import { Suspense, useEffect, useState } from "react";
import { collection, query, where, doc, addDoc, onSnapshot, updateDoc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useUserRole } from "@/hooks/useUserRole";
import { Conversation, ChatMessage } from "@/lib/types";
import { Loader2, ArrowLeft, Send, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function getConversationId(uid1: string, uid2: string) {
  return [uid1, uid2].sort().join("_");
}

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      }
    >
      <MessagesPageInner />
    </Suspense>
  );
}

function MessagesPageInner() {
  const { profileId, role, loading: roleLoading } = useUserRole();
  const searchParams = useSearchParams();
  const withUserId = searchParams.get("with");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(withUserId ? getConversationId(profileId || "", withUserId) : null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newText, setNewText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (withUserId && profileId) {
      const cid = getConversationId(profileId, withUserId);
      setSelectedId(cid);
      getDoc(doc(db, "conversations", cid)).then((snap) => {
        if (!snap.exists()) {
          setDoc(doc(db, "conversations", cid), {
            participants: [profileId, withUserId].sort(),
            lastAt: new Date().toISOString(),
          }).catch(console.error);
        }
      });
    }
  }, [withUserId, profileId]);

  useEffect(() => {
    if (!profileId || roleLoading) return;
    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", profileId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Conversation));
      list.sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
      setConversations(list);
      setLoading(false);
    });
    return () => unsub();
  }, [profileId, roleLoading]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const ref = collection(db, "conversations", selectedId, "messages");
    const unsub = onSnapshot(
      query(ref),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
        list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        setMessages(list);
      },
      (err) => console.error(err)
    );
    return () => unsub();
  }, [selectedId]);

  const getOrCreateConversation = async (otherId: string): Promise<string> => {
    if (!profileId) throw new Error("Not logged in");
    const cid = getConversationId(profileId, otherId);
    const convRef = doc(db, "conversations", cid);
    const convSnap = await getDoc(convRef);
    if (convSnap.exists()) return cid;
    await setDoc(convRef, {
      participants: [profileId, otherId].sort(),
      lastAt: new Date().toISOString(),
    });
    return cid;
  };

  const handleSend = async () => {
    if (!profileId || !selectedId || !newText.trim()) return;
    setSending(true);
    try {
      const messagesRef = collection(db, "conversations", selectedId, "messages");
      await addDoc(messagesRef, {
        from: profileId,
        text: newText.trim(),
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, "conversations", selectedId), {
        lastMessage: newText.trim().slice(0, 100),
        lastAt: new Date().toISOString(),
      });
      setNewText("");
    } catch (e) {
      console.error(e);
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const otherParticipantId = selectedConv?.participants?.find((p) => p !== profileId);
  const otherName = selectedConv?.participantNames?.[otherParticipantId || ""] || otherParticipantId || "Unknown";

  if (roleLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }
  if (!profileId) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Please log in to view messages.</p>
        <Link href="/login" className="text-primary mt-2 inline-block">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={role === "ADMIN" ? "/admin" : role === "TUTOR" ? "/tutor" : role === "PARENT" ? "/parent" : "/"}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <MessageSquare size={24} /> Messages
        </h1>
      </div>
      <div className="flex flex-1 min-h-0 border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="w-72 border-r border-gray-200 flex flex-col overflow-hidden">
          {loading ? (
            <div className="p-4 flex justify-center"><Loader2 className="animate-spin" size={24} /></div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">No conversations yet.</p>
          ) : (
            <div className="overflow-y-auto flex-1">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 ${
                    selectedId === c.id ? "bg-primary/10 border-l-4 border-l-primary" : ""
                  }`}
                >
                  <p className="font-medium text-gray-900 truncate">
                    {c.participantNames?.[c.participants.find((p) => p !== profileId) || ""] ||
                      c.participants.find((p) => p !== profileId) ||
                      "Chat"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{c.lastMessage || "No messages"}</p>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              Select a conversation or use a &quot;Message&quot; link from the admin site.
            </div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-gray-200 font-medium text-gray-900">
                {otherName}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.from === profileId ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        m.from === profileId ? "bg-primary text-white" : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !newText.trim()}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
