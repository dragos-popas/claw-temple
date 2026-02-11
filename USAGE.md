# CLAW-TEMPLE Usage Guide

**How to work with the CLAW-TEMPLE orchestration platform**

---

## 🎯 OVERVIEW

CLAW-TEMPLE is an AI agent orchestration platform that lets you:
- Create agent pools with custom configurations
- Define agent "souls" (personas, identities, rules)
- Manage tasks through a Kanban board
- Track spending and productivity

---

## 🚀 QUICK START

### 1. Create Your First Agent Pool

Go to **"🤖 Agents"** tab → **"+ New Pool"**

Fill in:
- **Name**: e.g., "Web Crawler", "Research Agent"
- **Icon**: Choose an emoji (🕷️, 🔍, 🤖, etc.)
- **Default Model**: Select from OpenRouter models
- **Max Parallel**: How many tasks can run simultaneously
- **Auto-accept**: Automatically start tasks when added

### 2. Configure Agent Soul (Optional but Recommended)

For each pool, you can create a "Soul" - the agent's personality:

1. Click **"Edit"** on a pool
2. Or create new Soul via API

**Soul Components:**
- **SOUL**: Core personality ("You are a meticulous web crawler...")
- **IDENTITY**: Name, role, expertise ("Name: Crawler | Role: Data Extractor")
- **BIBLE**: Rules and principles ("1. Always verify data\n2. Respect robots.txt...")

### 3. Create Tasks

Go to **"📋 Kanban"** tab → **"+ New Task"**

Fill in:
- **Title**: What needs to be done
- **Description**: Details about the task
- **Agent Pool**: Which pool handles it (or auto-assign)
- **Model**: Which model to use (or pool default)
- **Metadata**: Extra config (URLs, libraries, etc.)

### 4. Watch Agents Work

Tasks flow through columns:
```
TODO → RESEARCH → DEV → QA → DONE
```

- Agents pick up tasks from their queue
- Results auto-advance to next column
- QA can send back to Dev if fixes needed

---

## 📋 WORKFLOW EXAMPLES

### Web Crawler Workflow

1. **Create pool**: "Web Crawler" with Kimi K2.5 model
2. **Create Soul**: "You extract data from websites efficiently"
3. **Create task**: Title "Scrape store locations", Target URL, Library (Puppeteer)
4. **Watch**: Agent moves through RESEARCH → DEV → QA → DONE

### Research Workflow

1. **Create pool**: "Research Agent" with DeepSeek model
2. **Create Soul**: "You find and summarize information thoroughly"
3. **Create task**: Title "Research competitor pricing"
4. **Watch**: Agent researches and produces report

### Bug Fix Workflow

1. **Use Bug Fix template**: Dev → QA → DONE
2. **Create task**: Title "Fix login bug", link to GitHub issue
3. **QA reviews**: Can send back to Dev if needed

---

## 🎨 CUSTOMIZATION

### Agent Pool Settings

| Setting | Description | Recommended |
|---------|-------------|-------------|
| Max Parallel | Concurrent tasks | 1-3 |
| Timeout | Agent runtime limit | 30-60 min |
| Retry Count | Auto-retry on failure | 1-2 |
| Auto-accept | Auto-start tasks | Yes |
| Notification | Browser/Telegram | Both |

### Soul Configuration

```json
{
  "name": "Web Crawler Agent",
  "soul": "You are a meticulous data extractor. You prioritize accuracy over speed.",
  "identity": "Name: Crawler\nRole: Data Extraction Specialist\nExpertise: Web scraping, Puppeteer, Cheerio",
  "bible": "1. Always verify extracted data\n2. Respect robots.txt\n3. Handle CAPTCHAs gracefully\n4. Report all findings\n5. Never overload the target server",
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

---

## 📊 ANALYTICS

### Track Your Spending

**Dashboard shows:**
- Total spend (daily/weekly/monthly)
- Per-model spending breakdown
- Tasks completed
- Average cycle time
- Queue depth

### Optimize Costs

1. **Use cheaper models** for simple tasks
2. **Limit parallel tasks** to control spending
3. **Set cost limits** per pool
4. **Monitor usage** in Analytics tab

---

## 🔧 SETTINGS

### Default Repository
Set your default GitHub repo for new tasks.

### Column Limits
Control how many tasks can be in each stage:
- TODO: Unlimited (incoming queue)
- RESEARCH: 2 (avoid bottleneck)
- DEV: 3 (parallel work)
- QA: 2 (thorough review)
- DONE: Unlimited

### Notifications
- **Browser**: Desktop notifications
- **Telegram**: Via OpenClaw integration

---

## 💡 TIPS

1. **Start simple**: One pool, simple tasks
2. **Add complexity**: Multiple pools, custom souls
3. **Monitor closely**: Watch first few runs
4. **Iterate**: Adjust pools and souls based on results
5. **Document**: Add descriptions to help future you

---

## 🆘 TROUBLESHOOTING

### Task stuck in queue?
- Check pool is not paused
- Check max parallel not exceeded
- Verify pool has default model

### Agent not working?
- Check soul configuration
- Verify model is valid
- Check task metadata

### Spending too high?
- Review model selection
- Reduce parallel tasks
- Set cost limits

---

## 📚 RELATED

- **AGENTS.md**: Developer guide for maintainers
- **README.md**: Technical overview
- **CHANGELOG.md**: Version history

---

**Questions? Check the Analytics dashboard or create an issue.**