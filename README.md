# Recall — AI Study Assistant

Recall is an AI-powered study assistant designed to help students learn more effectively from their own study materials.

The project is being built step by step, starting with the core application architecture and gradually adding AI-powered features such as flashcard generation, quizzes, RAG, and personalized learning.

## 🚀 Current Status

**Phase 2 — Database & Architecture**

Currently implemented:

* Next.js project setup
* TypeScript
* Tailwind CSS
* PostgreSQL database
* Prisma ORM
* Zod validation
* AI integration foundation
* Initial database schema

## 🎯 Planned Features

* 📚 Upload and manage study materials
* 🧠 AI-generated flashcards
* 📝 AI-generated quizzes
* 💡 AI-powered concept explanations
* 📊 Learning progress tracking
* 🎯 Weak-topic detection
* 🔎 RAG-based questions and answers from personal study materials
* 🤖 Personalized study recommendations
* 🧑‍💻 AI Study Agent

## 🏗️ Planned Architecture

```text
Student
   │
   ▼
Next.js Application
   │
   ├── Frontend
   │
   └── Backend / API
          │
          ├── PostgreSQL
          │      └── Prisma
          │
          └── AI Layer
                 │
                 ├── LLM
                 └── RAG
```

## 🛠️ Tech Stack

| Technology   | Purpose                  |
| ------------ | ------------------------ |
| Next.js      | Full-stack web framework |
| TypeScript   | Type-safe development    |
| Tailwind CSS | UI styling               |
| PostgreSQL   | Database                 |
| Prisma       | Database ORM             |
| Zod          | Data validation          |
| OpenAI API   | AI capabilities          |

## 📂 Project Structure

```text
recall-ai-study-assistant/
│
├── app/
│   ├── page.tsx
│   └── ...
│
├── components/
│   └── ...
│
├── lib/
│   └── ...
│
├── prisma/
│   └── schema.prisma
│
├── public/
│
├── .env.local
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Getting Started

Clone the repository:

```bash
git clone YOUR_REPOSITORY_URL
```

Go into the project:

```bash
cd recall-ai-study-assistant
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
.env.local
```

Add your environment variables:

```env
DATABASE_URL="your_postgresql_connection_string"
OPENAI_API_KEY="your_openai_api_key"
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## 🧠 Learning Approach

This project is being developed incrementally to understand the technologies behind modern AI applications.

The development roadmap is:

```text
Project Setup
     ↓
Database Architecture
     ↓
Dashboard UI
     ↓
AI Flashcards
     ↓
Quiz System
     ↓
PDF Processing
     ↓
RAG
     ↓
Personalization
     ↓
AI Study Agent
```

Each feature is implemented and understood before moving to the next stage.

## 🔐 Environment Variables

Never commit API keys or database credentials to GitHub.

The following files should remain private:

```text
.env
.env.local
```

## 📌 Project Goal

The goal of Recall is to explore how modern web development and AI engineering can be combined to build a practical learning platform.

---

**Built with Next.js, TypeScript, PostgreSQL, Prisma, and AI.**
