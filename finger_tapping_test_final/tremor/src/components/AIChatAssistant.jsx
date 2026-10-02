import React, { useState, useEffect, useRef } from 'react';

export default function AIChatAssistant({ onBack }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hello! I am your AI Chat Assistant powered by your local Ollama LLM. You can ask me anything — health & neurological screening questions, analysis guidance, research topics, or general chat!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState('checking'); // 'connected', 'error', 'checking'
  const messagesEndRef = useRef(null);

  const quickPrompts = [
    { icon: '🏃', label: 'Explain Gait Analysis', text: 'Can you explain what gait analysis measures in neurological screening?' },
    { icon: '✍️', label: 'Hand Tremor Symptoms', text: 'What are the main indicators of postural vs kinetic hand tremor?' },
    { icon: '🧠', label: 'Cognitive Health Tips', text: 'What daily exercises support cognitive and memory health for elderly patients?' },
    { icon: '🔬', label: 'How Ollama Works', text: 'Tell me about local LLM models and privacy in medical AI applications.' }
  ];

  useEffect(() => {
    fetchOllamaModels();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchOllamaModels = async () => {
    try {
      const res = await fetch('/api/ollama-models');
      if (res.ok) {
        const data = await res.json();
        if (data.models && data.models.length > 0) {
          setAvailableModels(data.models);
          setSelectedModel(data.models[0]);
          setOllamaStatus('connected');
          return;
        }
      }

      const directRes = await fetch('http://localhost:11434/api/tags');
      if (directRes.ok) {
        const directData = await directRes.json();
        const modelNames = (directData.models || []).map(m => m.name);
        if (modelNames.length > 0) {
          setAvailableModels(modelNames);
          setSelectedModel(modelNames[0]);
          setOllamaStatus('connected');
          return;
        }
      }

      setSelectedModel('llama3.2');
      setOllamaStatus('connected');
    } catch {
      setSelectedModel('llama3.2');
      setOllamaStatus('connected');
    }
  };

  const sendMessage = async (userText) => {
    if (!userText.trim() || isLoading) return;

    const userMsgObj = {
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsgObj]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsgObj].map((m) => ({
        role: m.role,
        content: m.content
      }));

      let replyText = '';

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userText,
            messages: history,
            model: selectedModel
          })
        });

        if (response.ok) {
          const resData = await response.json();
          replyText = resData.reply || resData.response;
        }
      } catch (err) {
        console.log('Backend chat proxy failed, trying direct Ollama connection...', err);
      }

      if (!replyText) {
        const directOllamaRes = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: selectedModel || 'llama3.2',
            messages: history,
            stream: false
          })
        });

        if (directOllamaRes.ok) {
          const data = await directOllamaRes.json();
          replyText = data.message?.content || data.response;
        } else {
          const directGenRes = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: selectedModel || 'llama3.2',
              prompt: userText,
              stream: false
            })
          });
          if (directGenRes.ok) {
            const genData = await directGenRes.json();
            replyText = genData.response;
          }
        }
      }

      if (replyText) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setOllamaStatus('connected');
      } else {
        throw new Error('Unable to connect to Ollama.');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Unable to connect to Ollama on http://localhost:11434. Please ensure the Ollama app is running on your laptop (`ollama serve` or Ollama desktop app).',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
      setOllamaStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputMessage);
  };

  const handleClearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Conversation reset. Ask me anything!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div style={styles.chatContainer}>
      
      {/* Sleek Gradient Top Header */}
      <div style={styles.topHeader}>
        <div style={styles.headerLeft}>
          <button onClick={onBack} style={styles.backBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Back to Dashboard</span>
          </button>

          <div style={styles.titleWrapper}>
            <div style={styles.iconGlowBox}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5">
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <div style={styles.mainTitle}>
                NeuroGuard <span style={{ color: '#38BDF8' }}>AI Assistant</span>
              </div>
              <div style={styles.subTitle}>Powered by Local Ollama Engine &bull; Private & Offline</div>
            </div>
          </div>
        </div>

        {/* Model Switcher & Control Buttons */}
        <div style={styles.headerRight}>
          <div style={styles.engineBadge}>
            <div style={ollamaStatus === 'error' ? styles.redPulse : styles.greenPulse}></div>
            <span style={{ color: '#94A3B8', fontWeight: '600' }}>Local Model:</span>
            {availableModels.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                style={styles.modelSelectDropdown}
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <span style={styles.modelPill}>{selectedModel || 'llama3.2'}</span>
            )}
          </div>

          <button onClick={handleClearChat} style={styles.clearChatBtn} title="Clear conversation history">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span>Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Quick Prompts Bar */}
      <div style={styles.promptsBar}>
        <span style={styles.promptsLabel}>⚡ Quick Suggested Topics:</span>
        <div style={styles.promptsGrid}>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => sendMessage(qp.text)}
              style={styles.promptChip}
              disabled={isLoading}
            >
              <span>{qp.icon}</span>
              <span>{qp.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Messages Thread */}
      <div style={styles.messagesScrollArea}>
        {messages.map((msg, index) => (
          <div
            key={index}
            style={msg.role === 'user' ? styles.userRow : styles.assistantRow}
          >
            {msg.role === 'assistant' && (
              <div style={styles.assistantAvatar}>
                🤖
              </div>
            )}

            <div
              style={
                msg.role === 'user'
                  ? styles.userBubble
                  : msg.isError
                  ? styles.errorBubble
                  : styles.assistantBubble
              }
            >
              {msg.role === 'assistant' && !msg.isError && (
                <div style={styles.assistantBubbleHeader}>
                  <span style={styles.modelTagBadge}>
                    ⚡ Ollama AI ({selectedModel || 'llama3.2'})
                  </span>
                </div>
              )}
              
              <div style={styles.messageText}>{msg.content}</div>
              <div style={styles.timestampBadge}>{msg.timestamp}</div>
            </div>

            {msg.role === 'user' && (
              <div style={styles.userAvatar}>
                👤
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div style={styles.assistantRow}>
            <div style={styles.assistantAvatar}>🤖</div>
            <div style={styles.typingCard}>
              <div style={styles.pulseContainer}>
                <div style={styles.pulseDot1}></div>
                <div style={styles.pulseDot2}></div>
                <div style={styles.pulseDot3}></div>
              </div>
              <span style={{ fontSize: '13px', color: '#38BDF8', fontWeight: '600' }}>
                Ollama LLM is generating response...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Floating Input Form */}
      <form onSubmit={handleFormSubmit} style={styles.inputContainer}>
        <div style={styles.inputFieldBox}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2" style={{ marginLeft: '12px' }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <input
            type="text"
            placeholder="Type any message or question for Ollama AI..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            style={styles.textInput}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            style={!inputMessage.trim() || isLoading ? styles.sendBtnDisabled : styles.sendBtnActive}
          >
            <span>Send Message</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>

    </div>
  );
}

const styles = {
  chatContainer: {
    width: '100%',
    maxWidth: '1120px',
    height: 'calc(100vh - 110px)',
    maxHeight: '860px',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderRadius: '24px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.12)',
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  topHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '18px 28px',
    backgroundColor: '#070B12',
    borderBottom: '1px solid rgba(56, 189, 248, 0.15)'
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '12px',
    color: '#38BDF8',
    padding: '9px 16px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  titleWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  iconGlowBox: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)'
  },
  mainTitle: {
    fontSize: '18px',
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: '-0.3px'
  },
  subTitle: {
    fontSize: '12px',
    color: '#94A3B8',
    marginTop: '2px'
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  engineBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: '#0F172A',
    border: '1px solid #1E293B',
    borderRadius: '12px',
    padding: '7px 14px',
    fontSize: '12px'
  },
  greenPulse: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#10B981',
    boxShadow: '0 0 10px #10B981'
  },
  redPulse: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#EF4444',
    boxShadow: '0 0 10px #EF4444'
  },
  modelSelectDropdown: {
    backgroundColor: '#070B12',
    border: '1px solid #38BDF8',
    color: '#38BDF8',
    borderRadius: '8px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '700',
    outline: 'none',
    cursor: 'pointer'
  },
  modelPill: {
    color: '#38BDF8',
    fontWeight: '700',
    fontSize: '12px'
  },
  clearChatBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '10px',
    color: '#FCA5A5',
    padding: '8px 14px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  promptsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 28px',
    backgroundColor: 'rgba(9, 13, 22, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    overflowX: 'auto'
  },
  promptsLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#38BDF8',
    whiteSpace: 'nowrap'
  },
  promptsGrid: {
    display: 'flex',
    gap: '10px',
    overflowX: 'auto'
  },
  promptChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#1E293B',
    border: '1px solid rgba(56, 189, 248, 0.2)',
    borderRadius: '20px',
    color: '#CBD5E1',
    padding: '6px 14px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
  },
  messagesScrollArea: {
    flex: 1,
    padding: '28px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    backgroundColor: '#080C14',
    background: 'radial-gradient(circle at 50% 10%, rgba(56, 189, 248, 0.04) 0%, #080C14 80%)'
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    gap: '12px'
  },
  assistantRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: '12px'
  },
  assistantAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 0 12px rgba(56, 189, 248, 0.2)'
  },
  userAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)'
  },
  userBubble: {
    maxWidth: '68%',
    backgroundColor: '#0284C7',
    background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
    color: '#FFFFFF',
    borderRadius: '18px 18px 4px 18px',
    padding: '16px 20px',
    boxShadow: '0 6px 20px rgba(2, 132, 199, 0.35)',
    wordBreak: 'break-word',
    lineHeight: '1.5',
    fontSize: '14px'
  },
  assistantBubble: {
    maxWidth: '75%',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(56, 189, 248, 0.25)',
    borderLeft: '4px solid #38BDF8',
    color: '#F8FAFC',
    borderRadius: '18px 18px 18px 4px',
    padding: '16px 22px',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
    wordBreak: 'break-word',
    lineHeight: '1.6',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  assistantBubbleHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '2px'
  },
  modelTagBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    padding: '3px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(56, 189, 248, 0.2)'
  },
  errorBubble: {
    maxWidth: '75%',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    color: '#FCA5A5',
    borderRadius: '18px 18px 18px 4px',
    padding: '16px 20px'
  },
  messageText: {
    fontSize: '14px',
    whiteSpace: 'pre-wrap'
  },
  timestampBadge: {
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.4)',
    alignSelf: 'flex-end',
    marginTop: '4px'
  },
  typingCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '16px',
    padding: '14px 22px',
    boxShadow: '0 4px 15px rgba(56, 189, 248, 0.15)'
  },
  pulseContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  pulseDot1: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#38BDF8',
    animation: 'pulse 1s infinite alternate'
  },
  pulseDot2: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#38BDF8',
    animation: 'pulse 1s infinite alternate 0.3s'
  },
  pulseDot3: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#38BDF8',
    animation: 'pulse 1s infinite alternate 0.6s'
  },
  inputContainer: {
    padding: '20px 28px',
    backgroundColor: '#070B12',
    borderTop: '1px solid rgba(56, 189, 248, 0.15)'
  },
  inputFieldBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: '#0F172A',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '16px',
    padding: '6px 8px 6px 4px',
    boxShadow: '0 0 20px rgba(56, 189, 248, 0.1)'
  },
  textInput: {
    flex: 1,
    padding: '12px 14px',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#F8FAFC',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  sendBtnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#0284C7',
    background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(2, 132, 199, 0.45)',
    transition: 'transform 0.1s'
  },
  sendBtnDisabled: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#1E293B',
    color: '#64748B',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'not-allowed'
  }
};
