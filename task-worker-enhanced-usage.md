# Enhanced Task Worker - Usage Guide

The enhanced task worker provides realistic Kanban workflow simulation for test tasks.

## Features

### Full Workflow Automation
General programming tasks now flow through **all 5 Kanban columns**:

```
TODO → RESEARCH → DEV → QA → DONE
```

### Realistic Developer Comments
Each phase includes realistic comments from different "developer personas":

| Phase | Persona | Comments |
|-------|---------|----------|
| **TODO → RESEARCH** | 🔍 Research Agent | Task analysis, requirement review, best practices research |
| **RESEARCH → DEV** | 📐 Architect Bot | Architecture design, interface planning, structure decisions |
| **DEV** | 💻 Dev Bot | Implementation details, code writing, testing |
| **DEV → QA** | 🧪 QA Bot | Code review, linting, type checking, standards compliance |
| **QA → DONE** | ✨ Completion Bot | Final verification, celebration, task closure |

### Comment Types
- **`update`** - Status updates and progress markers
- **`finding`** - Analysis results and discoveries
- **`comment`** - General developer commentary

## Usage

### Running the Enhanced Worker

```bash
# Start the enhanced worker (separate from main worker)
cd /home/dp420/.openclaw/workspace/claw-temple
node task-worker-enhanced.mjs
```

### Creating Test Tasks

```bash
# Create 3 Hello World test tasks (Python, TypeScript, Go)
node scripts/create-hello-world-tasks.mjs
```

### Monitoring Progress

```bash
# Check task status via API
curl "http://localhost:3000/api/tasks?type=general"

# View task comments
curl "http://localhost:3000/api/tasks/<task-id>/comments"

# Monitor logs
tail -f logs/worker.log  # if logging enabled
```

## Workflow Example

### Task: "Hello World - Python"

**Phase 1: TODO**
- Task created with priority 5
- Assigned to General Developer soul

**Phase 2: RESEARCH** (3 comments)
- 🔍 Research Agent: "Starting research for Hello World - Python"
- 🔍 Research Agent: "Reviewing Python best practices and conventions"
- 🔍 Research Agent: "Research complete. Ready to architect solution."

**Phase 3: DEV** (5 comments)
- 📐 Architect Bot: "Designing Python class structure"
- 📐 Architect Bot: "Planning function interfaces and type hints"
- 💻 Dev Bot: "Starting Python implementation"
- 💻 Dev Bot: "Writing hello world function"
- 💻 Dev Bot: "Development complete"

**Phase 4: QA** (4 comments)
- 🧪 QA Bot: "Beginning QA review of Python code"
- 🧪 QA Bot: "Checking PEP 8 compliance"
- 🧪 QA Bot: "Running linter and formatter"
- 🧪 QA Bot: "QA review passed - code meets standards"

**Phase 5: DONE** (5 comments)
- ✨ Completion Bot: "Task completed successfully!"
- ✨ Completion Bot: "Implementation verified and tested"
- ✨ Completion Bot: "All requirements met for Python solution"
- ✨ Completion Bot: "Ready for deployment"
- ✨ Completion Bot: "Task completed and closed"

## Configuration

### Workflow Delay
```javascript
const WORKFLOW_DELAY = 3000; // milliseconds between phases
```

### Polling Interval
```javascript
const POLL_INTERVAL = 5000; // milliseconds between queue checks
```

### Supported Languages
- Python
- TypeScript
- Go

Each language has language-specific comments that reflect its ecosystem and conventions.

## Comparison with Original Worker

| Feature | Original Worker | Enhanced Worker |
|---------|----------------|-----------------|
| **Workflow** | RESEARCH → DEV only | TODO → RESEARCH → DEV → QA → DONE |
| **Comments** | Basic status updates | Realistic multi-phase developer comments |
| **Personas** | Single agent | 5 different developer personas |
| **Task Types** | Scraping + General | General only (scraping handled by original) |
| **Use Case** | Production task processing | Testing and demonstration |

## Running Both Workers

You can run both workers simultaneously:

```bash
# Terminal 1: Original worker (handles scraping tasks)
node task-worker.mjs

# Terminal 2: Enhanced worker (handles general programming tasks)
node task-worker-enhanced.mjs
```

## Testing the Workflow

### Manual Test

1. **Create a test task:**
   ```bash
   curl -X POST http://localhost:3000/api/tasks \
     -H "Content-Type: application/json" \
     -d '{
       "title": "Test Task - Full Workflow",
       "description": "Testing full Kanban workflow",
       "type": "general",
       "language": "TypeScript",
       "priority": 3
     }'
   ```

2. **Monitor progress:**
   - Watch the worker logs
   - Check task status: `curl http://localhost:3000/api/tasks/<id>`
   - View comments: `curl http://localhost:3000/api/tasks/<id>/comments`

3. **Expected flow:**
   - Task created → TODO
   - Worker picks up → RESEARCH
   - Research comments added → DEV
   - Dev comments added → QA
   - QA comments added → DONE
   - Task marked complete

### Automated Test

```bash
# Create 3 test tasks
node scripts/create-hello-world-tasks.mjs

# Start enhanced worker
node task-worker-enhanced.mjs

# Wait for completion (3 tasks × ~15 seconds = ~45 seconds)
sleep 50

# Verify all tasks completed
curl "http://localhost:3000/api/tasks?type=general" | jq '.[] | {title, status}'
```

## Troubleshooting

### Task stuck in TODO
- Check that task has `soulId` assigned
- Ensure task `type` is set to `"general"`
- Verify enhanced worker is running

### Comments not appearing
- Check worker logs for errors
- Verify API endpoint is responding: `curl http://localhost:3000/api/health`
- Check database connection

### Workflow too fast/slow
- Adjust `WORKFLOW_DELAY` in `task-worker-enhanced.mjs`
- Adjust `POLL_INTERVAL` for queue checking frequency

## Production Considerations

This enhanced worker is designed for:
- **Testing** - Verify full Kanban workflow
- **Demonstration** - Show realistic task progression
- **Training** - Help users understand the system

For production task processing, use the original `task-worker.mjs` which is optimized for performance.
