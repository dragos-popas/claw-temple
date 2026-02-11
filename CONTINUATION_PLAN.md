# CLAW-TEMPLE: Resumption Plan

**Date:** 2026-02-11  
**Session:** 21:57 GMT+2  
**Model:** Xiaomi Flash (openrouter/xiaomi/mimo-v2-flash)

---

## 📊 Current Project Status

### ✅ Completed Features
- Kanban board with drag-and-drop (TODO → RESEARCH → DEV → QA → DONE)
- Agent pool management (create/edit/pause/resume)
- Task creation with framework selector (Crawlee/Scrapy/Playwright)
- Agent souls with personality configuration (SOUL/IDENTITY/BIBLE)
- Analytics dashboard with spending tracking
- REST API backend (Express + SQLite)
- Task worker for autonomous task processing
- Task comments system with real-time Socket.io updates
- Backend migrations (assigned_to, type, language columns)
- Production-ready task queue system (Dragonfly/Redis-compatible)

### 🐛 Known Issues (From PROGRESS.md)
1. **Model Dropdowns Show Limited Models**
   - Location: `frontend/src/components/AgentPool.tsx` and `TaskModal.tsx`
   - Issue: Only 2-3 hardcoded models shown instead of 345
   - Fix needed: Ensure `api.getModels()` returns all 345 models from OpenRouter

2. **Task Settings Override Pool (Not Implemented)**
   - When creating a task, selected model should override pool's default
   - Currently: Pool's `default_model` is always used
   - Fix needed: Task model field takes precedence

3. **Server Stability - Use PM2**
   - Server crashes frequently
   - Fix needed: Setup PM2 for auto-restart

### 📋 Modified Files (Uncommitted)
- `package.json` - Added `uuid` dependency
- `scripts/create-hello-world-tasks.mjs` - Removed `node-fetch` import

### 🗃️ Database State
- **Path:** `./data/claw-temple.db` (SQLite with WAL mode)
- **Contains:** Tasks, agent pools, agent souls, task comments
- **Example task:** Walmart.ca scraping task (task ID: `69504188-3ecf-4515-8a19-97f6fd69539f`)

---

## 🎯 Resumption Plan

### Phase 1: Server Setup & Dependencies
**Goal:** Get the backend server running reliably

```bash
# 1. Install uuid dependency (already in package.json)
npm install

# 2. Install PM2 globally (for production stability)
npm install -g pm2

# 3. Test server startup
node server-simple.mjs
# OR with PM2
pm2 start server-simple.mjs --name claw-temple
pm2 save
pm2 startup

# 4. Verify API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/models | jq length
```

**Expected outcome:** Server running on port 3000, API accessible

---

### Phase 2: Frontend Build & Testing
**Goal:** Ensure frontend is built and functional

```bash
# 1. Build frontend (if not already built)
cd frontend && npm run build

# 2. Test frontend serving
curl http://localhost:3000/

# 3. Verify API endpoints work
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/agents/pools
curl http://localhost:3000/api/agents/souls
```

**Expected outcome:** Frontend accessible at `http://localhost:3000/`

---

### Phase 3: Fix Model Dropdown Issue
**Goal:** Show all 345 OpenRouter models in dropdowns

**Files to modify:**
- `frontend/src/components/AgentPool.tsx`
- `frontend/src/components/TaskModal.tsx`

**Task:** Check if `/api/models` endpoint returns all models, and ensure frontend calls it properly

```bash
# Test the models endpoint
curl http://localhost:3000/api/models | jq '. | length'
# Should return 345 or close to it
```

**Implementation:**
1. Verify backend `/api/models` endpoint loads all models
2. Ensure frontend fetches models from API, not hardcoded
3. Add loading state and error handling for model fetch
4. Test dropdown displays all models

---

### Phase 4: Fix Task Model Override
**Goal:** Task model selection overrides pool default

**Files to modify:**
- `server-simple.mjs` - POST `/api/tasks` endpoint

**Current behavior:**
```javascript
// In server-simple.mjs, the task creation uses pool's default
db.prepare(`...`).run(
  id, title, description, ...,
  soulId, initialStatus, priority, metadata,
  taskType, language
);
// It doesn't use req.body.model
```

