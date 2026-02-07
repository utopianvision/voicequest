"""
VoiceQuest Flask Backend
========================
Run with: python app.py
Requires: pip install -r requirements.txt
Set environment variables in backend/.env:
  OPENAI_API_KEY=your_openai_key
  ELEVENLABS_API_KEY=your_elevenlabs_key
"""

import os
import json
import uuid
import sqlite3
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from openai import OpenAI
import requests
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app)

# --- Configuration ---
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "iP95p4xoKVk53GoZ742B")
DATABASE = "voicequest.db"

openai_client = OpenAI(api_key=OPENAI_API_KEY)

# --- Database Setup ---
def get_db():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            xp INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            quests_completed INTEGER DEFAULT 0,
            last_active DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS quests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL DEFAULT 'beginner',
            xp_reward INTEGER DEFAULT 50,
            estimated_minutes INTEGER DEFAULT 5,
            icon TEXT DEFAULT '📚',
            system_prompt TEXT NOT NULL,
            num_questions INTEGER DEFAULT 5
        );

        CREATE TABLE IF NOT EXISTS quest_sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            quest_id INTEGER NOT NULL,
            messages TEXT DEFAULT '[]',
            current_question INTEGER DEFAULT 0,
            total_questions INTEGER DEFAULT 5,
            score INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (quest_id) REFERENCES quests(id)
        );

        CREATE TABLE IF NOT EXISTS user_quest_progress (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            quest_id INTEGER NOT NULL,
            completed BOOLEAN DEFAULT 0,
            best_score INTEGER DEFAULT 0,
            attempts INTEGER DEFAULT 0,
            last_attempt TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (quest_id) REFERENCES quests(id),
            UNIQUE(user_id, quest_id)
        );

        CREATE TABLE IF NOT EXISTS achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            icon TEXT NOT NULL,
            category TEXT NOT NULL,
            requirement_type TEXT NOT NULL,
            requirement_value INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_achievements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            achievement_id INTEGER NOT NULL,
            unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (achievement_id) REFERENCES achievements(id),
            UNIQUE(user_id, achievement_id)
        );

        CREATE TABLE IF NOT EXISTS canvas_sessions (
            session_id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            canvas_url TEXT NOT NULL,
            api_key TEXT NOT NULL,
            user_name TEXT,
            canvas_user_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)
    db.commit()

    # Seed quests if empty
    cursor = db.execute("SELECT COUNT(*) as count FROM quests")
    if cursor.fetchone()["count"] == 0:
        seed_quests(db)
        seed_achievements(db)

    db.close()

