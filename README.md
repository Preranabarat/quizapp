# 🎮 QuizSync - Interactive Quiz Application

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.1.6-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-green?logo=express)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-white?logo=socket.io)](https://socket.io/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

</div>

## 🌟 Overview

QuizSync is a cutting-edge, real-time quiz application that revolutionizes the way quizzes are created and taken. Built with modern technologies and featuring AI-powered quiz generation, it offers an engaging and interactive experience for both quiz creators and participants.

### 🚀 Key Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 🎯 Real-time Updates | Live synchronization of quiz progress and results |
| 🤖 AI Quiz Generation | Smart quiz creation powered by Google's Generative AI |
| 👥 User Authentication | Secure login and registration system |
| 🎨 Modern UI | Beautiful interface with Tailwind CSS and Framer Motion |
| 🔄 Real-time Communication | Instant updates using Socket.IO |
| 📱 Responsive Design | Perfect experience on all devices |
| 🎮 Interactive Interface | Engaging quiz-taking experience |
| 🔒 Secure Authentication | Protected routes with NextAuth.js |

</div>

## 🛠️ Tech Stack

### Frontend
<div align="center">

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 15.1.6 | React Framework |
| React | 19.0.0 | UI Library |
| TypeScript | 5.0.0 | Type Safety |
| Tailwind CSS | 3.4.1 | Styling |
| Framer Motion | 12.4.2 | Animations |
| Zustand | 5.0.3 | State Management |
| Socket.IO Client | 4.8.1 | Real-time Communication |
| NextAuth.js | 4.24.11 | Authentication |

</div>

### Backend
<div align="center">

| Technology | Version | Purpose |
|------------|---------|---------|
| Express.js | 4.21.2 | Server Framework |
| TypeScript | 5.7.3 | Type Safety |
| Socket.IO | 4.8.1 | Real-time Server |
| Google Generative AI | 0.24.0 | AI Integration |
| Prisma | 6.3.0 | Database ORM |
| Neon DB | Latest | Serverless PostgreSQL Database |
| Node.js | Latest | Runtime Environment |

</div>

## ⚙️ Prerequisites

Before you begin, ensure you have the following installed:

- 💻 Node.js (v18 or higher)
- 📦 npm or yarn
- 🗄️ Neon DB Account (for database)
- 🔑 Google AI API key (for quiz generation)

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone [your-repository-url]
cd QuizApp
```

### 2. Install Dependencies

**Frontend:**
```bash
cd quiz
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### 3. Environment Setup

**Frontend (.env):**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

**Backend (.env):**
```env
PORT=5000
DATABASE_URL="postgres://[user]:[password]@[neon-hostname]/[dbname]?sslmode=require"
GOOGLE_AI_API_KEY=your-google-ai-api-key
```

### 4. Start Development Servers

**Frontend:**
```bash
cd quiz
npm install
npx prisma generate
npm run dev
```

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Access Points:**
- 🌐 Frontend: http://localhost:3000
- 🔧 Backend: http://localhost:3001

## 📁 Project Structure

```
QuizApp/
├── quiz/                 # Frontend Next.js application
│   ├── app/             # Next.js app directory
│   ├── components/      # React components
│   └── public/          # Static assets
└── backend/             # Express.js backend
    ├── src/             # Source code
    └── server.ts        # Main server file
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. 🍴 Fork the repository
2. 🌿 Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push to the branch (`git push origin feature/AmazingFeature`)
5. 🔄 Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- 🤖 Google Generative AI for quiz generation capabilities
- ⚡ Next.js team for the amazing framework
- 👥 All contributors and maintainers of the open-source libraries used in this project

---

<div align="center">

Made with ❤️ by Prerana barat

</div> # quizapp
# quizapp