**Fix:**
```javascript
// Should use task model if provided, otherwise pool default
const taskModel = req.body.model || poolDefaultModel;
// Pass taskModel to INSERT statement
```

---

### Phase 5: Task Worker Enhancement
**Goal:** Improve task worker for better automation

**Current state:**
- Polls `/api/tasks?status=RESEARCH`
- Assigns tasks to souls
- Runs reconnaissance via mcporter
- Moves tasks to DEV after analysis

**Enhancements needed:**
1. Add error handling for failed reconnaissance
2. Add retry logic for failed tasks
3. Add logging for debugging
4. Handle different task types (scraping, general, research)

**Test command:**
```bash
# Run task worker
node task-worker.mjs
```

---

### Phase 6: E2E Testing
**Goal:** Run full workflow to ensure everything works

**Test scenario:**
1. Create a new task with target URL
2. Verify task moves to RESEARCH
3. Verify task worker picks it up
4. Verify reconnaissance runs
5. Verify task moves to DEV
6. Check task comments in UI

**Test tools:**
- Playwright E2E tests (see `tests/e2e/playwright.config.ts`)
- Manual API testing with curl
- Browser UI testing

---

### Phase 7: Deployment & Monitoring
**Goal:** Production-ready deployment

```bash
# 1. Build for production
npm run build

# 2. Start with PM2
pm2 start server-simple.mjs --name claw-temple
pm2 start task-worker.mjs --name claw-temple-worker

# 3. Monitor logs
pm2 logs claw-temple
pm2 logs claw-temple-worker

# 4. Set up monitoring
pm2 monit
```

**Production checklist:**
- [ ] PM2 configured for auto-restart
- [ ] Database backups scheduled
- [ ] Log rotation configured
- [ ] Frontend built and served correctly
- [ ] API rate limiting (if needed)
- [ ] Security headers configured

---

## 🔧 Quick Reference Commands

### Development
```bash
# Start server (dev mode)
node server-simple.mjs

# Start task worker
node task-worker.mjs

# Build frontend
cd frontend && npm run build

# Check server status
curl http://localhost:3000/api/health
```

### Production (PM2)
```bash
# Start services
pm2 start server-simple.mjs --name claw-temple
pm2 start task-worker.mjs --name claw-temple-worker

# Manage
pm2 restart claw-temple
pm2 stop claw-temple
pm2 logs claw-temple --lines 50

# Save and auto-start
pm2 save
pm2 startup
```

### Database
```bash
# Reset database (DANGER - deletes all data)
node scripts/db-init.mjs

# Check database size
ls -lh data/claw-temple.db
```

### Testing
```bash
# Test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/models | jq '. | length'
curl http://localhost:3000/api/tasks
curl http://localhost:3000/api/agents/pools
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `server-simple.mjs` | Main API server |
| `task-worker.mjs` | Background task processor |
| `PROGRESS.md` | Current issues and progress |
| `CHANGELOG.md` | Version history |
| `AGENTS.md` | Developer guide |
| `SCRAPER-WORKFLOW.md` | Multi-agent scraping workflow |
| `USAGE.md` | User guide |

---

## 🚀 Next Steps (Recommended Order)

1. **Immediate:** Start server with `node server-simple.mjs`
2. **Test API:** Verify `/api/health` and `/api/models` endpoints
3. **Build frontend:** `cd frontend && npm run build`
4. **Test task worker:** Run `node task-worker.mjs` with a test task
5. **Fix model dropdown:** Ensure all 345 models appear in UI
6. **Test full flow:** Create task → RESEARCH → DEV workflow
7. **Deploy with PM2:** Production deployment
8. **Monitor:** Check logs and analytics for issues

---

## 🎮 Cyberpunk Theme

Don't forget the aesthetic! 🦀

- Use neon colors: `#00ff88`, `#ff00ff`, `#00ffff`, `#ff6600`
- Fonts: Rajdhani (headings) + JetBrains Mono (code)
- Icons: Use emojis for agent pools (🕷️, 🔍, 🤖, etc.)
- Keep the cyberpunk vibe: "Chrome" references, "Chromebook" puns

---

**Status:** Ready to resume work  
**Last action:** Checked project state, created continuation plan  
**Next action:** Start server and verify API endpoints
