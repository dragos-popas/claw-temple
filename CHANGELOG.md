# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Production-Ready Task Queue System** using Dragonfly (Redis-compatible)
  - Priority-based task scheduling
  - Dead letter queue for failed tasks
  - Automatic retry with exponential backoff
  - Queue pause/resume functionality
- **Task Processor Service** for background task execution
  - Automatic task lifecycle management (BACKLOG → DEV → QA → DONE)
  - Status updates and comments on tickets
  - Agent assignment tracking
- **3 Hello World Test Tasks** (Python, TypeScript, Go)
  - End-to-end production testing
  - Full task lifecycle verification
- **GitHub Repository Setup** with Commitizen configuration
- **AGENTS.md** documentation for future AI developers
- Dragonfly database service for high-performance queuing

### Changed
- Migrated from polling-based task processing to event-driven queue system
- Enhanced observability with real-time status updates
- Improved task assignment with agent tracking

### Technical
- Dragonfly (Redis alternative) for task queue
- ioredis for Redis-compatible operations
- Service-oriented architecture (task-queue, task-processor)
- SystemD service files for production deployment

## [0.0.1] - 2026-02-11

### Added
- Initial project structure
- REST API backend with Express + TypeScript
- SQLite database layer
- Kanban board frontend with drag-and-drop
- Agent pool management
- Analytics dashboard with Recharts
- Settings page
- Git worktree integration
- OpenRouter model service
- Socket.io real-time updates
- Browser + Telegram notifications
- Cyberpunk theme with neon colors

### Features
- Kanban columns: TODO, RESEARCH, DEV, QA, DONE
- Agent pool customization (icons, models, parallel limits)
- Pre-built templates (Web Crawler, Bug Fix, etc.)
- Native browser notifications
- Column limits enforcement
- Task cost estimation

### Technical
- TypeScript configuration
- Tailwind CSS with custom cyberpunk theme
- Zustand for frontend state
- @hello-pangea/dnd for drag-and-drop
- Recharts for analytics visualization

## [0.0.0] - 2026-02-11

### Added
- Project initialization
- Basic backend scaffolding
- Frontend React app setup