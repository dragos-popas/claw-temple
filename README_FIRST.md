# 👋 Welcome Back to CLAW-TEMPLE!

**You're resuming work on a Cyberpunk AI Orchestration Platform for OpenClaw.**

---

## What's This Project?

**CLAW-TEMPLE** is a visual, LAN-accessible web UI for orchestrating OpenClaw agents with:

- 📋 **Kanban Board** - Drag-and-drop task management (TODO → Research → Dev → QA → DONE)
- 🤖 **Agent Pools** - Create customizable AI agent teams
- 🧠 **Agent Souls** - Define personalities (SOUL/IDENTITY/BIBLE configuration)
- 📊 **Analytics Dashboard** - Track spending, productivity, queue metrics
- 🔔 **Notifications** - Browser + Telegram alerts via OpenClaw
- 💰 **Cost Tracking** - Monitor OpenRouter spending per task

---

## Current State

**What's Working:**
- ✅ Backend API (Express + SQLite)
- ✅ Kanban board UI
- ✅ Agent pool management
- ✅ Task worker for autonomous processing
- ✅ Task comments with real-time updates
- ✅ Production queue system (Dragonfly/Redis-compatible)

**What Needs Fixing:**
- 🐛 Model dropdowns only show 2-3 models instead of 345
- 🐛 Task model doesn't override pool default
- 🐛 Server needs PM2 for stability

**Server Status:** ❌ Not running (needs to be started)

---

## Quick Start

### 1. Start the Server
```bash
cd /home/dp420/.openclaw/workspace/claw-temple
node server-simple.mjs
```

### 2. Check API is Working
```bash
curl http://localhost:3000/api/health
# Should return: {"status":"ok","timestamp":"...","version":"0.0.0"}
```

### 3. Open the UI
```
http://localhost:3000
```

---

## Project Structure

```
claw-temple/
├── server-simple.mjs          # Main API server
├── task-worker.mjs            # Background task processor
├── frontend/                  # React UI
├── data/                      # SQLite database
├── PROGRESS.md                # Known issues
├── CHANGELOG.md               # Version history
├── CONTINUATION_PLAN.md       # This resume plan
├── AGENTS.md                  # Developer guide
├── SCRAPER-WORKFLOW.md        # Multi-agent workflow
└── USAGE.md                   # User guide
```

---

## Next Steps

See `CONTINUATION_PLAN.md` for detailed resumption plan.

**Quick answer:** Just run `node server-simple.mjs` and the magic begins! 🦀

---

Built with 💜 for Dragos
