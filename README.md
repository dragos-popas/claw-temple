# 🦀 CLAW-TEMPLE

Cyberpunk AI Orchestration Platform for OpenClaw.

## Overview

CLAW-TEMPLE is a visual, LAN-accessible web UI for orchestrating OpenClaw agents with:
- Kanban-style task management
- Agent pool management
- OpenRouter model selection
- Git worktree integration
- Analytics dashboard
- Native browser + Telegram notifications

## Quick Start

```bash
# Install dependencies
npm install

# Initialize database
npm run db:init

# Start development servers (frontend + backend)
npm run dev
```

Access at `http://localhost:3000`

## Features

### 📋 Kanban Board
Drag-and-drop task management with columns: TODO → Research → Dev → QA → DONE

### 🤖 Agent Pools
Create customizable agent pools with:
- Custom icons
- Default models
- Parallel execution limits
- Auto-accept settings

### 🔌 OpenRouter Integration
Browse and select from available OpenRouter models with real-time pricing

### 🌐 Git Worktree Management
Auto-create worktrees per task for parallel agent execution

### 📊 Analytics Dashboard
Track OpenRouter spend, agent productivity, and queue metrics

### 🔔 Notifications
Browser notifications + Telegram alerts via OpenClaw

## Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3000
HOST=0.0.0.0
DATABASE_PATH=./data/claw-temple.db
WORKTREE_BASE=./worktrees
OPENCLAW_DIR=/home/dp420/.openclaw
```

## Tech Stack

- **Backend**: Express + TypeScript + SQLite + Socket.io
- **Frontend**: React + Vite + Tailwind + @hello-pangea/dnd
- **Charts**: Recharts
- **State**: Zustand

## Development

```bash
# Frontend only
cd frontend && npm run dev

# Backend only
npm run dev:backend

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
claw-temple/
├── src/
│   ├── api/routes/        # REST API endpoints
│   ├── services/          # Business logic
│   ├── stores/            # SQLite data access
│   └── types/             # TypeScript types
├── frontend/
│   ├── src/components/   # React components
│   ├── src/hooks/         # Custom hooks
│   └── src/services/      # API client
└── scripts/               # Utility scripts
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

Use conventional commits:

```
feat: add new agent pool type
fix: resolve task migration bug
docs: update API documentation
```

## License

MIT

---

**Built with 💜 for Dragos Popas**