def seed_quests(db):
    quests = [
        {
            "title": "Solar System Explorer",
            "description": "Journey through our solar system! Answer questions about planets, moons, and cosmic wonders.",
            "topic": "Science",
            "difficulty": "beginner",
            "xp_reward": 50,
            "estimated_minutes": 5,
            "icon": "🪐",
            "system_prompt": "You are a friendly space tutor guiding a student through the solar system. Ask engaging questions about planets, moons, the sun, and space phenomena. Keep questions at a beginner level. After each student response, evaluate if they're correct, give encouraging feedback, and ask the next question. Be enthusiastic and use space metaphors!",
            "num_questions": 5
        },
        {
            "title": "Ancient Civilizations",
            "description": "Travel back in time to explore ancient Egypt, Rome, Greece, and more!",
            "topic": "History",
            "difficulty": "beginner",
            "xp_reward": 50,
            "estimated_minutes": 5,
            "icon": "🏛️",
            "system_prompt": "You are an enthusiastic history tutor taking students on a journey through ancient civilizations. Ask questions about ancient Egypt, Rome, Greece, Mesopotamia, and other ancient cultures. Keep it fun and engaging with storytelling elements. Evaluate answers kindly and provide interesting historical facts.",
            "num_questions": 5
        },
        {
            "title": "Math Wizardry",
            "description": "Cast mathematical spells! Solve puzzles involving arithmetic, patterns, and logic.",
            "topic": "Math",
            "difficulty": "beginner",
            "xp_reward": 60,
            "estimated_minutes": 5,
            "icon": "🧙‍♂️",
            "system_prompt": "You are a magical math wizard tutoring a student. Present math problems as magical puzzles and spells. Cover basic arithmetic, patterns, and simple logic. Make it fun with wizard-themed language. Evaluate answers and provide step-by-step explanations when the student is wrong.",
            "num_questions": 5
        },
        {
            "title": "World Geography Challenge",
            "description": "Explore continents, countries, capitals, and natural wonders around the globe!",
            "topic": "Geography",
            "difficulty": "intermediate",
            "xp_reward": 75,
            "estimated_minutes": 7,
            "icon": "🌍",
            "system_prompt": "You are a world traveler and geography expert. Ask questions about countries, capitals, continents, oceans, mountains, rivers, and natural wonders. Include interesting cultural facts. Questions should be at an intermediate level. Be encouraging and share fun travel anecdotes.",
            "num_questions": 6
        },
        {
            "title": "The Science Lab",
            "description": "Conduct virtual experiments! Learn about chemistry, physics, and biology.",
            "topic": "Science",
            "difficulty": "intermediate",
            "xp_reward": 75,
            "estimated_minutes": 7,
            "icon": "🔬",
            "system_prompt": "You are a quirky science lab instructor. Ask questions about basic chemistry, physics, and biology concepts. Frame questions as experiments or observations. Intermediate difficulty. Explain scientific concepts clearly when giving feedback.",
            "num_questions": 6
        },
        {
            "title": "Literary Legends",
            "description": "Dive into classic literature! Explore famous authors, books, and literary concepts.",
            "topic": "Literature",
            "difficulty": "intermediate",
            "xp_reward": 75,
            "estimated_minutes": 7,
            "icon": "📖",
            "system_prompt": "You are a passionate literature professor. Ask questions about famous books, authors, literary devices, and classic stories. Cover a range of world literature. Be warm and encouraging, sharing interesting anecdotes about authors and their works.",
            "num_questions": 6
        },
        {
            "title": "Advanced Physics Quest",
            "description": "Tackle challenging physics concepts: relativity, quantum mechanics, and thermodynamics!",
            "topic": "Science",
            "difficulty": "advanced",
            "xp_reward": 100,
            "estimated_minutes": 10,
            "icon": "⚛️",
            "system_prompt": "You are a brilliant physics professor. Ask challenging questions about relativity, quantum mechanics, thermodynamics, electromagnetism, and modern physics. Provide detailed explanations. Be encouraging even when answers are wrong — these are hard topics!",
            "num_questions": 7
        },
        {
            "title": "World History Deep Dive",
            "description": "From the Renaissance to the Space Race — test your knowledge of modern history!",
            "topic": "History",
            "difficulty": "advanced",
            "xp_reward": 100,
            "estimated_minutes": 10,
            "icon": "📜",
            "system_prompt": "You are a distinguished history scholar. Ask in-depth questions about world history from the Renaissance through the 20th century. Cover wars, revolutions, cultural movements, and key figures. Provide rich historical context in your feedback.",
            "num_questions": 7
        },
        {
            "title": "Vocabulary Voyage",
            "description": "Expand your vocabulary! Learn new words, their meanings, and how to use them.",
            "topic": "Language",
            "difficulty": "beginner",
            "xp_reward": 50,
            "estimated_minutes": 5,
            "icon": "💬",
            "system_prompt": "You are a friendly vocabulary coach. Present interesting English words and ask the student to define them, use them in sentences, or identify their meanings from context. Start with moderately challenging words. Be encouraging and provide etymology and usage tips.",
            "num_questions": 5
        },
        {
            "title": "Music Theory Basics",
            "description": "Learn about notes, scales, rhythm, and the fundamentals of music!",
            "topic": "Music",
            "difficulty": "beginner",
            "xp_reward": 50,
            "estimated_minutes": 5,
            "icon": "🎵",
            "system_prompt": "You are an enthusiastic music teacher. Ask questions about basic music theory: notes, scales, time signatures, instruments, and famous composers. Keep it fun and accessible. Use musical analogies and encourage the student's curiosity about music.",
            "num_questions": 5
        },
        {
            "title": "Coding Concepts",
            "description": "Explore programming fundamentals through conversational challenges!",
            "topic": "Technology",
            "difficulty": "intermediate",
            "xp_reward": 75,
            "estimated_minutes": 7,
            "icon": "💻",
            "system_prompt": "You are a friendly coding mentor. Ask conceptual questions about programming: variables, loops, functions, data structures, algorithms, and basic computer science concepts. Don't ask them to write code (this is voice-based), but test their understanding of concepts. Be encouraging and use real-world analogies.",
            "num_questions": 6
        },
        {
            "title": "Environmental Science",
            "description": "Learn about ecosystems, climate change, conservation, and our planet!",
            "topic": "Science",
            "difficulty": "intermediate",
            "xp_reward": 75,
            "estimated_minutes": 7,
            "icon": "🌱",
            "system_prompt": "You are a passionate environmental scientist. Ask questions about ecosystems, climate change, biodiversity, conservation, renewable energy, and environmental challenges. Be informative and inspiring, encouraging students to think about sustainability.",
            "num_questions": 6
        },
    ]

    for q in quests:
        db.execute(
            """INSERT INTO quests (title, description, topic, difficulty, xp_reward, estimated_minutes, icon, system_prompt, num_questions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (q["title"], q["description"], q["topic"], q["difficulty"],
             q["xp_reward"], q["estimated_minutes"], q["icon"], q["system_prompt"], q["num_questions"])
        )
    db.commit()

def seed_achievements(db):
    achievements = [
        ("First Steps", "Complete your first quest", "🎯", "quest", "quests_completed", 1),
        ("Quest Warrior", "Complete 5 quests", "⚔️", "quest", "quests_completed", 5),
        ("Quest Master", "Complete 15 quests", "👑", "quest", "quests_completed", 15),
        ("Quest Legend", "Complete 30 quests", "🏆", "quest", "quests_completed", 30),
        ("XP Starter", "Earn 100 XP", "⭐", "xp", "xp", 100),
        ("XP Hunter", "Earn 500 XP", "🌟", "xp", "xp", 500),
        ("XP Champion", "Earn 1500 XP", "💫", "xp", "xp", 1500),
        ("XP Legend", "Earn 5000 XP", "✨", "xp", "xp", 5000),
        ("Consistent Learner", "Reach a 3-day streak", "🔥", "streak", "streak", 3),
        ("Dedicated Student", "Reach a 7-day streak", "🔥", "streak", "streak", 7),
        ("Unstoppable", "Reach a 14-day streak", "🔥", "streak", "streak", 14),
        ("Streak Legend", "Reach a 30-day streak", "🔥", "streak", "streak", 30),
        ("Level Up!", "Reach level 5", "📈", "special", "level", 5),
        ("Rising Star", "Reach level 10", "🌠", "special", "level", 10),
        ("Voice Master", "Reach level 20", "🎙️", "special", "level", 20),
    ]

    for name, desc, icon, category, req_type, req_value in achievements:
        db.execute(
            """INSERT INTO achievements (name, description, icon, category, requirement_type, requirement_value)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (name, desc, icon, category, req_type, req_value)
        )
    db.commit()


# --- Helper Functions ---
def calculate_level(xp):
    """Level up every 100 XP, with increasing requirements."""
    level = 1
    xp_needed = 100
    remaining = xp
    while remaining >= xp_needed:
        remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.2)
    return level

def xp_for_next_level(xp):
    """Calculate XP needed for next level."""
    level = 1
    xp_needed = 100
    remaining = xp
    while remaining >= xp_needed:
        remaining -= xp_needed
        level += 1
        xp_needed = int(xp_needed * 1.2)
    return xp_needed - remaining

def check_and_award_achievements(db, user_id):
    """Check if user has earned any new achievements."""
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user:
        return []

    achievements = db.execute("SELECT * FROM achievements").fetchall()
    newly_unlocked = []

    for ach in achievements:
        # Check if already unlocked
        existing = db.execute(
            "SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?",
            (user_id, ach["id"])
        ).fetchone()
        if existing:
            continue

        # Check requirement
        met = False
        if ach["requirement_type"] == "quests_completed":
            met = user["quests_completed"] >= ach["requirement_value"]
        elif ach["requirement_type"] == "xp":
            met = user["xp"] >= ach["requirement_value"]
        elif ach["requirement_type"] == "streak":
            met = user["streak"] >= ach["requirement_value"]
        elif ach["requirement_type"] == "level":
            met = user["level"] >= ach["requirement_value"]

        if met:
            db.execute(
                "INSERT INTO user_achievements (user_id, achievement_id) VALUES (?, ?)",
                (user_id, ach["id"])
            )
            newly_unlocked.append({"name": ach["name"], "icon": ach["icon"]})

    if newly_unlocked:
        db.commit()

    return newly_unlocked

def update_streak(db, user_id):
    """Update user's daily streak."""
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    today = datetime.now().date().isoformat()
    last_active = user["last_active"]

    if last_active == today:
        return  # Already active today

    yesterday = (datetime.now().date() - timedelta(days=1)).isoformat()

    if last_active == yesterday:
        new_streak = user["streak"] + 1
    else:
        new_streak = 1

    longest = max(user["longest_streak"], new_streak)

    db.execute(
        "UPDATE users SET streak = ?, longest_streak = ?, last_active = ? WHERE id = ?",
        (new_streak, longest, today, user_id)
    )
    db.commit()


