import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY", "")
API_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("MODEL", "openrouter/auto:free")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://127.0.0.1:5500",
    "X-Title": "Vibe AI"
}

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "change-me")
CORS(app)

chat_history = []

SYSTEM_PROMPT = {
    "role": "system",
    "content": (
        "You are Vibe AI, a smart, warm, natural assistant. "
        "Talk like a real individual. "
        "If the user asks for code, give code. "
        "If the user just chats, respond naturally and conversationally."
    )
}

def call_openrouter(messages):
    payload = {
        "model": MODEL,
        "messages": messages,
        "temperature": 0.8,
        "max_tokens": 800
    }

    response = requests.post(API_URL, headers=HEADERS, json=payload, timeout=40)
    response.raise_for_status()
    data = response.json()
    return data["choices"][0]["message"]["content"]

@app.route("/")
def home():
    return jsonify({"message": "Vibe AI backend is running"})

@app.route("/chat", methods=["POST"])
def chat():
    global chat_history

    print("chat reached")
    print("content type:", request.content_type)
    print("is json:", request.is_json)
    print("raw data:", request.data)

    try:
        data = request.get_json(silent=True) or {}
        print("parsed:", data)

        user_message = (data.get("message") or "").strip()

        if not user_message:
            return jsonify({"error": "message is required"}), 400

        messages = [SYSTEM_PROMPT] + chat_history + [
            {"role": "user", "content": user_message}
        ]

        reply = call_openrouter(messages)

        chat_history.append({"role": "user", "content": user_message})
        chat_history.append({"role": "assistant", "content": reply})

        if len(chat_history) > 20:
            chat_history = chat_history[-20:]

        return jsonify({"reply": reply})

    except requests.exceptions.RequestException as e:
        print("OpenRouter error:", e)
        return jsonify({"error": "OpenRouter request failed", "details": str(e)}), 502
    except Exception as e:
        print("Server error:", e)
        return jsonify({"error": "Server error", "details": str(e)}), 500

@app.route("/reset", methods=["POST"])
def reset():
    global chat_history
    chat_history = []
    return jsonify({"reply": "Chat cleared 🧹"})

if __name__ == "__main__":
    app.run(debug=True, use_reloader=False)