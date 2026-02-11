# Dragonfly Queue Worker - Usage Guide

The Dragonfly worker uses a Redis-compatible queue (Dragonfly) for task processing, providing better performance and reliability than HTTP polling.

## Architecture

```
Client → API Server → Dragonfly Queue → Worker → Task Processing → Database Updates
```

### Key Differences from HTTP Polling

| Aspect | HTTP Polling Worker | Dragonfly Queue Worker |
|--------|---------------------|------------------------|
| **Communication** | REST API calls | Direct Redis protocol |
| **Performance** | HTTP overhead | Low latency (~1ms) |
| **Reliability** | Network-dependent | Queue guarantees delivery |
| **Scalability** | Limited by API rate | Multiple workers can share queue |
| **Queue Features** | Basic polling | Priority, retry, dead letter queue |

## Requirements

### Running Dragonfly

**Option 1: Docker (Recommended)**
```bash
# Start Dragonfly container
docker run --name dragonfly \
  -p 6379:6379 \
  -d \
  dragonflydb/dragonfly

# Verify it's running
docker ps | grep dragonfly
```

**Option 2: Local Binary**
```bash
# Download Dragonfly
curl -fsSL https://dragonflydb.io/install.sh | bash

# Run Dragonfly
dragonfly --maxmemory=2gb
```

**Option 3: Cloud Hosted**
```bash
# Set environment variables
export DRAGONFLY_HOST=your-dragonfly-host
export DRAGONFLY_PORT=6379
```

## Usage

### Starting the Dragonfly Worker

```bash
# Terminal 1: Ensure Dragonfly is running
docker ps | grep dragonfly
# OR
curl http://localhost:6379 2>/dev/null && echo "Dragonfly running" || echo "Dragonfly not running"

# Terminal 2: Start the Dragonfly worker
cd /home/dp420/.openclaw/workspace/claw-temple
node task-worker-dragonfly.mjs
```

### Server Integration

The server automatically enqueues tasks to Dragonfly when created:

```bash
# Create a task (will be enqueued to Dragonfly)
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello World - Python",
    "description": "Create a simple Hello World program",
    "type": "general",
    "language": "Python",
    "priority": 5
  }'
```

### Queue Management Endpoints

```bash
# Check queue status
curl http://localhost:3000/api/queue/status

# Pause queue processing
curl -X POST http://localhost:3000/api/queue/pause

# Resume queue processing
curl -X POST http://localhost:3000/api/queue/resume

# Retry a failed task
curl -X POST http://localhost:3000/api/queue/retry/<task-id>
```

### Queue Status Response

```json
{
  "pending": 3,
  "processing": 1,
  "completed": 5,
  "failed": 0,
  "isPaused": false,
  "redisConnected": true
}
```

## Workflow Processing

### Queue Keys

```
task:pending      # Tasks waiting to be processed
task:processing   # Tasks currently being worked on
task:completed    # Completed tasks
task:failed       # Failed tasks (with retry count)
queue:paused      # Pause flag
```

### Task Lifecycle

```
1. Task created via API
   ↓
2. Stored in database (for UI)
   ↓
3. Enqueued to Dragonfly (task:pending)
   ↓
4. Worker dequeues task
   ↓
5. Task moved to processing queue
   ↓
6. Workflow execution:
   TODO → RESEARCH → DEV → QA → DONE
   ↓
7. Task marked completed
   ↓
8. Task removed from processing queue
   ↓
9. Task added to completed queue (with TTL)
```

### Error Handling & Retries

The Dragonfly worker implements automatic retry with exponential backoff:

```javascript
// Retry logic
if (task.retryCount < 3) {
  const backoffMs = Math.pow(2, task.retryCount) * 1000;
  // Requeue with delay
}
```

**Retry limits:**
- Maximum 3 retry attempts
- Exponential backoff: 2s, 4s, 8s
- After 3 failures → moved to failed queue

## Monitoring

### Using Dragonfly CLI

```bash
# Install Dragonfly CLI
curl -fsSL https://dragonflydb.io/install.sh | bash

# Connect to Dragonfly
redis-cli

# List all keys
keys *

# Get queue stats
zcard task:pending
zcard task:processing
zcard task:completed
zcard task:failed

# Get task details
hgetall task:data:<task-id>
```

### Using Redis CLI (Dragonfly compatible)