# --- Auth Routes ---
@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.json
    username = data.get("username", "").strip().lower()
    display_name = data.get("display_name", "").strip()

    if not username or not display_name:
        return jsonify({"message": "Username and display name are required"}), 400

    db = get_db()
    try:
        db.execute(
            "INSERT INTO users (username, display_name, last_active) VALUES (?, ?, ?)",
            (username, display_name, datetime.now().date().isoformat())
        )
        db.commit()
        user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        return jsonify({"user": dict(user)})
    except sqlite3.IntegrityError:
        return jsonify({"message": "Username already taken"}), 409
    finally:
        db.close()

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username", "").strip().lower()

    db = get_db()
    user = db.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    db.close()

    if not user:
        return jsonify({"message": "User not found. Please register first."}), 404

    return jsonify({"user": dict(user)})


# --- User Routes ---
@app.route("/api/user/<int:user_id>/profile", methods=["GET"])
def get_profile(user_id):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    db.close()

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify({"user": dict(user)})

@app.route("/api/user/<int:user_id>/stats", methods=["GET"])
def get_stats(user_id):
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()

    if not user:
        db.close()
        return jsonify({"message": "User not found"}), 404

    total_quests = db.execute("SELECT COUNT(*) as count FROM quests").fetchone()["count"]
    total_achievements = db.execute("SELECT COUNT(*) as count FROM achievements").fetchone()["count"]
    unlocked_achievements = db.execute(
        "SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?", (user_id,)
    ).fetchone()["count"]

    # Topic progress
    topics = db.execute("""
        SELECT q.topic,
               COUNT(CASE WHEN uqp.completed = 1 THEN 1 END) as completed,
               COUNT(*) as total,
               COALESCE(AVG(CASE WHEN uqp.best_score > 0 THEN uqp.best_score END), 0) as avg_score
        FROM quests q
        LEFT JOIN user_quest_progress uqp ON q.id = uqp.quest_id AND uqp.user_id = ?
        GROUP BY q.topic
    """, (user_id,)).fetchall()

    # Weekly XP (last 7 days) - simplified
    weekly_xp = [0] * 7
    sessions = db.execute("""
        SELECT qs.score, qs.completed_at
        FROM quest_sessions qs
        WHERE qs.user_id = ? AND qs.status = 'completed'
        AND qs.completed_at >= date('now', '-7 days')
        ORDER BY qs.completed_at
    """, (user_id,)).fetchall()

    for session in sessions:
        if session["completed_at"]:
            try:
                completed = datetime.fromisoformat(session["completed_at"])
                days_ago = (datetime.now() - completed).days
                if 0 <= days_ago < 7:
                    weekly_xp[6 - days_ago] += session["score"]
            except (ValueError, TypeError):
                pass

    db.close()

    stats = {
        "xp": user["xp"],
        "level": user["level"],
        "xp_to_next_level": xp_for_next_level(user["xp"]),
        "streak": user["streak"],
        "longest_streak": user["longest_streak"],
        "quests_completed": user["quests_completed"],
        "total_quests": total_quests,
        "achievements_unlocked": unlocked_achievements,
        "total_achievements": total_achievements,
        "weekly_xp": weekly_xp,
        "topics_progress": [
            {
                "topic": t["topic"],
                "quests_completed": t["completed"],
                "total_quests": t["total"],
                "average_score": round(t["avg_score"], 1)
            }
            for t in topics
        ]
    }

    return jsonify({"stats": stats})

@app.route("/api/user/<int:user_id>/achievements", methods=["GET"])
def get_achievements(user_id):
    db = get_db()
    achievements = db.execute("""
        SELECT a.*, ua.unlocked_at
        FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
        ORDER BY a.category, a.requirement_value
    """, (user_id,)).fetchall()
    db.close()

    result = []
    for a in achievements:
        result.append({
            "id": a["id"],
            "name": a["name"],
            "description": a["description"],
            "icon": a["icon"],
            "category": a["category"],
            "unlocked": a["unlocked_at"] is not None,
            "unlocked_at": a["unlocked_at"]
        })

    return jsonify({"achievements": result})


# --- Quest Routes ---
@app.route("/api/quests", methods=["GET"])
def get_quests():
    user_id = request.args.get("user_id", type=int)
    db = get_db()

    if user_id:
        quests = db.execute("""
            SELECT q.*, uqp.completed as is_completed, uqp.best_score
            FROM quests q
            LEFT JOIN user_quest_progress uqp ON q.id = uqp.quest_id AND uqp.user_id = ?
            ORDER BY q.difficulty, q.topic
        """, (user_id,)).fetchall()
    else:
        quests = db.execute("SELECT * FROM quests ORDER BY difficulty, topic").fetchall()

    db.close()

    result = []
    for q in quests:
        quest_dict = dict(q)
        quest_dict.pop("system_prompt", None)
        quest_dict.pop("num_questions", None)
        result.append(quest_dict)

    return jsonify({"quests": result})

@app.route("/api/quests/<int:quest_id>/start", methods=["POST"])
def start_quest(quest_id):
    data = request.json
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"message": "user_id is required"}), 400

    db = get_db()
    quest = db.execute("SELECT * FROM quests WHERE id = ?", (quest_id,)).fetchone()

    if not quest:
        db.close()
        return jsonify({"message": "Quest not found"}), 404

    # Update streak
    update_streak(db, user_id)

    session_id = str(uuid.uuid4())

    # Generate first question using OpenAI
    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": quest["system_prompt"] + f"\n\nThis is a voice-based learning session with {quest['num_questions']} questions. Start by warmly greeting the student and asking the FIRST question. Keep your response concise (2-3 sentences max) since it will be read aloud."},
                {"role": "user", "content": "Start the quest!"}
            ],
            max_tokens=200,
            temperature=0.7
        )
        tutor_message = response.choices[0].message.content
    except Exception as e:
        db.close()
        return jsonify({"message": f"OpenAI API error: {str(e)}"}), 500

    messages = [{"role": "tutor", "content": tutor_message, "timestamp": datetime.now().isoformat()}]

    db.execute(
        """INSERT INTO quest_sessions (session_id, user_id, quest_id, messages, total_questions, status)
           VALUES (?, ?, ?, ?, ?, 'active')""",
        (session_id, user_id, quest_id, json.dumps(messages), quest["num_questions"])
    )

    # Update or create progress record
    existing = db.execute(
        "SELECT id FROM user_quest_progress WHERE user_id = ? AND quest_id = ?",
        (user_id, quest_id)
    ).fetchone()

    if existing:
        db.execute(
            "UPDATE user_quest_progress SET attempts = attempts + 1, last_attempt = ? WHERE id = ?",
            (datetime.now().isoformat(), existing["id"])
        )
    else:
        db.execute(
            "INSERT INTO user_quest_progress (user_id, quest_id, attempts, last_attempt) VALUES (?, ?, 1, ?)",
            (user_id, quest_id, datetime.now().isoformat())
        )

    db.commit()
    db.close()

    return jsonify({
        "session": {
            "session_id": session_id,
            "quest_id": quest_id,
            "messages": messages,
            "current_question": 1,
            "total_questions": quest["num_questions"],
            "score": 0,
            "status": "active"
        }
    })

