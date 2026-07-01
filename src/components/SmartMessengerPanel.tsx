import React, { useState, useEffect, useRef } from "react";
import { 
  Search, Pin, VolumeX, Archive, Trash2, Edit3, Smile, Send, Paperclip, 
  MoreVertical, AlertCircle, Sparkles, Clock, Heart, ThumbsUp, Check, 
  CheckCheck, Users, Radio, FileText, Calendar, Mic, X, ThumbsDown, 
  MessageSquare, User as UserIcon, Monitor, MapPin, Eye, Star, Plus, Shield
} from "lucide-react";
import { Message, Room, User, UserStatus } from "../types.js";

interface SmartMessengerPanelProps {
  currentUser: User;
  onBack: () => void;
}

// Custom Bubble themes
const WALLPAPERS = [
  { id: "purple", name: "کاسمیک بنفش", class: "bg-radial-purple" },
  { id: "teal", name: "شفق قطبی", class: "bg-radial-teal" },
  { id: "charcoal", name: "ذغالی تیره", class: "bg-radial-charcoal" }
];

export default function SmartMessengerPanel({ currentUser, onBack }: SmartMessengerPanelProps) {
  // Sync states
  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string>("room-all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarFilter, setSidebarFilter] = useState<"all" | "groups" | "direct" | "archived" | "pinned">("all");
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Admin Supervisor states
  const [supervisorActive, setSupervisorActive] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any | null>(null);

  // Message compose input
  const [inputText, setInputText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  
  // Custom styling
  const [activeWallpaper, setActiveWallpaper] = useState("purple");
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg">("md");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [showEmojiPickerForMsgId, setShowEmojiPickerForMsgId] = useState<string | null>(null);

  // Editing states
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Simulated Media Files uploads
  const [attachedFile, setAttachedFile] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);

  // AI Summary Modal
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState("");
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  // AI Stats State
  const [stats, setStats] = useState({ totalAIAnalyzed: 0, topicDistribution: {} as Record<string, number> });

  // UI state
  const [typingState, setTypingState] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio recording simulation
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordIntervalRef = useRef<any>(null);

  // 1. Long Poll Loop for real-time Sync
  useEffect(() => {
    let active = true;

    const syncWithServer = async () => {
      try {
        const res = await fetch(`/api/messenger/sync?userId=${currentUser.id}`);
        if (!res.ok) throw new Error("Sync failure");
        const data = await res.json();
        if (active) {
          setRooms(data.rooms || []);
          setMessages(data.messages || []);
          setUserStatuses(data.userStatuses || []);
          setSystemUsers(data.users || []);
          
          // Sound effect on new unread message arriving
          if (data.messages && data.messages.length > 0) {
            const lastMsg = data.messages[data.messages.length - 1];
            if (lastMsg.senderId !== currentUser.id && soundEnabled) {
              // Play a light subtle bubble sound using standard Web Audio synthesized ping
              playSubtlePing();
            }
          }
        }
      } catch (err) {
        console.error("Messenger long polling err", err);
      }
    };

    // Run first sync immediately
    syncWithServer();

    // Poll every 1.5 seconds for extremely low latency sync without WebSockets
    const pollInterval = setInterval(syncWithServer, 1500);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [currentUser.id, soundEnabled]);

  // 2. Active User Ping status loop
  useEffect(() => {
    const pingStatus = async () => {
      try {
        await fetch("/api/messenger/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            status: "online",
            statusText: "در حال گفتگو در پیام‌رسان",
            typingRoomId: typingState ? activeRoomId : null,
            screenResolution: `${window.innerWidth}x${window.innerHeight}`,
            fingerprint: `fp-${currentUser.username}`
          })
        });
      } catch (e) {
        console.error("Presence ping failed", e);
      }
    };

    pingStatus();
    // Ping every 5 seconds to keep session alive and accurate
    const pingInterval = setInterval(pingStatus, 5000);

    return () => clearInterval(pingInterval);
  }, [currentUser.id, typingState, activeRoomId]);

  // 3. Scroll messages view to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    // Also trigger read-state update on active room
    if (activeRoomId) {
      markActiveRoomAsRead(activeRoomId);
    }
  }, [messages.length, activeRoomId]);

  // Read state request dispatcher
  const markActiveRoomAsRead = async (roomId: string) => {
    try {
      await fetch("/api/messenger/messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId: currentUser.id })
      });
    } catch (e) {
      console.warn("Read receipts failed to send", e);
    }
  };

  // Web Audio simulated synth ping
  const playSubtlePing = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 high tone
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
      // Ignored
    }
  };

  // Send composing typing activity
  const handleComposeChange = (text: string) => {
    setInputText(text);
    if (!typingState) {
      setTypingState(true);
    }
    // Debounce clear typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingState(false);
    }, 2500);
  };

  // Submit standard text message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    const payload = {
      senderId: currentUser.id,
      roomId: activeRoomId,
      text: inputText,
      replyToId: replyToId,
      fileAttachment: attachedFile
    };

    setInputText("");
    setReplyToId(null);
    setAttachedFile(null);
    setTypingState(false);

    try {
      await fetch("/api/messenger/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("Send message crash", err);
    }
  };

  // Simulator for file upload
  const simulateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadPercent(10);

    const interval = setInterval(() => {
      setUploadPercent(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          setAttachedFile({
            name: file.name,
            url: "#",
            size: file.size,
            mimeType: file.type || "application/octet-stream"
          });
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  // Simulated Voice Record Action
  const toggleVoiceRecording = () => {
    if (isRecording) {
      // Done recording
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
      setAttachedFile({
        name: `ضبط_صوتی_هدهد_${Date.now().toString().slice(-4)}.mp3`,
        url: "#",
        size: 341000,
        mimeType: "audio/mp3"
      });
    } else {
      // Start recording
      setIsRecording(true);
      setRecordSeconds(0);
      recordIntervalRef.current = setInterval(() => {
        setRecordSeconds(s => s + 1);
      }, 1000);
    }
  };

  const cancelRecording = () => {
    if (isRecording) {
      clearInterval(recordIntervalRef.current);
      setIsRecording(false);
      setRecordSeconds(0);
    }
  };

  // Special room actions (PIN, MUTE, ARCHIVE)
  const executeRoomAction = async (roomId: string, actionType: string) => {
    try {
      await fetch("/api/messenger/rooms/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userId: currentUser.id, actionType })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Edit Message Action
  const submitMessageEdit = async () => {
    if (!editingMsgId || !editingText.trim()) return;
    try {
      const res = await fetch("/api/messenger/messages/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: editingMsgId,
          userId: currentUser.id,
          newText: editingText
        })
      });
      if (res.ok) {
        setEditingMsgId(null);
        setEditingText("");
      } else {
        const raw = await res.json();
        alert(raw.error || "خطا در ویرایش پیام");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("آیا مطمئن هستید که می‌خواهید این پیام را پاک کنید؟")) return;
    try {
      await fetch("/api/messenger/messages/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: msgId, userId: currentUser.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Add emoji reaction
  const handleEmojiReact = async (msgId: string, emoji: string | null) => {
    try {
      await fetch("/api/messenger/messages/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageId: msgId,
          userId: currentUser.id,
          emoji
        })
      });
      setShowEmojiPickerForMsgId(null);
    } catch (e) {
      console.error(e);
    }
  };

  // Call AI summary
  const handleGenerateSummary = async () => {
    setIsLoadingSummary(true);
    setShowSummaryModal(true);
    try {
      const res = await fetch("/api/messenger/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: activeRoomId })
      });
      const data = await res.json();
      setAiSummaryText(data.summary);
    } catch (e) {
      setAiSummaryText("خطا در برقراری ارتباط با مدل هوش مصنوعی ثانویه هدهد.");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // Submit AI smart input widgets directly
  const submitSmartWidgetResponse = async (widgetLabel: string, value: string) => {
    const formattedText = `📥 [پاسخ فرم هوشمند هوش‌مصنوعی هدهد] \n📌 ${widgetLabel} \n➡️ پاسخ ثبت شده: **${value}**`;
    setInputText("");
    const payload = {
      senderId: currentUser.id,
      roomId: activeRoomId,
      text: formattedText,
      replyToId: null,
      fileAttachment: null
    };

    try {
      await fetch("/api/messenger/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic user matching helper
  const getUserProfile = (userId: string) => {
    const match = systemUsers.find(u => u.id === userId);
    if (match) return match;
    // Default fallback
    return { id: userId, fullName: "همکار سابق", username: "former_user", role: "CONTACT_OP" };
  };

  // Filters
  const activeRoom = (rooms.length > 0 ? (rooms.find(r => r.id === activeRoomId) || rooms[0]) : null) || {
    id: activeRoomId,
    name: "در حال بارگذاری...",
    description: "لطفاً منتظر بمانید",
    color: "#1D9BF0",
    isDissolved: false,
    members: [],
    pinnedBy: [],
    mutedBy: [],
    archivedBy: [],
    type: "GROUP" as const
  };

  const filteredRooms = rooms.filter(room => {
    // 1. Sidebar filter tabs
    if (sidebarFilter === "pinned" && !room.pinnedBy.includes(currentUser.id)) return false;
    if (sidebarFilter === "archived" && !room.archivedBy.includes(currentUser.id)) return false;
    if (sidebarFilter === "groups" && room.type !== "GROUP" && room.type !== "BROADCAST") return false;
    if (sidebarFilter === "direct" && room.type !== "DIRECT") return false;
    // Hide archived by default if "archived" filter not selected
    if (sidebarFilter !== "archived" && room.archivedBy.includes(currentUser.id)) return false;

    // 2. Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      // Direct message names show matching user's name
      if (room.type === "DIRECT") {
        const otherUserId = room.members.find(m => m !== currentUser.id) || "";
        const otherUser = getUserProfile(otherUserId);
        return otherUser.fullName.toLowerCase().includes(query);
      }
      return room.name.toLowerCase().includes(query) || room.description.toLowerCase().includes(query);
    }

    return true;
  });

  const activeMessages = messages.filter(m => m.roomId === activeRoomId);

  // Unread badge count calculator
  const getRoomUnreadCount = (room: Room) => {
    const roomMsgs = messages.filter(m => m.roomId === room.id);
    return roomMsgs.filter(m => m.senderId !== currentUser.id && !m.readBy[currentUser.id]).length;
  };

  // Active status matching helper
  const getUserPresence = (userId: string): { status: "online" | "away" | "busy" | "offline"; text: string; ip?: string } => {
    const matchingStatus = userStatuses.find(s => s.userId === userId);
    if (!matchingStatus) return { status: "offline", text: "آخرین بازدید نامشخص" };

    // Calculate real offline
    const lastActiveTime = new Date(matchingStatus.lastActive).getTime();
    const isStale = (Date.now() - lastActiveTime) > 15000; // Over 15s inactive = away or offline
    if (isStale) {
      return { status: "offline", text: "آفلاین" };
    }

    let statusText = "آنلاین";
    if (matchingStatus.status === "away") statusText = "دور از میزکار";
    if (matchingStatus.status === "busy") statusText = "مشغول بررسی متقاضی";

    return { 
      status: matchingStatus.status, 
      text: statusText,
      ip: matchingStatus.ip 
    };
  };

  const onlineCount = userStatuses.filter(s => {
    const isStale = (Date.now() - new Date(s.lastActive).getTime()) > 15000;
    return !isStale && s.status !== "offline";
  }).length;

  // Find the last message that carries an AI pending question
  const lastAIPendingMsg = [...activeMessages]
    .reverse()
    .find(m => m.aiSuggestion && m.senderId !== currentUser.id);

  return (
    <div className="w-full h-[calc(100vh-180px)] min-h-[580px] grid grid-cols-12 gap-4 animate-scale-up text-right">
      
      {/* 1. LEFT SIDE PANEL - CONVERSATIONS FEED (4 columns) */}
      <div className="col-span-12 lg:col-span-4 glass-panel border border-white/5 rounded-3xl flex flex-col overflow-hidden h-full shadow-2xl">
        
        {/* Left pane header: Search & online summary stats */}
        <div className="p-4 border-b border-white/5 space-y-3 bg-white/2">
          <div className="flex justify-between items-center bg-white/2 rounded-2xl p-2.5 border border-white/5">
            <button 
              onClick={() => setShowNewChatModal(true)} 
              className="flex items-center gap-1 px-2 py-1 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-[10px] font-bold rounded-lg border border-brand-primary/20 transition active:scale-95 cursor-pointer"
            >
              <Plus size={11} />
              چت شخصی جدید
            </button>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                ● {onlineCount} فعال
              </span>
              <h3 className="text-sm font-black text-white flex items-center gap-1 leading-none">
                همکاران صبا
                <MessageSquare className="text-brand-primary" size={13} />
              </h3>
            </div>
          </div>

          {/* Quick search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی همکار، گروه یا گروه آموزشی..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/40 text-xs text-white placeholder-slate-500 border border-white/5 focus:border-brand-primary/40 rounded-xl pr-9 pl-4 py-2.5 outline-none transition"
            />
            <Search size={14} className="absolute right-3.5 top-3.5 text-slate-500" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute left-3 top-3.5 text-slate-500 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Filters switches */}
          <div className="flex flex-row-reverse gap-1 overflow-x-auto pb-1 text-[11px] font-medium text-slate-400 scrollbar-none">
            <button
              onClick={() => setSidebarFilter("all")}
              className={`px-3 py-1 rounded-full transition whitespace-nowrap cursor-pointer ${sidebarFilter === "all" ? "bg-brand-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
            >
              همه
            </button>
            <button
              onClick={() => setSidebarFilter("groups")}
              className={`px-3 py-1 rounded-full transition whitespace-nowrap cursor-pointer ${sidebarFilter === "groups" ? "bg-brand-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
            >
              گروه‌ها ({rooms.filter(r => r.type === "GROUP" || r.type === "BROADCAST").length})
            </button>
            <button
              onClick={() => setSidebarFilter("direct")}
              className={`px-3 py-1 rounded-full transition whitespace-nowrap cursor-pointer ${sidebarFilter === "direct" ? "bg-brand-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
            >
              شخصی ({rooms.filter(r => r.type === "DIRECT").length})
            </button>
            <button
              onClick={() => setSidebarFilter("pinned")}
              className={`px-3 py-1 rounded-full transition whitespace-nowrap cursor-pointer ${sidebarFilter === "pinned" ? "bg-brand-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
            >
              📌 پین شده
            </button>
            <button
              onClick={() => setSidebarFilter("archived")}
              className={`px-3 py-1 rounded-full transition whitespace-nowrap cursor-pointer ${sidebarFilter === "archived" ? "bg-brand-primary text-white" : "bg-white/5 hover:bg-white/10"}`}
            >
              📦 بایگانی
            </button>
          </div>
        </div>

        {/* Room conversation lists scrolls */}
        <div className="flex-grow overflow-y-auto divide-y divide-white/5 scrollbar-thin">
          {filteredRooms.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              هیچ گفتگویی یافت نشد.
            </div>
          ) : (
            filteredRooms.map(room => {
              const isActive = room.id === activeRoomId;
              const unreadCount = getRoomUnreadCount(room);
              const isPinned = room.pinnedBy.includes(currentUser.id);
              const isMuted = room.mutedBy.includes(currentUser.id);

              // Direct profiles extraction
              let displayName = room.name;
              let displaySubtitle = room.description;
              let isOnline = false;

              if (room.type === "DIRECT") {
                const partnerId = room.members.find(id => id !== currentUser.id) || "";
                const partner = getUserProfile(partnerId);
                displayName = partner.fullName;
                const status = getUserPresence(partnerId);
                displaySubtitle = status.text;
                isOnline = status.status === "online";
              }

              return (
                <div
                  key={room.id}
                  onClick={() => setActiveRoomId(room.id)}
                  className={`p-3.5 flex items-center justify-between gap-3 transition cursor-pointer select-none group border-r-4 ${isActive ? "bg-brand-primary/10 border-brand-primary" : "hover:bg-white/3 border-transparent"}`}
                >
                  <div className="flex items-center gap-1">
                    {/* Unread & Action Indicators */}
                    {unreadCount > 0 && (
                      <span className="w-5 h-5 bg-brand-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                        {unreadCount}
                      </span>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition mr-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeRoomAction(room.id, isPinned ? "UNPIN" : "PIN");
                        }}
                        title="پین گفتگو"
                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                      >
                        <Pin size={11} className={isPinned ? "fill-brand-primary text-brand-primary" : ""} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeRoomAction(room.id, isMuted ? "UNMUTE" : "MUTE");
                        }}
                        title="بی‌صدا کردن"
                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                      >
                        <VolumeX size={11} className={isMuted ? "text-amber-500" : ""} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          executeRoomAction(room.id, room.archivedBy.includes(currentUser.id) ? "UNARCHIVE" : "ARCHIVE");
                        }}
                        title="بایگانی کردن"
                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                      >
                        <Archive size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col">
                      <h4 className="text-xs font-black text-white flex items-center gap-1.5 justify-end">
                        {displayName}
                        {room.type === "BROADCAST" && <Radio size={12} className="text-violet-400" />}
                        {room.type === "GROUP" && <Users size={12} className="text-blue-400" />}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                        {displaySubtitle}
                      </p>
                    </div>

                    {/* Room Avatar */}
                    <div className="relative">
                      <div 
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs text-white shadow shadow-black/40"
                        style={{ backgroundColor: room.color || "#1D9BF0" }}
                      >
                        {displayName.charAt(0)}
                      </div>
                      {room.type === "DIRECT" && isOnline && (
                        <span className="absolute bottom-[-1px] right-[-1px] w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-md animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer with return action */}
        <div className="p-3 border-t border-white/5 bg-slate-950/40 flex items-center justify-between gap-2.5">
          <button
            onClick={onBack}
            className="flex-grow py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 rounded-xl transition text-[11px] font-black text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            🚪 خروج از پیام‌رسان و بازگشت به کارتابل
          </button>
        </div>

        {/* Supervision module dashboard trigger strictly for ADMINS */}
        {currentUser.role === "ADMIN" && (
          <div className="p-3 border-t border-white/5 bg-slate-950/60">
            <button
              onClick={() => setSupervisorActive(!supervisorActive)}
              className="w-full py-2 bg-red-600/15 hover:bg-red-600 text-red-300 hover:text-white text-[11px] font-black border border-red-500/20 hover:border-red-500/40 rounded-xl transition flex justify-center items-center gap-1.5"
            >
              <Shield size={13} />
              {supervisorActive ? "بستن ماژول نظارت و ردیابی ارشد" : "ورود به مانیتورینگ زنده کل پرسنل (Supervision)"}
            </button>
          </div>
        )}
      </div>

      {/* 2. CHAT AREA PORTAL (8 columns or split when supervision is open) */}
      <div className={`col-span-12 ${currentUser.role === "ADMIN" && supervisorActive ? "lg:col-span-5" : "lg:col-span-8"} glass-panel border border-white/5 rounded-3xl flex flex-col overflow-hidden h-full shadow-2xl relative`}>
        
        {/* Dynamic customized background wallpaper classes */}
        <div className={`absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-300 ${
          activeWallpaper === "purple" ? "bg-radial-purple opacity-95" :
          activeWallpaper === "teal" ? "bg-radial-teal opacity-95" : "bg-radial-charcoal"
        }`} />

        {/* Chat area header */}
        <div className="p-3.5 border-b border-white/5 flex justify-between items-center bg-white/2 backdrop-blur-md relative z-10">
          <div className="flex items-center gap-2">
            {/* AI Summary and styling config buttons */}
            <button
              onClick={handleGenerateSummary}
              className="px-3.5 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] text-yellow-400 hover:text-white hover:bg-gradient-to-r hover:from-amber-600 hover:to-orange-500 shadow-lg tracking-tight font-extrabold flex items-center gap-1 transition"
            >
              <Sparkles size={11} className="animate-pulse" />
              خلاصه‌ساز گفتگو (AI)
            </button>

            {currentUser.role === "ADMIN" && activeRoom.id !== "room-all" && activeRoom.id !== "room-broadcast" && !activeRoom.isDissolved && (
              <button
                onClick={async () => {
                  if (confirm("آیا از منحل کردن این گفتگو اطمینان دارید؟ اعضا دیگر قادر به تبادل پیام در آن نخواهند بود.")) {
                    try {
                      const res = await fetch("/api/messenger/rooms/action", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          roomId: activeRoom.id,
                          userId: currentUser.id,
                          actionType: "DISSOLVE"
                        })
                      });
                      if (res.ok) {
                        alert("این گفتگو با موفقیت منحل و مسدود گردید.");
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }
                }}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/20 text-red-500 font-black rounded-full text-[10px] flex items-center gap-1 transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                🔒 منحل کردن گپ
              </button>
            )}

            {/* Custom wallpaper changer */}
            <div className="flex gap-1">
              {WALLPAPERS.map(w => (
                <button
                  key={w.id}
                  onClick={() => setActiveWallpaper(w.id)}
                  title={`تصویر زمینه ${w.name}`}
                  className={`w-4 h-4 rounded-full border transition active:scale-95 ${activeWallpaper === w.id ? "border-white scale-110" : "border-transparent opacity-60"}`}
                  style={{
                    backgroundColor: w.id === "purple" ? "#581C87" : w.id === "teal" ? "#115E59" : "#1E1E2E"
                  }}
                />
              ))}
            </div>

            {/* Font config */}
            <select
              value={fontSize}
              onChange={e => setFontSize(e.target.value as any)}
              className="bg-white/5 text-[10px] text-slate-300 border border-white/5 rounded px-2 py-0.5"
            >
              <option value="sm">فونت ریز</option>
              <option value="md">فونت متوسط</option>
              <option value="lg">فونت بزرگ</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <h3 className="text-xs font-black text-white flex items-center gap-1.5 justify-end">
                {activeRoom.name}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                {activeRoom.type === "DIRECT" 
                  ? getUserPresence(activeRoom.members.find(id => id !== currentUser.id) || "").text 
                  : activeRoom.description || "گپ گروهی سازمانی"
                }
              </p>
            </div>
            
            <div 
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs text-white"
              style={{ backgroundColor: activeRoom.color || "#1D9BF0" }}
            >
              {activeRoom.name.charAt(0)}
            </div>
          </div>
        </div>

        {/* Message timeline list */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-thin flex flex-col">
          {activeMessages.length === 0 ? (
            <div className="my-auto text-center flex flex-col items-center justify-center">
              <div className="p-4 bg-white/2 border border-white/5 rounded-full mb-3 text-slate-400 animate-pulse">
                <MessageSquare size={32} />
              </div>
              <p className="text-xs text-slate-400 font-medium">هیچ پیامی در این اتاق گفتگو رد و بدل نشده است.</p>
              <p className="text-[10px] text-slate-500 mt-1.5">اولین پیام را همگروهی‌های خود انتقال دهید!</p>
            </div>
          ) : (
            activeMessages.map((msg, idx) => {
              const isOwn = msg.senderId === currentUser.id;
              const sender = getUserProfile(msg.senderId);
              
              const isMessageEdited = msg.isEdited;
              const isDeleted = msg.isDeleted;

              // Seen checkmark calculations
              const totalReadUsers = Object.keys(msg.readBy).filter(id => id !== msg.senderId).length;
              const isReadByOther = totalReadUsers > 0;

              return (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] relative group ${isOwn ? "self-end items-end" : "self-start items-start"}`}
                >
                  {/* Sender Name header */}
                  {!isOwn && (
                    <span className="text-[10px] text-brand-primary font-black mb-1.5 px-2">
                      {sender.fullName} ({sender.role === "ADMIN" ? "مدیر" : "همکار"})
                    </span>
                  )}

                  {/* Message Bubble */}
                  <div 
                    className={`p-3 rounded-2xl relative shadow-xl min-w-[70px] ${
                      isOwn 
                        ? "bg-brand-primary/20 text-white rounded-tr-none border border-brand-primary/30" 
                        : "bg-slate-900/60 text-slate-100 rounded-tl-none border border-white/10"
                    } ${
                      fontSize === "sm" ? "text-xs" : fontSize === "lg" ? "text-base font-medium" : "text-sm text-right"
                    }`}
                  >
                    {/* Reply quote attachment */}
                    {msg.replyToId && (
                      <div className="mb-2 p-2 bg-black/40 border-r-2 border-brand-primary rounded-lg text-[10px] text-slate-400 leading-relaxed text-right">
                        {messages.find(m => m.id === msg.replyToId)?.text || "پیام سابق"}
                      </div>
                    )}

                    {/* Attachment files display */}
                    {msg.fileAttachment && (
                      <div className="mb-2 p-2.5 bg-black/30 rounded-xl border border-white/5 flex items-center justify-between gap-3 text-right">
                        <FileText size={18} className="text-brand-primary" />
                        <div className="flex-grow">
                          <p className="text-[10px] text-white font-bold truncate max-w-[120px]">{msg.fileAttachment.name}</p>
                          <span className="text-[8px] text-slate-500 font-mono">{(msg.fileAttachment.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <a 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); alert("دانلود فایل‌های پیوست چت تنها در نسخه دپلوی‌شده نهایی پشتیبانی می‌گردد."); }}
                          className="px-2 py-1 bg-white/5 hover:bg-brand-primary hover:text-white rounded text-[8px] transition"
                        >
                          دانلود 📥
                        </a>
                      </div>
                    )}

                    {/* Text block */}
                    <p className={`leading-relaxed whitespace-pre-wrap ${isDeleted ? "text-slate-500 italic" : "text-slate-200"}`}>
                      {msg.text}
                    </p>

                    {/* Bubble details footer */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-white/5 text-[8px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        {isMessageEdited && (
                          <span className="text-[7px] bg-white/10 text-slate-400 px-1 rounded">ویرایش‌شد</span>
                        )}
                        <span>{new Date(msg.createdAt).toLocaleTimeString("fa-IR", {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>

                      {/* Read tick icons for owners */}
                      {isOwn && (
                        <div>
                          {isReadByOther ? (
                            <CheckCheck size={11} className="text-brand-primary" />
                          ) : (
                            <Check size={11} className="text-slate-500" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Reaction badges overlay */}
                    {Object.keys(msg.reactions).length > 0 && (
                      <div className="absolute bottom-[-13px] right-2.5 flex gap-0.5 bg-slate-900/90 border border-white/10 rounded-full px-1.5 py-0.5 text-[9px] shadow z-10">
                        {Object.entries(msg.reactions).map(([uid, face]) => (
                          <button 
                            key={uid} 
                            onClick={() => handleEmojiReact(msg.id, null)} 
                            title={`${getUserProfile(uid).fullName} عکس‌العمل نشان داد`}
                            className="hover:scale-125 transition"
                          >
                            {face}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* HOVER HOVER ACTIONS TOOLBAR (Reply, Emoji, Delete, Edit) */}
                  {!isDeleted && (
                    <div className="absolute top-2 opacity-0 group-hover:opacity-100 transition duration-150 z-20 flex gap-1 bg-slate-950/92 rounded-full px-2 py-1 border border-white/10 shadow-lg text-[10px] items-center scale-90 md:scale-100"
                         style={{ [isOwn ? "left" : "right"]: "-110px" }}
                    >
                      <button 
                        onClick={() => setReplyToId(msg.id)} 
                        className="text-slate-300 hover:text-white"
                        title="پاسخ به پیام"
                      >
                        پاسخ
                      </button>
                      <span className="text-slate-600">|</span>
                      
                      {/* Emoji reaction mini picker */}
                      <button 
                        onClick={() => setShowEmojiPickerForMsgId(showEmojiPickerForMsgId === msg.id ? null : msg.id)}
                        className="text-slate-300 hover:text-yellow-400"
                        title="عکس‌العمل ایموجی"
                      >
                        ایموجی
                      </button>

                      {isOwn && (
                        <>
                          <span className="text-slate-600">|</span>
                          <button 
                            onClick={() => {
                              setEditingMsgId(msg.id);
                              setEditingText(msg.text);
                            }}
                            className="text-slate-300 hover:text-emerald-400"
                            title="ویرایش پیام"
                          >
                            ویرایش
                          </button>
                          <span className="text-slate-600">|</span>
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="text-slate-300 hover:text-red-400 text-[9px]"
                            title="حذف پیام"
                          >
                            حذف
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Mini floating emoji popup */}
                  {showEmojiPickerForMsgId === msg.id && (
                    <div className="absolute top-[-40px] right-2 z-50 flex gap-1 bg-slate-950 p-1.5 rounded-full border border-white/15 shadow-2xl animate-bounce">
                      {["👍", "❤️", "😂", "😮", "😢", "🙏", "❌"].map(face => (
                        <button
                          key={face}
                          onClick={() => handleEmojiReact(msg.id, face === "❌" ? null : face)}
                          className="hover:scale-125 transition text-xs"
                        >
                          {face}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Typing indicators panel */}
        {userStatuses
          .filter(s => s.userId !== currentUser.id && s.typingRoomId === activeRoomId)
          .map(s => {
            const user = getUserProfile(s.userId);
            const staleCheck = (Date.now() - new Date(s.lastActive).getTime()) < 15000;
            if (!staleCheck) return null;
            return (
              <div key={s.userId} className="px-4 py-2 bg-white/2 border-y border-white/5 flex items-center gap-2 relative z-10 text-[10px] text-slate-400 mr-auto self-start animate-pulse">
                <span>{user.fullName} در حال نوشتن پیام... ✍️</span>
              </div>
            );
          })
        }

        {/* 3. AI Smart Suggestion Form Widget Overlay */}
        {lastAIPendingMsg && (
          <div className="mx-4 mb-3 p-4 bg-slate-950/95 border border-brand-primary/40 rounded-2xl relative z-20 shadow-2xl shadow-brand-primary/10 text-right animate-scale-up">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[8px] bg-brand-primary/20 text-brand-primary px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 uppercase">
                <Sparkles size={8} />
                ماژول تولید فرم هوش مصنوعی هدهد
              </span>
              <p className="text-[10px] text-slate-400 font-medium">سنجش اتوماتیک کدهای روان‌شناختی درخواست شده</p>
            </div>

            <p className="text-xs text-white font-extrabold mb-3 leading-relaxed">
              ❓ هوش مصنوعی نوعی درخواست اطلاعات کلامی در بالا از طرف همکار شما شناسایی کرده است:
              <span className="block mt-1.5 text-xs text-slate-300 italic font-semibold">« {lastAIPendingMsg.text} »</span>
            </p>

            {/* Smart fields dynamic forms rendering based on WidgetType */}
            <div className="p-3 bg-white/3 border border-white/10 rounded-xl">
              <SmartSuggestionWidget 
                suggestion={lastAIPendingMsg.aiSuggestion} 
                onSubmit={(val) => submitSmartWidgetResponse(lastAIPendingMsg.aiSuggestion!.label, val)} 
              />
            </div>
          </div>
        )}

        {/* Reply Quote preview bar */}
        {replyToId && (
          <div className="mx-4 p-2 bg-slate-950/60 border-r-2 border-brand-primary rounded-xl flex justify-between items-center text-[10px] text-slate-400 relative z-10">
            <span>پاسخ به: {messages.find(m => m.id === replyToId)?.text.slice(0, 40)}...</span>
            <button onClick={() => setReplyToId(null)} className="text-red-400 hover:text-white">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Text compose input box toolbar footer */}
        <div className="p-4 bg-white/2 backdrop-blur-md border-t border-white/5 relative z-10">
          
          {/* File attachment preview */}
          {attachedFile && (
            <div className="mb-3 p-2 bg-slate-950 border border-brand-primary/20 rounded-xl flex items-center justify-between text-xs text-slate-300">
              <span className="truncate">📎 آماده آپلود: {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => setAttachedFile(null)} className="text-red-400 hover:text-white">
                <X size={12} />
              </button>
            </div>
          )}

          {/* Voice recording state preview bar */}
          {isRecording && (
            <div className="mb-3 p-3 bg-red-950/70 border border-red-500/20 rounded-xl flex items-center justify-between text-xs text-white animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span>در حال ضبط کلام همکار... {recordSeconds} ثانیه</span>
              </div>
              <div className="flex gap-2">
                <button onClick={toggleVoiceRecording} className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded-lg text-[10px]">
                  تایید و ذخیره 💾
                </button>
                <button onClick={cancelRecording} className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px]">
                  لغو
                </button>
              </div>
            </div>
          )}

          {/* Core compose form input */}
          <form onSubmit={handleSendMessage} className="flex gap-3 items-center">
            
            {/* Action buttons (Attach, Voice, Send emoji, etc.) */}
            <div className="flex gap-1.5 items-center">
              
              {/* Record Audio Button */}
              <button
                type="button"
                onClick={toggleVoiceRecording}
                className={`p-2.5 rounded-xl border transition active:scale-95 cursor-pointer ${isRecording ? "bg-red-600 text-white border-red-500" : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"}`}
                title="ضبط پیام صونی"
              >
                <Mic size={16} />
              </button>

              {/* Attach File Button */}
              <label className="p-2.5 bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 rounded-xl cursor-pointer transition active:scale-95 flex items-center justify-center">
                <Paperclip size={16} />
                <input
                  type="file"
                  onChange={simulateFileUpload}
                  className="hidden"
                />
              </label>

              {/* Upload dynamic spinner */}
              {isUploading && (
                <div className="text-[8px] bg-slate-900 border border-white/5 px-1.5 py-1 rounded text-brand-primary animate-pulse">
                  {uploadPercent}%...
                </div>
              )}
            </div>

            {/* Editing mode dialog or Standard texting input text area */}
            {editingMsgId ? (
              <div className="flex-grow flex gap-2">
                <input
                  type="text"
                  value={editingText}
                  onChange={e => setEditingText(e.target.value)}
                  className="flex-grow bg-slate-950 border border-emerald-500/30 text-white rounded-xl px-4 py-2.5 text-xs outline-none focus:border-emerald-500"
                />
                <button 
                  type="button" 
                  onClick={submitMessageEdit} 
                  className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                >
                  ذخیره ویرایش
                </button>
                <button 
                  type="button" 
                  onClick={() => setEditingMsgId(null)} 
                  className="px-2 py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs transition"
                >
                  لغو
                </button>
              </div>
            ) : (
              <div className="flex-grow relative">
                <input
                  type="text"
                  required
                  placeholder={activeRoom.isDissolved ? "این اتاق گفتگو منحل شده است." : "چیزی برای همکاران موسسه تایپ کنید..."}
                  disabled={activeRoom.isDissolved || isRecording}
                  value={inputText}
                  onChange={e => handleComposeChange(e.target.value)}
                  className="w-full bg-slate-950/60 text-xs text-white placeholder-slate-400 border border-white/5 focus:border-brand-primary/40 rounded-xl pr-4 pl-12 py-3 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={activeRoom.isDissolved || isRecording}
                  className="absolute left-2.5 top-2.5 p-1.5 bg-brand-primary hover:bg-brand-primary/95 text-white rounded-lg transition active:scale-95 disabled:opacity-40"
                >
                  <Send size={13} />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* 4. ADMIN LIVE SUPERVISION & AUDITING (Right split pane ONLY for role ADMIN when active) */}
      {currentUser.role === "ADMIN" && supervisorActive && (
        <div className="col-span-12 lg:col-span-3 glass-panel border border-white/5 rounded-3xl p-4 flex flex-col overflow-hidden h-full shadow-2xl space-y-4 animate-scale-up text-right">
          <div className="border-b border-white/10 pb-2.5">
            <h3 className="text-sm font-black text-red-400 flex items-center gap-1.5 justify-end">
              میز نظارت زنده مدیریت ارشد هدهد
              <Shield size={16} />
            </h3>
            <p className="text-[10px] text-slate-500 mt-1">بخش ردیابی کلاینت‌ها، آی‌پی‌ها و امنیت کلامی همکاران</p>
          </div>

          {/* Quick status timeline track */}
          <div className="flex-grow overflow-y-auto space-y-3.5 divide-y divide-white/5 scrollbar-thin">
            
            <div className="space-y-1.5 pt-2">
              <span className="text-[10px] text-slate-400 font-bold block">موقعیت فیزیکی و هویّت همکاران بر خط:</span>
              {userStatuses.map(status => {
                const user = getUserProfile(status.userId);
                const presence = getUserPresence(status.userId);
                return (
                  <div key={status.userId} className="p-2.5 bg-white/2 rounded-xl border border-white/5 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className={`text-[8px] px-2 py-0.5 rounded-full ${presence.status === "online" ? "bg-emerald-500/10 text-emerald-400 animate-pulse" : "bg-slate-500/10 text-slate-400"}`}>
                        ● {presence.text}
                      </span>
                      <span className="text-[10px] font-black text-white">{user.fullName}</span>
                    </div>

                    <div className="text-[9px] text-slate-400 space-y-0.5 font-mono text-left block">
                      <p className="flex items-center gap-1 justify-end">
                        آی‌پی کلاینت: {status.ip}
                        <MapPin size={9} />
                      </p>
                      <p className="flex items-center gap-1 justify-end">
                        سیستم عامل: {status.os} - مرورگر: {status.browser}
                        <Monitor size={9} />
                      </p>
                      <p className="flex items-center gap-1 justify-end">
                        وضوح مانیتور: {status.screenResolution}
                      </p>
                    </div>

                    {status.typingRoomId && (
                      <p className="text-[8px] text-brand-primary font-bold animate-bounce text-right">✍️ در حال تایپ در گروه...</p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-3">
              <span className="text-[10px] text-slate-400 font-bold block">تحلیل طبقه‌بندی کدهای موضوعی هوش مصنوعی:</span>
              <div className="p-3 bg-slate-950/80 rounded-xl border border-white/5 space-y-2 text-[10px]">
                <p className="flex justify-between text-slate-300">
                  <span>{messages.filter(m => m.aiTopic).length} پیام</span>
                  <span>پیام‌های اسکن شده:</span>
                </p>
                <p className="flex justify-between text-slate-300">
                  <span>{messages.filter(m => m.aiSuggestion).length} پیشنهاد فرم</span>
                  <span>فرم‌های هوشمند صادر شده:</span>
                </p>
                
                <div className="pt-2 border-t border-slate-900 grid grid-cols-2 gap-1 text-[8px] text-center text-brand-primary">
                  <span className="bg-white/5 py-1 rounded">سن: {messages.filter(m => m.aiTopic === "سن").length} بار</span>
                  <span className="bg-white/5 py-1 rounded">تاریخ: {messages.filter(m => m.aiTopic === "تاریخ").length} بار</span>
                  <span className="bg-white/5 py-1 rounded">تلفن: {messages.filter(m => m.aiTopic === "تلفن").length} بار</span>
                  <span className="bg-white/5 py-1 rounded">ملاقات: {messages.filter(m => m.aiTopic === "زمان‌بندی نوبت").length} بار</span>
                </div>
              </div>
            </div>

            {/* Quick Broadcast Announcement */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              <span className="text-[10px] text-slate-400 font-bold block">ارسال بخشنامه فوری سراسری (مدیر ارشد):</span>
              <div className="p-3 bg-red-950/20 rounded-xl border border-red-500/10 space-y-2 text-[10px]">
                <textarea
                  id="broadcastTextArea"
                  placeholder="متن اطلاعیه مهم برای کانال‌ها و شعب چت..."
                  rows={2}
                  className="w-full bg-slate-950/80 border border-white/5 rounded-lg p-2 text-[10px] text-white focus:border-red-500 outline-none resize-none text-right"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const textEl = document.getElementById("broadcastTextArea") as HTMLTextAreaElement;
                    const val = textEl?.value;
                    if (!val) return alert("لطفاً متن اطلاعیه را وارد نمایید.");
                    try {
                      const res = await fetch("/api/messenger/broadcast-announcement", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          senderId: currentUser.id,
                          text: val
                        })
                      });
                      if (res.ok) {
                        alert("بخشنامه به تمامی واحدهای چت با موفقیت ارسال گردید.");
                        textEl.value = "";
                      } else {
                        const errData = await res.json();
                        alert(`خطا: ${errData.error}`);
                      }
                    } catch (err) {
                      console.error(err);
                      alert("خطا در ارسال بخشنامه سرتاسری.");
                    }
                  }}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition active:scale-95 text-[10px] cursor-pointer"
                >
                  📡 ارسال فوری بخشنامه به تمام گروه‌ها
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* NEW DIRECT CHAT SELECTION MODAL */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-white/10 rounded-3xl p-6 max-w-sm w-full text-right shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setShowNewChatModal(false)}
              className="absolute left-4 top-4 p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition text-slate-400"
            >
              <X size={14} />
            </button>

            <div className="flex items-center gap-1.5 text-brand-primary border-b border-white/10 pb-3 mb-4 justify-end">
              <h3 className="text-sm font-black text-white">آغاز گفتگوی شخصی جدید</h3>
              <UserIcon size={16} />
            </div>

            <p className="text-[10px] text-slate-400 mb-4">یک همکار را برای شروع گفتگوی دو نفره و خصوصی انتخاب کنید:</p>

            <div className="space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
              {systemUsers
                .filter(u => u.id !== currentUser.id)
                .map(u => (
                  <button
                    key={u.id}
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/messenger/rooms", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: u.fullName,
                            type: "DIRECT",
                            members: [currentUser.id, u.id],
                            creatorId: currentUser.id
                          })
                        });
                        const room = await res.json();
                        setActiveRoomId(room.id);
                        setSidebarFilter("all");
                        setShowNewChatModal(false);
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full p-2.5 bg-white/2 hover:bg-brand-primary/10 border border-white/5 rounded-xl text-right flex flex-row-reverse items-center justify-between transition cursor-pointer group"
                  >
                    <div className="flex flex-row-reverse items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-white text-xs font-black">
                        {u.fullName[0]}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white group-hover:text-brand-primary transition">{u.fullName}</p>
                        <p className="text-[9px] text-slate-400 mt-0.5">{u.role === "ADMIN" ? "مدیر سیستم" : "کاربر سامانه"}</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-brand-primary/80 group-hover:translate-x-1 transition">💬 گفتگو</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. GLOWING GLASS AI SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900/90 border border-brand-primary/30 rounded-3xl p-6 max-w-md w-full text-right shadow-2xl relative animate-scale-up">
            <button 
              onClick={() => setShowSummaryModal(false)}
              className="absolute left-4 top-4 p-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full transition text-slate-400"
            >
              <X size={14} />
            </button>

            <div className="flex items-center gap-1.5 text-yellow-400 border-b border-white/10 pb-3 mb-4 justify-end">
              <h3 className="text-sm font-black text-white">خلاصه گفتگوهای اخیر با مدل هوش مصنوعی هدهد</h3>
              <Sparkles size={16} className="animate-spin" />
            </div>

            {isLoadingSummary ? (
              <div className="p-8 text-center flex flex-col justify-center items-center">
                <Clock className="animate-spin text-brand-primary mb-3" size={32} />
                <p className="text-xs text-slate-300">درحال ارسال پکیج گفتگوها به مدل تفهمیمی و دریافت خلاصه ۳ خطی جلالی...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/80 p-4 rounded-2xl border border-white/5 shadow-inner">
                  {aiSummaryText}
                </p>
                
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="w-full py-2.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-extrabold rounded-xl transition text-xs"
                >
                  فهمیدم، بستن تحلیل
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-Component compiling interactive smart input forms
interface SmartWidgetProps {
  suggestion: any;
  onSubmit: (val: string) => void;
}

function SmartSuggestionWidget({ suggestion, onSubmit }: SmartWidgetProps) {
  const [val, setVal] = useState("");
  const [starRating, setStarRating] = useState(0);

  if (!suggestion) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (val.trim()) {
      onSubmit(val);
      setVal("");
    }
  };

  // 1. AGE WIDGET
  if (suggestion.type === "age") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="1"
            max="120"
            required
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="مثال: ۲۴"
            className="flex-grow bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs text-center outline-none focus:border-brand-primary"
          />
          <button type="submit" className="px-3 bg-brand-primary text-white text-xs font-black rounded-lg transition active:scale-95">
            ثبت سن 👤
          </button>
        </div>
      </form>
    );
  }

  // 2. DATE WIDGET
  if (suggestion.type === "date") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="مثال: ۱۴۰۵/۰۴/۱۵"
            className="flex-grow bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs text-center outline-none focus:border-brand-primary"
          />
          <button type="submit" className="px-3 bg-brand-primary text-white text-xs font-black rounded-lg transition">
            ثبت تاریخ 📅
          </button>
        </div>
      </form>
    );
  }

  // 3. YES_NO CHIPS
  if (suggestion.type === "yes_no") {
    return (
      <div className="space-y-2 text-center">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2 justify-center">
          {["بله، کاملا موافقم 👍", "خیر، متاسفانه امکانش نیست ❌", "شاید بعداً هماهنگ کنیم 🤔"].map(chip => (
            <button
              key={chip}
              onClick={() => onSubmit(chip)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-brand-primary hover:text-white text-[10px] border border-white/5 rounded-lg transition active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 4. NAME INPUT
  if (suggestion.type === "name") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="نام متقاضی جدید..."
            className="flex-grow bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs outline-none"
          />
          <button type="submit" className="px-3 bg-brand-primary text-white text-xs font-bold rounded-lg">ثبت نام</button>
        </div>
      </form>
    );
  }

  // 5. PHONE FORMAT
  if (suggestion.type === "phone") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2">
          <input
            type="tel"
            required
            pattern="09[0-9]{9}"
            value={val}
            onChange={e => setVal(e.target.value)}
            placeholder="مثال: 09123456789"
            className="flex-grow bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs text-center font-mono outline-none"
          />
          <button type="submit" className="px-3 bg-brand-primary text-white text-xs font-bold rounded-lg">تایید موبایل</button>
        </div>
      </form>
    );
  }

  // 6. EDUCATION DROPDOWN
  if (suggestion.type === "education") {
    const opts = ["زیر دیپلم", "دیپلم متوسطه", "لیسانس کارشناسی", "فوق لیسانس", "دکتری تخصصی"];
    return (
      <div className="space-y-2 text-center">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-1.5 justify-center flex-wrap">
          {opts.map(opt => (
            <button
              key={opt}
              onClick={() => onSubmit(opt)}
              className="px-3 py-1.5 bg-slate-950 hover:bg-brand-primary text-white text-[10px] rounded-lg border border-white/5 transition"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 7. GENDER SELECT
  if (suggestion.type === "gender") {
    return (
      <div className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2 justify-center">
          <button onClick={() => onSubmit("خانم 👩")} className="px-5 py-2 bg-slate-950 hover:bg-pink-600 hover:text-white rounded-xl text-xs transition">👩 خانم</button>
          <button onClick={() => onSubmit("آقا 👨")} className="px-5 py-2 bg-slate-950 hover:bg-blue-600 hover:text-white rounded-xl text-xs transition">👨 آقا</button>
        </div>
      </div>
    );
  }

  // 8. STAR RATING
  if (suggestion.type === "star_rating") {
    return (
      <div className="space-y-2 text-center">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => {
                setStarRating(star);
                onSubmit(`${star} ستاره کیفی ⭐`);
              }}
              className="text-lg transition transform hover:scale-125 text-yellow-500"
            >
              {star <= starRating ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 9. TIME CHIPS
  if (suggestion.type === "time") {
    const times = ["09:00", "11:30", "15:00", "17:30", "19:00"];
    return (
      <div className="space-y-2 text-center">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-1.5 justify-center overflow-x-auto">
          {times.map(t => (
            <button
              key={t}
              onClick={() => onSubmit(`ساعت ${t}`)}
              className="px-3 py-1 bg-slate-950 hover:bg-brand-primary hover:text-white text-[10px] rounded border border-white/5 transition"
            >
              ⏰ {t}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 10. NUMBER INPUT
  if (suggestion.type === "number") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="flex gap-2">
          <input
            type="number"
            required
            value={val}
            onChange={e => setVal(e.target.value)}
            className="flex-grow bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs text-center"
          />
          <button type="submit" className="px-4 bg-brand-primary text-white text-xs font-bold rounded-lg">تایید تعداد</button>
        </div>
      </form>
    );
  }

  // 11. SCHEDULE PICKER
  if (suggestion.type === "schedule") {
    return (
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[10px] text-slate-400 block">{suggestion.label}</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            placeholder="تاریخ جلالی (فردا)"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="bg-slate-950 text-white border border-white/10 rounded-lg px-3 py-1.5 text-xs text-center"
          />
          <button 
            type="button"
            onClick={() => onSubmit(`نوبت رزرو ملاقات به تاریخ ${val || "فردا"} در ساعت ۱۶:۰۰ عصر 🕒`)}
            className="bg-brand-primary text-white text-xs font-bold rounded-lg transition py-1.5"
          >
            نهایی‌سازی برنامه ملاقات
          </button>
        </div>
      </form>
    );
  }

  // 12. FILE INSTRUCTIONS
  if (suggestion.type === "file") {
    return (
      <div className="p-3 text-center border border-dashed border-white/15 rounded-xl text-[10px] text-slate-400 cursor-pointer hover:bg-white/2"
           onClick={() => onSubmit("رزومه_همکار_فایل_پرونده.pdf")}
      >
        <Paperclip size={16} className="mx-auto mb-1 text-slate-400" />
        <p className="font-bold text-white mb-0.5">درخواست کلیک جهت ضمیمه پرونده صوتی یا تصویری متقاضی</p>
        <span className="text-[8px] text-slate-500">برای ارسال خودکار فایل کدهای کلامی کلیک کنید</span>
      </div>
    );
  }

  return null;
}