```bash
# Connect
redis-cli -p 6379

# Check if queue is paused
get queue:paused

# List tasks in pending queue (with scores)
zrange task:pending 0 -1 withscores

# Get task data
hget task:data:<task-id> data
```

### Using Claw Temple UI

The server provides queue status at:
```
http://localhost:3000/api/queue/status
```

And the UI will display queue statistics in the Analytics dashboard.

## Performance Tuning

### Worker Configuration

```javascript
const PROCESSING_DELAY = 3000; // ms between queue checks
const MAX_CONCURRENT = 3;      // Max tasks processing at once
```

### Dragonfly Tuning

```bash
# Start Dragonfly with custom settings
dragonfly \
  --maxmemory=4gb \
  --threads=4 \
  --maxclients=10000 \
  --proactor_threads=4
```

### Environment Variables

```bash
# Configure worker
export DRAGONFLY_HOST=localhost
export DRAGONFLY_PORT=6379
export API_URL=http://localhost:3000

# Configure server
export PORT=3000
export DATABASE_PATH=./data/claw-temple.db
```

## Troubleshooting

### Dragonfly Not Connecting

```bash
# Check if Dragonfly is running
docker ps | grep dragonfly
# OR
netstat -tlnp | grep 6379

# Test connection
redis-cli ping
# Should return: PONG

# Check Dragonfly logs
docker logs dragonfly
```

### Worker Not Processing Tasks

```bash
# Check worker logs for errors
# Check queue is not paused
curl http://localhost:3000/api/queue/status

# Check if tasks are enqueued
redis-cli zcard task:pending

# Manually resume if paused
curl -X POST http://localhost:3000/api/queue/resume
```

### Task Stuck in Processing

```bash
# Check processing queue
redis-cli zrange task:processing 0 -1

# Get task details
redis-cli hgetall task:data:<task-id>

# If stuck, manually move back to pending
redis-cli zrem task:processing <task-id>
redis-cli zadd task:pending <timestamp> <task-id>
```

## Comparison: All Worker Types

| Worker | Queue Type | Use Case | Status |
|--------|------------|----------|--------|
| **task-worker.mjs** | HTTP polling | Scraping tasks, legacy | ✅ Working |
| **task-worker-enhanced.mjs** | HTTP polling | General programming demo | ✅ Working |
| **task-worker-dragonfly.mjs** | Dragonfly/Redis | Production queue processing | 🔄 New |

## Production Deployment

### With PM2

```bash
# Install PM2
npm install -g pm2

# Start Dragonfly worker with PM2
pm2 start task-worker-dragonfly.mjs --name claw-temple-dragonfly

# Save PM2 config
pm2 save
pm2 startup

# Monitor
pm2 logs claw-temple-dragonfly
pm2 monit
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  dragonfly:
    image: dragonflydb/dragonfly
    ports:
      - "6379:6379"
    command: --maxmemory=2gb --threads=4
    restart: unless-stopped

  claw-temple-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DRAGONFLY_HOST=dragonfly
      - DRAGONFLY_PORT=6379
      - DATABASE_PATH=./data/claw-temple.db
    depends_on:
      - dragonfly
    restart: unless-stopped

  claw-temple-worker:
    build: .
    command: node task-worker-dragonfly.mjs
    environment:
      - DRAGONFLY_HOST=dragonfly
      - DRAGONFLY_PORT=6379
      - API_URL=http://claw-temple-server:3000
    depends_on:
      - dragonfly
      - claw-temple-server
    restart: unless-stopped
```

## Quick Start Checklist

- [ ] Dragonfly is running (port 6379)
- [ ] Server is running (`node server-simple.mjs`)
- [ ] Dragonfly worker is running (`node task-worker-dragonfly.mjs`)
- [ ] API is accessible (`curl http://localhost:3000/api/health`)
- [ ] Queue status shows connected (`curl http://localhost:3000/api/queue/status`)
- [ ] Create test task and verify it processes through all Kanban columns

## Next Steps

1. **Test the workflow:**
   ```bash
   node scripts/create-hello-world-tasks.mjs
   ```

2. **Monitor progress:**
   ```bash
   curl http://localhost:3000/api/queue/status
   curl http://localhost:3000/api/tasks?type=general
   ```

3. **Check task comments:**
   ```bash
   curl http://localhost:3000/api/tasks/<task-id>/comments
   ```

The Dragonfly queue provides a robust, production-ready foundation for task processing with automatic retry, priority queuing, and dead letter queue capabilities.