@app.route("/api/quests/session/<session_id>/respond", methods=["POST"])
def respond_to_quest(session_id):
    data = request.json
    user_message = data.get("message", "")

    if not user_message:
        return jsonify({"message": "Message is required"}), 400

    db = get_db()
    session = db.execute("SELECT * FROM quest_sessions WHERE session_id = ?", (session_id,)).fetchone()

    if not session:
        db.close()
        return jsonify({"message": "Session not found"}), 404

    if session["status"] != "active":
        db.close()
        return jsonify({"message": "Session already completed"}), 400

    quest = db.execute("SELECT * FROM quests WHERE id = ?", (session["quest_id"],)).fetchone()
    messages = json.loads(session["messages"])
    current_q = session["current_question"] + 1
    total_q = session["total_questions"]
    is_last = current_q >= total_q

    # Add user message
    messages.append({
        "role": "user",
        "content": user_message,
        "timestamp": datetime.now().isoformat()
    })

    # Build conversation for OpenAI
    openai_messages = [
        {"role": "system", "content": quest["system_prompt"] + f"""

This is question {current_q} of {total_q} in a voice-based learning session.

IMPORTANT INSTRUCTIONS:
1. First, evaluate the student's answer. Respond with a JSON block followed by your spoken response.
2. Format: {{"is_correct": true/false, "score_delta": 0-20}}
3. Then on a new line, write your spoken response (2-3 sentences max).
4. If this is the last question (question {total_q} of {total_q}), wrap up warmly and congratulate them.
5. If not the last question, give brief feedback and ask the next question.
6. Keep responses concise since they'll be read aloud."""}
    ]

    for msg in messages:
        role = "assistant" if msg["role"] == "tutor" else "user"
        openai_messages.append({"role": role, "content": msg["content"]})

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            max_tokens=300,
            temperature=0.7
        )
        raw_response = response.choices[0].message.content
    except Exception as e:
        db.close()
        return jsonify({"message": f"OpenAI API error: {str(e)}"}), 500

    # Parse response
    is_correct = False
    score_delta = 0
    tutor_message = raw_response

    try:
        # Try to extract JSON from response
        if "{" in raw_response and "}" in raw_response:
            json_start = raw_response.index("{")
            json_end = raw_response.index("}") + 1
            json_str = raw_response[json_start:json_end]
            parsed = json.loads(json_str)
            is_correct = parsed.get("is_correct", False)
            score_delta = min(parsed.get("score_delta", 0), 20)
            tutor_message = raw_response[json_end:].strip()
            if not tutor_message:
                tutor_message = "Great effort! Let's continue."
    except (json.JSONDecodeError, ValueError):
        score_delta = 10  # Default partial credit

    new_score = session["score"] + score_delta

    # Add tutor response to messages
    messages.append({
        "role": "tutor",
        "content": tutor_message,
        "timestamp": datetime.now().isoformat(),
        "is_correct": is_correct,
        "feedback": tutor_message
    })

    quest_complete = is_last
    xp_earned = 0

    if quest_complete:
        status = "completed"
        # Calculate XP: base reward scaled by score
        max_score = total_q * 20
        score_ratio = new_score / max_score if max_score > 0 else 0
        xp_earned = int(quest["xp_reward"] * max(0.3, score_ratio))  # Min 30% XP

        # Update user
        user = db.execute("SELECT * FROM users WHERE id = ?", (session["user_id"],)).fetchone()
        new_xp = user["xp"] + xp_earned
        new_level = calculate_level(new_xp)

        db.execute(
            "UPDATE users SET xp = ?, level = ?, quests_completed = quests_completed + 1 WHERE id = ?",
            (new_xp, new_level, session["user_id"])
        )

        # Update quest progress
        db.execute("""
            UPDATE user_quest_progress
            SET completed = 1, best_score = MAX(best_score, ?)
            WHERE user_id = ? AND quest_id = ?
        """, (new_score, session["user_id"], session["quest_id"]))

        # Check achievements
        db.commit()
        check_and_award_achievements(db, session["user_id"])
    else:
        status = "active"

    # Update session
    db.execute("""
        UPDATE quest_sessions
        SET messages = ?, current_question = ?, score = ?, status = ?,
            completed_at = CASE WHEN ? = 'completed' THEN ? ELSE completed_at END
        WHERE session_id = ?
    """, (json.dumps(messages), current_q, new_score, status,
          status, datetime.now().isoformat() if quest_complete else None, session_id))

    db.commit()
    db.close()

    return jsonify({
        "tutor_message": tutor_message,
        "is_correct": is_correct,
        "feedback": tutor_message,
        "score_delta": score_delta,
        "current_question": current_q,
        "total_questions": total_q,
        "quest_complete": quest_complete,
        "xp_earned": xp_earned if quest_complete else 0
    })


# --- Jarvis Chat Sessions (in-memory) ---
jarvis_sessions = {}

