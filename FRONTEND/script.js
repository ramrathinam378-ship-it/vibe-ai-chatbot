let sessionId = localStorage.getItem("session_id") || "";

const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const clearBtn = document.getElementById("clear-btn");
const typingIndicator = document.getElementById("typing-indicator");
const voiceBtn = document.getElementById("voice-btn");

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight; 
}

function addMessage(text, role) {
  const msg = document.createElement("div");
  msg.classList.add("message", role);
  msg.innerText = text;
  chatBox.appendChild(msg);
  scrollToBottom();
  return msg;
}

function showTyping(show) {
  typingIndicator.hidden = !show;
  scrollToBottom();
}

async function sendMessage(messageText = null) {
  const message = (messageText ?? userInput.value).trim();
  if (!message) return;

  addMessage(message, "user");
  userInput.value = "";
  showTyping(true);

  try {
    const response = await fetch("https://vibe-ai-chatbot.onrender.com/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: message,
        session_id: sessionId || null
      })
    });

    const text = await response.text();
    console.log("status:", response.status);
    console.log("raw response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error("Server did not return JSON");
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    if (data.session_id) {
      sessionId = data.session_id;
      localStorage.setItem("session_id", sessionId);
    }

    addMessage(data.reply || "No reply received.", "bot");
  } catch (error) {
    console.error("FETCH ERROR:", error);
    addMessage("Error connecting to server ❌", "bot");
  } finally {
    showTyping(false);
  }
}

async function clearChat() {
  try {
    await fetch("https://vibe-ai-chatbot.onrender.com/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId })
    });

    chatBox.innerHTML = "";
    sessionId = "";
    localStorage.removeItem("session_id");
  } catch (error) {
    console.error(error);
  }
}

function startVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    addMessage("Voice input is not supported in this browser.", "bot");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    userInput.value = transcript;
    sendMessage(transcript);
  };

  recognition.onerror = function (event) {
    console.error("Speech recognition error:", event.error);
    addMessage("Voice input failed ❌", "bot");
  };

  recognition.onnomatch = function () {
    addMessage("No speech recognized. Please try again.", "bot");
  };

  recognition.start();
}

chatForm.addEventListener("submit", function (e) {
  e.preventDefault();
  sendMessage();
});

clearBtn.addEventListener("click", clearChat);
voiceBtn.addEventListener("click", startVoice);