import { useState, useCallback } from "react";
import { Header } from "./components/Header";
import { ChatPanel } from "./components/ChatPanel";
import { VoicePanel } from "./components/VoicePanel";
import { SettingsModal } from "./components/SettingsModal";
import type { ChatMessage, AppMode } from "./types";

export default function App() {
  const [mode, setMode] = useState<AppMode>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  return (
    <>
      <Header
        mode={mode}
        onModeChange={setMode}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <main style={styles.main}>
        {mode === "chat" ? (
          <ChatPanel messages={messages} onAddMessage={addMessage} />
        ) : (
          <VoicePanel messages={messages} onAddMessage={addMessage} />
        )}
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
};