JARVIS_SYSTEM_PROMPT = """You are Jarvis, a friendly and intelligent voice assistant for VoiceQuest — a voice-powered learning adventure app.

You respond to users via voice, so keep ALL responses concise (1-2 sentences max, since they'll be read aloud via TTS).

IMPORTANT: You MUST respond with ONLY a valid JSON object. No other text before or after.

Response format:
{
  "intent": "login" | "navigate" | "start_quest" | "create_quest" | "filter" | "help" | "chat" | "greeting" | "logout",
  "target": "<value depends on intent>",
  "message": "<your spoken response — concise, friendly, 1-2 sentences>"
}

Intent rules:
- "greeting": User is just saying hello or greeting you. target = "". Respond warmly.
- "login": User tells you their name (e.g. "my name is Pratham", "I'm John", "call me Alex"). target = the extracted name (just the name, cleaned up). message = a warm welcome.
- "navigate": User wants to go to a page. target = route path. Available pages:
  * /dashboard — home/dashboard
  * /quests — quest map, find quests, browse quests
  * /profile — user profile, stats, achievements, progress
  * /settings — settings, preferences
- "start_quest": User wants to start a SPECIFIC EXISTING quest from the available list. target = quest ID (number).
- "create_quest": User wants to study a SPECIFIC TOPIC that doesn't match an existing quest, or wants a personalized/custom study session. target = the topic description (e.g. "Calculus AB integrals", "AP US History chapter 5", "Spanish vocabulary for travel"). This creates a brand new quest tailored to their needs.
  * Use this when the user says things like: "help me study for...", "quiz me on...", "I have a test on...", "practice ... problems", "prep for my ... exam"
  * The target should be a clear, specific description of what they want to study
- "filter": User wants to filter quests by topic. target = topic name lowercase.
- "help": User asks what they can do. target = "help". Mention they can ask you to create custom study sessions.
- "chat": General conversation that doesn't match other intents. target = "". Just respond conversationally.
- "logout": User wants to log out or sign out. target = "/".

CRITICAL DISTINCTION between start_quest and create_quest:
- If the user asks for something that matches an available quest by name/topic → use "start_quest" with the quest ID
- If the user asks for something SPECIFIC that no existing quest covers (e.g. "Calculus AB integrals", "AP Chemistry unit 3") → use "create_quest" with a detailed topic description
- When in doubt about whether an existing quest matches, prefer "create_quest" for better personalization

Context awareness:
- If the user hasn't logged in yet (you'll be told), prioritize detecting their name from natural speech.
- "Hello Jarvis, my name is Pratham" → login intent with target "Pratham"
- "Jarvis, help me prep for my Calculus AB test on integrals" → create_quest with target "Calculus AB integrals"
- "Jarvis, quiz me on the French Revolution" → create_quest with target "French Revolution history"
- "Jarvis, start quest one" → start_quest with the quest at position 1
- Be generous in interpretation. Natural speech should work.
- The wake word "Jarvis" may or may not be present in the transcript — process the command regardless.
"""


@app.route("/api/jarvis/chat", methods=["POST"])
def jarvis_chat():
    """Persistent chat endpoint for Jarvis AI assistant."""
    data = request.json
    session_id = data.get("session_id", "")
    message = data.get("message", "").strip()
    context = data.get("context", {})

    if not message:
        return jsonify({"message": "Message is required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"message": "OpenAI API key not configured"}), 500

    # Build context string
    current_page = context.get("current_page", "/")
    user_logged_in = context.get("user_logged_in", False)
    user_name = context.get("user_name", "")
    available_quests = context.get("available_quests", [])
    canvas_data = context.get("canvas_data", {})

    context_parts = [f"Current page: {current_page}"]
    if user_logged_in:
        context_parts.append(f"User is logged in as: {user_name}")
    else:
        context_parts.append("User is NOT logged in yet. If they tell you their name, use the 'login' intent.")

    if available_quests:
        quest_list = "\n".join([
            f"  #{i+1} — ID: {q['id']}, Title: \"{q['title']}\", Topic: {q['topic']}"
            for i, q in enumerate(available_quests)
        ])
        context_parts.append(f"Available quests:\n{quest_list}")

    # Add Canvas LMS context if available
    if canvas_data:
        canvas_courses = canvas_data.get("courses", [])
        canvas_assignments = canvas_data.get("assignments", [])
        if canvas_courses:
            course_list = "\n".join([
                f"  - {c.get('name', 'Unknown')} (ID: {c.get('id')})"
                for c in canvas_courses
            ])
            context_parts.append(f"Canvas LMS courses (user's real school courses):\n{course_list}")
        if canvas_assignments:
            assignment_list = "\n".join([
                f"  - \"{a.get('name', 'Untitled')}\" (Course: {a.get('course_name', 'Unknown')}, Due: {a.get('due_at', 'No due date')})"
                for a in canvas_assignments[:15]  # Limit to 15 to avoid token overflow
            ])
            context_parts.append(f"Canvas LMS assignments (user's real school assignments):\n{assignment_list}")
            context_parts.append("IMPORTANT: When the user asks about their assignments or wants to study for a class, use the Canvas data above. Create quests based on their ACTUAL assignment topics, not generic ones.")

    context_message = "\n".join(context_parts)

    # Get or create session
    if session_id not in jarvis_sessions:
        jarvis_sessions[session_id] = []

    history = jarvis_sessions[session_id]

    # Build messages for OpenAI
    openai_messages = [
        {"role": "system", "content": JARVIS_SYSTEM_PROMPT + f"\n\nCurrent context:\n{context_message}"}
    ]

    # Add conversation history (keep last 20 messages to avoid token limits)
    for msg in history[-20:]:
        openai_messages.append(msg)

    # Add new user message
    openai_messages.append({"role": "user", "content": message})

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=openai_messages,
            max_tokens=200,
            temperature=0.3
        )
        raw = response.choices[0].message.content.strip()

        # Store in history
        history.append({"role": "user", "content": message})
        history.append({"role": "assistant", "content": raw})
        jarvis_sessions[session_id] = history

        # Parse JSON
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract JSON
            try:
                json_start = raw.index("{")
                json_end = raw.rindex("}") + 1
                parsed = json.loads(raw[json_start:json_end])
            except (ValueError, json.JSONDecodeError):
                parsed = {
                    "intent": "chat",
                    "target": "",
                    "message": raw if len(raw) < 200 else "I didn't quite understand that. Try saying something like 'go to my profile' or 'start a quest'."
                }

        return jsonify(parsed)

    except Exception as e:
        return jsonify({"message": f"Jarvis error: {str(e)}"}), 500


@app.route("/api/jarvis/reset", methods=["POST"])
def jarvis_reset():
    """Reset a Jarvis chat session."""
    data = request.json
    session_id = data.get("session_id", "")
    if session_id in jarvis_sessions:
        del jarvis_sessions[session_id]
    return jsonify({"status": "ok"})


# --- Voice Command AI Route ---
@app.route("/api/voice/command", methods=["POST"])
def voice_command():
    """Use OpenAI to interpret a voice command and return a structured action."""
    data = request.json
    transcript = data.get("transcript", "").strip()
    current_page = data.get("current_page", "/dashboard")
    available_quests = data.get("available_quests", [])

    if not transcript:
        return jsonify({"message": "Transcript is required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"message": "OpenAI API key not configured"}), 500

    # Build quest context for the AI
    quest_list = ""
    if available_quests:
        quest_list = "\n".join([
            f"  - ID: {q['id']}, Title: \"{q['title']}\", Topic: {q['topic']}"
            for q in available_quests
        ])

    system_prompt = f"""You are a voice command interpreter for VoiceQuest, a voice-powered learning app.
The user is currently on: {current_page}

Available pages: /dashboard (home), /quests (quest map), /profile (user stats), /settings (preferences)

{"Available quests:" + chr(10) + quest_list if quest_list else "No quest context available."}

Given the user's spoken command, determine their intent and respond with ONLY a JSON object (no other text):

{{
  "intent": "navigate" | "start_quest" | "filter" | "help" | "unknown",
  "target": "<route path like /dashboard, or quest ID as number, or topic name for filter>",
  "message": "<friendly 1-sentence response to speak back to the user>",
  "confidence": <0.0 to 1.0>
}}

Rules:
- "navigate": user wants to go to a page. target = route path (e.g. "/quests", "/profile")
- "start_quest": user wants to start a specific quest. target = quest ID (number). Match by name, topic, or description.
- "filter": user wants to filter quests by topic. target = topic name lowercase (e.g. "science", "history", "math", "all")
- "help": user is asking what they can do. target = "help"
- "unknown": you can't determine intent. message should suggest what they can say.
- If user says a number like "one" or "first", and quests are available, treat it as start_quest with the quest at that position (1-indexed).
- Be generous in interpretation. "I want to learn about space" → start the Solar System quest. "Take me home" → navigate to /dashboard.
- Keep messages concise (will be read aloud via TTS)."""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": transcript}
            ],
            max_tokens=150,
            temperature=0.3
        )
        raw = response.choices[0].message.content.strip()

        # Parse JSON from response
        parsed = json.loads(raw)
        return jsonify(parsed)

    except json.JSONDecodeError:
        # Try to extract JSON if there's extra text
        try:
            json_start = raw.index("{")
            json_end = raw.rindex("}") + 1
            parsed = json.loads(raw[json_start:json_end])
            return jsonify(parsed)
        except (ValueError, json.JSONDecodeError):
            return jsonify({
                "intent": "unknown",
                "target": "",
                "message": "I didn't quite catch that. Try saying something like 'start a quest' or 'go to profile'.",
                "confidence": 0
            })
    except Exception as e:
        return jsonify({"message": f"AI command error: {str(e)}"}), 500


# --- TTS Route ---
@app.route("/api/tts", methods=["POST"])
def text_to_speech():
    data = request.json
    text = data.get("text", "")
    voice_id = data.get("voice_id", ELEVENLABS_VOICE_ID)

    if not text:
        return jsonify({"message": "Text is required"}), 400

    if not ELEVENLABS_API_KEY:
        return jsonify({"message": "ElevenLabs API key not configured"}), 500

    try:
        # ElevenLabs API requires the API key in the header as xi-api-key
        # No username or additional credentials needed - just the API key
        response = requests.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": ELEVENLABS_API_KEY
            },
            json={
                "text": text,
                "model_id": "eleven_turbo_v2_5",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.75
                }
            },
            timeout=15  # Add timeout to prevent hanging
        )
        
        # Log response for debugging
        if response.status_code != 200:
            error_msg = response.text[:200] if response.text else "Unknown error"
            app.logger.error(f"ElevenLabs API error: Status {response.status_code}, Response: {error_msg}")
            return jsonify({"message": f"ElevenLabs API error: {error_msg}"}), 500


        if not response.content:
            return jsonify({"message": "Empty audio response from ElevenLabs"}), 500

        return Response(
            response.content,
            mimetype="audio/mpeg",
            headers={"Content-Type": "audio/mpeg"}
        )
    except requests.exceptions.Timeout:
        return jsonify({"message": "TTS request timed out. Check your internet connection."}), 500
    except requests.exceptions.ConnectionError:
        return jsonify({"message": "Cannot connect to ElevenLabs API. Check your internet connection."}), 500
    except Exception as e:
        return jsonify({"message": f"TTS error: {str(e)}"}), 500


