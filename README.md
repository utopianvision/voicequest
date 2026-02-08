# VoiceQuest: Voice‑Controlled Gamified Learning

## ✨ Overview

VoiceQuest is an accessible, voice‑controlled gamified learning app built for people with physical disabilities. It turns assignments into engaging study quests using assignment metadata, letting users learn and progress hands‑free with interactive voice interactions.

---

## 🚀 Key Features

| Feature             | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| Voice Control       | Capture user speech with the Web Speech API and respond with natural audio using ElevenLabs TTS.      |
| Gamified Quests     | Transform assignment metadata into meaningful, structured study quests with XP, levels, and progress. |
| Persistent Progress | Track user XP, streaks, completed quests, and achievements using SQLite.                              |
| Adaptive Content    | Use **OpenAI’s GPT‑4‑turbo** to interpret voice commands and generate dynamic quest questions.        |

---

## 🧠 Technologies

### Frontend

* **React** – Interactive UI for displaying quests and feedback.
* **TypeScript** – Static typing for safer, scalable code.
* **Web Speech API** – Browser‑native speech‑to‑text input.
* **ElevenLabs TTS** – High‑quality generated voice feedback.

### Backend

* **Python + Flask** – Fast, lightweight server for API endpoints and quest logic.
* **SQLite** – Relational database for storing users, progress, quests, and achievements.
* **OpenAI GPT‑4o‑mini** – Interprets assignment metadata and voice commands and generates adaptive quest content.

---

## ⚙️ Getting Started

### Prerequisites

Make sure you have the following installed:

* Python 3.9+
* Node.js 16+
* npm or yarn

### Installation & Setup

1. **Clone the Repo**

   ```bash
   git clone https://github.com/utopianvision/voicequest.git
   cd voicequest
   ```

2. **Backend Setup (Python + Flask)**

   ```bash
   python3 -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   export OPENAI_API_KEY="YOUR_OPENAI_KEY"
   export ELEVENLABS_API_KEY="YOUR_ELEVENLABS_KEY"
   python init_db.py   # Create SQLite schema
   python app.py
   ```

3. **Frontend Setup (React)**

   ```bash
   cd src
   npm install
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:5173` to start using VoiceQuest.

---

## 🧪 How It Works

* React captures spoken input via the Web Speech API.
* The backend receives voice transcripts and uses **OpenAI GPT‑4‑turbo** to generate tailored quests based on assignment metadata.
* ElevenLabs TTS provides natural audio feedback, and SQLite persists user progress, achievements, and session state.

---

## 📄 Example Usage

1. Speak commands such as “Start a new quest for my math homework.”
2. VoiceQuest generates a quest with adaptive questions.
3. Complete quests hands‑free and earn XP, level up, and unlock achievements.
