# CLAW-TEMPLE - Progress as of 2026-02-11

## Working Features
- ✅ Server runs with 345 OpenRouter models loaded
- ✅ Kanban board (TODO → DONE)
- ✅ Agent Pools (create/edit/pause/resume)
- ✅ Task creation with framework selector (Crawlee/Scrapy/Puppeteer/Playwright)
- ✅ Analytics dashboard
- ✅ Settings page
- ✅ API endpoints for souls (/api/agents/souls)
- ✅ Pre-seeded Crawlee (TypeScript) and Scrapy (Python) souls

## Known Issues to Fix

### 1. Model Dropdowns Show Limited Models (FIX NEEDED)
- Location: frontend/src/components/AgentPool.tsx and TaskModal.tsx
- Issue: Model dropdowns only show 2-3 hardcoded models instead of 345
- Cause: API calls to /api/models fail silently, falling back to defaults
- Fix: Ensure api.getModels() returns all 345 models

### 2. Task Settings Override Pool (NOT IMPLEMENTED)
- When creating a task, the selected model should override pool's default
- Currently: Pool's default_model is always used
- Fix: Task model field takes precedence over pool default_model

### 3. Server Stability - Use PM2
- Server crashes frequently
- Setup PM2 for auto-restart

## Files Modified

### Frontend
- frontend/src/App.tsx - Added Souls tab
- frontend/src/components/AgentPool.tsx - Model dropdown
- frontend/src/components/TaskModal.tsx - Model dropdown + framework selector
- frontend/src/components/SoulManager.tsx - Souls UI (simplified)
- frontend/src/components/SoulEditor.tsx - Soul editor modal

### Backend
- server-simple.mjs - Model caching, souls endpoints, seed-defaults

## Quick Commands

```bash
# Start server with PM2
cd /home/dp420/.openclaw/workspace/claw-temple
pm2 start server-simple.mjs --name claw-temple

# Check status
pm2 status

# View logs
pm2 logs claw-temple

# Restart
pm2 restart claw-temple

# Rebuild frontend (after any UI changes)
cd frontend && npm run build

# Seed default souls
curl -X POST http://localhost:3000/api/agents/souls/seed-defaults

# Test API
curl http://localhost:3000/api/models | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'Models: {len(d)}')"
```

## API Endpoints

### Models
- GET /api/models - Returns 345 OpenRouter models

### Souls
- GET /api/agents/souls - List all souls
- POST /api/agents/souls - Create soul
- PUT /api/agents/souls/:id - Update soul
- DELETE /api/agents/souls/:id - Delete soul
- POST /api/agents/souls/seed-defaults - Create Crawlee + Scrapy souls

### Pools
- GET /api/agents/pools - List pools
- POST /api/agents/pools - Create pool
- PUT /api/agents/pools/:id - Update pool
- POST /api/agents/pools/:id/pause - Pause
- POST /api/agents/pools/:id/resume - Resume

### Tasks
- GET /api/tasks - List tasks
- POST /api/tasks - Create task
- POST /api/tasks/:id/move - Move task (status change)

## To Continue Development

1. Check PROGRESS.md for current state
2. Run pm2 status to see if server is running
3. If down, run pm2 restart claw-temple
4. Check frontend with curl http://localhost:3000/
5. Test model loading with curl http://localhost:3000/api/models

## PM2 Setup

```bash
# Install PM2
npm install -g pm2

# Start
pm2 start server-simple.mjs --name claw-temple

# Auto-boot
pm2 save
pm2 startup
```