# --- Health Check ---
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "openai_configured": bool(OPENAI_API_KEY),
        "elevenlabs_configured": bool(ELEVENLABS_API_KEY)
    })


# --- Custom Quest Creation ---
@app.route("/api/quests/custom", methods=["POST"])
def create_custom_quest():
    """Create a personalized quest based on the student's request."""
    data = request.json
    user_id = data.get("user_id")
    topic = data.get("topic", "").strip()
    num_questions = data.get("num_questions", 5)
    canvas_assignments = data.get("canvas_assignments", [])

    if not user_id or not topic:
        return jsonify({"message": "user_id and topic are required"}), 400

    if not OPENAI_API_KEY:
        return jsonify({"message": "OpenAI API key not configured"}), 500

    # Build context for quest generation
    context_parts = [f"Student wants to study: {topic}"]
    
    # Add Canvas assignment context if available
    if canvas_assignments:
        # Find matching assignments
        matching_assignments = []
        topic_lower = topic.lower()
        for assignment in canvas_assignments:
            assignment_name = assignment.get("name", "").lower()
            course_name = assignment.get("course_name", "").lower()
            description = assignment.get("description", "").lower()
            # Check if assignment matches the topic
            if (topic_lower in assignment_name or 
                topic_lower in course_name or 
                topic_lower in description or
                any(keyword in assignment_name for keyword in topic_lower.split() if len(keyword) > 3)):
                matching_assignments.append(assignment)
        
        if matching_assignments:
            assignment_info = "\n".join([
                f"  - \"{a.get('name', 'Untitled')}\" (Course: {a.get('course_name', 'Unknown')}, Due: {a.get('due_at', 'No due date')})"
                for a in matching_assignments[:3]  # Limit to 3 most relevant
            ])
            context_parts.append(f"\nRelevant Canvas assignments:\n{assignment_info}")
            context_parts.append("\nIMPORTANT: Create questions SPECIFICALLY based on these actual assignments. Use the assignment names, course context, and descriptions to generate targeted questions. Do NOT create generic questions - make them relevant to the specific assignments listed above.")

    context_message = "\n".join(context_parts)

    # Generate quest metadata using AI
    try:
        meta_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": """Generate quest metadata for a voice-based learning app. Respond with ONLY a JSON object:
{
  "title": "<short catchy title, 3-5 words>",
  "description": "<1 sentence describing what the student will practice>",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "icon": "<single emoji that fits the topic>",
  "topic_category": "<one of: Science, Math, History, Literature, Geography, Technology, Language, Music, or the most fitting category>"
}"""},
                {"role": "user", "content": f"Create a quest about: {topic}\n\n{context_message}"}
            ],
            max_tokens=150,
            temperature=0.5
        )
        meta_raw = meta_response.choices[0].message.content.strip()
        try:
            meta = json.loads(meta_raw)
        except json.JSONDecodeError:
            json_start = meta_raw.index("{")
            json_end = meta_raw.rindex("}") + 1
            meta = json.loads(meta_raw[json_start:json_end])
    except Exception as e:
        return jsonify({"message": f"Failed to generate quest: {str(e)}"}), 500

    # Build a direct, no-nonsense system prompt for the tutor
    assignment_context = ""
    if canvas_assignments:
        matching_assignments = []
        topic_lower = topic.lower()
        for assignment in canvas_assignments:
            assignment_name = assignment.get("name", "").lower()
            course_name = assignment.get("course_name", "").lower()
            description = assignment.get("description", "").lower()
            if (topic_lower in assignment_name or 
                topic_lower in course_name or 
                topic_lower in description or
                any(keyword in assignment_name for keyword in topic_lower.split() if len(keyword) > 3)):
                matching_assignments.append(assignment)
        
        if matching_assignments:
            assignment_details = "\n".join([
                f"Assignment: \"{a.get('name', 'Untitled')}\" from {a.get('course_name', 'Unknown')}. Description: {a.get('description', 'No description')[:300]}"
                for a in matching_assignments[:2]
            ])
            assignment_context = f"\n\nSTUDENT'S ACTUAL ASSIGNMENTS:\n{assignment_details}\n\nCRITICAL: Generate questions that directly relate to these specific assignments. Reference specific concepts, topics, or requirements from the assignments above. Do NOT create generic questions - make them specific to what the student actually needs to study for these assignments."
    
    system_prompt = f"""You are a knowledgeable and encouraging tutor helping a student study: {topic}.{assignment_context}

IMPORTANT RULES:
- Ask clear, direct questions about {topic}. No gimmicks, no role-playing, no word problems disguised as stories.
- Questions should be appropriate for the difficulty level and directly test knowledge of {topic}.
- If assignment context is provided above, create questions SPECIFICALLY tailored to those assignments.
- After each student response, evaluate if they're correct, give a brief explanation, and ask the next question.
- Keep responses concise (2-3 sentences max) since they'll be read aloud.
- Be encouraging but honest. If the answer is wrong, explain the correct answer clearly.
- Vary question types: definitions, problem-solving, conceptual understanding, applications."""

    difficulty = meta.get("difficulty", "intermediate")
    xp_map = {"beginner": 50, "intermediate": 75, "advanced": 100}
    xp_reward = xp_map.get(difficulty, 75)
    time_map = {"beginner": 5, "intermediate": 7, "advanced": 10}
    est_minutes = time_map.get(difficulty, 7)

    db = get_db()
    try:
        db.execute(
            """INSERT INTO quests (title, description, topic, difficulty, xp_reward, estimated_minutes, icon, system_prompt, num_questions)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (meta.get("title", topic[:30]),
             meta.get("description", f"Practice questions about {topic}"),
             meta.get("topic_category", "General"),
             difficulty, xp_reward, est_minutes,
             meta.get("icon", "📝"),
             system_prompt, num_questions)
        )
        db.commit()
        quest_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]

        # Now start a session immediately
        update_streak(db, user_id)
        session_id = str(uuid.uuid4())

        # Generate first question
        first_response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt + f"\n\nThis is a voice-based learning session with {num_questions} questions about {topic}. Start by briefly greeting the student and asking the FIRST question. Keep it concise (2-3 sentences max)."},
                {"role": "user", "content": "Start the quest!"}
            ],
            max_tokens=200,
            temperature=0.7
        )
        tutor_message = first_response.choices[0].message.content

        messages = [{"role": "tutor", "content": tutor_message, "timestamp": datetime.now().isoformat()}]

        db.execute(
            """INSERT INTO quest_sessions (session_id, user_id, quest_id, messages, total_questions, status)
               VALUES (?, ?, ?, ?, ?, 'active')""",
            (session_id, user_id, quest_id, json.dumps(messages), num_questions)
        )

        # Create progress record
        db.execute(
            "INSERT INTO user_quest_progress (user_id, quest_id, attempts, last_attempt) VALUES (?, ?, 1, ?)",
            (user_id, quest_id, datetime.now().isoformat())
        )
        db.commit()

        return jsonify({
            "quest": {
                "id": quest_id,
                "title": meta.get("title", topic[:30]),
                "description": meta.get("description", f"Practice questions about {topic}"),
                "topic": meta.get("topic_category", "General"),
                "difficulty": difficulty,
                "xp_reward": xp_reward,
                "estimated_minutes": est_minutes,
                "icon": meta.get("icon", "📝"),
            },
            "session": {
                "session_id": session_id,
                "quest_id": quest_id,
                "messages": messages,
                "current_question": 1,
                "total_questions": num_questions,
                "score": 0,
                "status": "active"
            }
        })
    except Exception as e:
        db.close()
        return jsonify({"message": f"Failed to create quest: {str(e)}"}), 500
    finally:
        db.close()


# --- Canvas LMS Integration ---
# In-memory cache for active sessions (also stored in DB)
canvas_sessions = {}

def get_canvas_session_from_db(session_id):
    """Get Canvas session from database."""
    db = get_db()
    try:
        row = db.execute(
            "SELECT * FROM canvas_sessions WHERE session_id = ?",
            (session_id,)
        ).fetchone()
        if row:
            return {
                "canvas_url": row["canvas_url"],
                "api_key": row["api_key"],
                "user_name": row["user_name"],
                "user_id": row["canvas_user_id"],
            }
    finally:
        db.close()
    return None

@app.route("/api/canvas/connect", methods=["POST"])
def canvas_connect():
    """Connect to Canvas LMS and validate credentials."""
    data = request.json
    canvas_url = data.get("canvas_url", "").strip().rstrip("/")
    api_key = data.get("api_key", "").strip()
    user_id = data.get("user_id")

    if not canvas_url or not api_key:
        return jsonify({"message": "Canvas URL and API key are required"}), 400

    try:
        # Validate by fetching user profile from Canvas API
        headers = {"Authorization": f"Bearer {api_key}"}
        resp = requests.get(f"{canvas_url}/api/v1/users/self/profile", headers=headers, timeout=10)

        if resp.status_code != 200:
            return jsonify({"message": "Invalid Canvas URL or API key"}), 401

        profile = resp.json()
        session_id = f"canvas_{uuid.uuid4().hex[:12]}"
        session_data = {
            "canvas_url": canvas_url,
            "api_key": api_key,
            "user_name": profile.get("name", "Student"),
            "user_id": profile.get("id"),
        }
        
        # Store in memory
        canvas_sessions[session_id] = session_data
        
        # Store in database if user_id provided
        if user_id:
            db = get_db()
            try:
                db.execute(
                    """INSERT OR REPLACE INTO canvas_sessions 
                       (session_id, user_id, canvas_url, api_key, user_name, canvas_user_id)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (session_id, user_id, canvas_url, api_key, 
                     profile.get("name", "Student"), profile.get("id"))
                )
                db.commit()
            finally:
                db.close()

        return jsonify({
            "success": True,
            "session_id": session_id,
            "user_name": profile.get("name", "Student"),
            "avatar_url": profile.get("avatar_url", ""),
        })
    except requests.exceptions.ConnectionError:
        return jsonify({"message": f"Cannot connect to {canvas_url}. Check the URL."}), 400
    except Exception as e:
        return jsonify({"message": f"Canvas connection error: {str(e)}"}), 500


@app.route("/api/canvas/courses", methods=["GET"])
def canvas_courses():
    """Fetch courses from Canvas."""
    session_id = request.args.get("session_id", "")
    
    # Try memory first, then database
    if session_id not in canvas_sessions:
        sess = get_canvas_session_from_db(session_id)
        if sess:
            canvas_sessions[session_id] = sess  # Cache in memory
        else:
            return jsonify({"message": "Canvas not connected"}), 401
    else:
        sess = canvas_sessions[session_id]
    headers = {"Authorization": f"Bearer {sess['api_key']}"}

    try:
        resp = requests.get(
            f"{sess['canvas_url']}/api/v1/courses",
            headers=headers,
            params={"enrollment_state": "active", "per_page": 50},
            timeout=10
        )
        if resp.status_code != 200:
            return jsonify({"message": "Failed to fetch courses"}), 500

        courses = []
        for c in resp.json():
            if isinstance(c, dict) and "name" in c:
                courses.append({
                    "id": c["id"],
                    "name": c["name"],
                    "code": c.get("course_code", ""),
                })
        return jsonify({"courses": courses})
    except Exception as e:
        return jsonify({"message": f"Error fetching courses: {str(e)}"}), 500


@app.route("/api/canvas/assignments", methods=["GET"])
def canvas_assignments():
    """Fetch upcoming assignments from Canvas."""
    session_id = request.args.get("session_id", "")
    course_id = request.args.get("course_id", "")

    # Try memory first, then database
    if session_id not in canvas_sessions:
        sess = get_canvas_session_from_db(session_id)
        if sess:
            canvas_sessions[session_id] = sess  # Cache in memory
        else:
            return jsonify({"message": "Canvas not connected"}), 401
    else:
        sess = canvas_sessions[session_id]
    headers = {"Authorization": f"Bearer {sess['api_key']}"}

    try:
        assignments = []

        if course_id:
            # Fetch assignments for a specific course
            url = f"{sess['canvas_url']}/api/v1/courses/{course_id}/assignments"
            params = {"per_page": 20, "order_by": "due_at"}
            resp = requests.get(url, headers=headers, params=params, timeout=10)
            if resp.status_code == 200:
                for a in resp.json():
                    if isinstance(a, dict):
                        assignments.append({
                            "id": a.get("id"),
                            "name": a.get("name", a.get("title", "Untitled")),
                            "due_at": a.get("due_at"),
                            "course_id": a.get("course_id"),
                            "description": (a.get("description") or "")[:500],  # Increased to 500 chars for better context
                        })
        else:
            # Fetch assignments from ALL active courses
            courses_resp = requests.get(
                f"{sess['canvas_url']}/api/v1/courses",
                headers=headers,
                params={"enrollment_state": "active", "per_page": 50},
                timeout=10
            )
            if courses_resp.status_code == 200:
                courses = courses_resp.json()
                for course in courses:
                    if not isinstance(course, dict) or "id" not in course:
                        continue
                    cid = course["id"]
                    cname = course.get("name", "Unknown Course")
                    try:
                        a_resp = requests.get(
                            f"{sess['canvas_url']}/api/v1/courses/{cid}/assignments",
                            headers=headers,
                            params={"per_page": 10, "order_by": "due_at"},
                            timeout=10
                        )
                        if a_resp.status_code == 200:
                            for a in a_resp.json():
                                if isinstance(a, dict):
                                    assignments.append({
                                        "id": a.get("id"),
                                        "name": a.get("name", a.get("title", "Untitled")),
                                        "due_at": a.get("due_at"),
                                        "course_id": cid,
                                        "course_name": cname,
                                        "description": (a.get("description") or "")[:500],  # Increased to 500 chars for better context
                                    })
                    except Exception:
                        continue  # Skip courses that fail

        return jsonify({"assignments": assignments})
    except Exception as e:
        return jsonify({"message": f"Error fetching assignments: {str(e)}"}), 500


@app.route("/api/canvas/disconnect", methods=["POST"])
def canvas_disconnect():
    """Disconnect Canvas session."""
    data = request.json
    session_id = data.get("session_id", "")
    if session_id in canvas_sessions:
        del canvas_sessions[session_id]
    # Also remove from database
    db = get_db()
    try:
        db.execute("DELETE FROM canvas_sessions WHERE session_id = ?", (session_id,))
        db.commit()
    finally:
        db.close()
    return jsonify({"status": "ok"})

@app.route("/api/canvas/session/<session_id>", methods=["GET"])
def get_canvas_session(session_id):
    """Get Canvas session info (for validation)."""
    # Try memory first, then database
    if session_id in canvas_sessions:
        sess = canvas_sessions[session_id]
        return jsonify({
            "session_id": session_id,
            "user_name": sess.get("user_name", "Student"),
            "exists": True
        })
    
    sess = get_canvas_session_from_db(session_id)
    if sess:
        canvas_sessions[session_id] = sess  # Cache in memory
        return jsonify({
            "session_id": session_id,
            "user_name": sess.get("user_name", "Student"),
            "exists": True
        })
    
    return jsonify({"exists": False}), 404


if __name__ == "__main__":
    init_db()
    print("🎮 VoiceQuest Backend Starting...")
    print(f"   OpenAI API Key: {'✅ Configured' if OPENAI_API_KEY else '❌ Missing (set OPENAI_API_KEY)'}")
    print(f"   ElevenLabs Key: {'✅ Configured' if ELEVENLABS_API_KEY else '❌ Missing (set ELEVENLABS_API_KEY)'}")
    print(f"   Database: {DATABASE}")

    # Check for SSL certificates
    import os.path
    import threading

    cert_file = os.path.join(os.path.dirname(__file__), 'cert.pem')
    key_file = os.path.join(os.path.dirname(__file__), 'key.pem')

    if os.path.exists(cert_file) and os.path.exists(key_file):
        print("   SSL: ✅ Found (cert.pem + key.pem)")
        print("   HTTPS: https://localhost:5000")
        print("   HTTP:  http://localhost:5001 (fallback)")
        print()

        # Run HTTP on port 5001 in a background thread as fallback
        def run_http():
            # Create a second app instance for HTTP
            from werkzeug.serving import make_server
            http_server = make_server('127.0.0.1', 5001, app)
            http_server.serve_forever()

        http_thread = threading.Thread(target=run_http, daemon=True)
        http_thread.start()

        # Run HTTPS on port 5000 (main)
        app.run(debug=True, port=5000, ssl_context=(cert_file, key_file), use_reloader=False)
    else:
        print("   SSL: ⚠️  No certificates — HTTP only")
        print("   Server: http://localhost:5000")
        print("   To enable HTTPS: openssl req -x509 -newkey rsa:4096 -nodes -out backend/cert.pem -keyout backend/key.pem -days 365 -subj '/CN=localhost'")
        app.run(debug=True, port=5000)