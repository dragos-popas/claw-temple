# CLAW-TEMPLE: Complete Web Scraper Creation Workflow

## Overview

This document describes the **complete end-to-end workflow** for creating production-grade web scrapers using Crawlee. The workflow uses **multiple specialized agents** that collaborate through the agent pool system.

---

## Workflow Stages

```
┌─────────────────────────────────────────────────────────────────────┐
│                    SCRAPER CREATION PIPELINE                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. RESEARCH        2. ARCHITECT        3. DEVELOP        4. QA   │
│  ┌───────────┐      ┌───────────┐      ┌───────────┐    ┌────────┐ │
│  │ Researcher│ ───► │ Architect │ ───► │  Developer│───►│ QA     │ │
│  │  Agent    │      │  Agent    │      │   Agent   │    │ Agent  │ │
│  └───────────┘      └───────────┘      └───────────┘    └────────┘ │
│       │                   │                  │               │      │
│       ▼                   ▼                  ▼               ▼      │
│  Target analysis   Scraper design    Implementation   Testing      │
│  Qdrant search     Architecture      Build & test     Validation   │
│  Site mapping      Interfaces        Code review      Quality      │
│                                                                     │
│                                      5. DOCUMENT & STORE           │
│                                 ┌─────────────────────────┐         │
│                                 │ Qdrant Knowledge Store │         │
│                                 │ + Project Files        │         │
│                                 └─────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Stage 1: RESEARCH AGENT

**Purpose:** Analyze target website, understand structure, identify challenges

**Agent Soul:** Use `Researcher` or `Scarlett` in "research mode"

### Research Tasks:
```
1.1. Target Analysis
    - Visit homepage and key pages
    - Identify page types (listings, detail pages, infinite scroll, etc.)
    - Map URL patterns
    - Note JavaScript-rendered vs static content

1.2. Anti-Detection Assessment
    - Check for Cloudflare, reCAPTCHA, PerimeterX
    - Identify bot protection mechanisms
    - Note login/authentication requirements
    - Assess difficulty level (1-10)

1.3. Data Inventory
    - List all data points to extract
    - Identify page elements and selectors
    - Note pagination mechanisms
    - Assess data quality and consistency

1.4. Qdrant Research
    - Search 'kira_documents' for similar site scraping patterns
    - Search 'kira_skills' for anti-detection strategies
    - Document relevant findings

1.5. Output: Research Report
    - Target URL and scope
    - Site structure and URL patterns
    - Identified challenges and difficulty
    - Recommended approach (Cheerio vs Playwright)
    - Qdrant patterns to use
```

### Example Research Report:
```markdown
# Research Report: example-ecommerce.com

## Target Analysis
- Homepage: https://example-ecommerce.com
- Product listings: /category/{slug}
- Product detail: /product/{id}
- Pagination: ?page={n}

## Content Type
- Static HTML with JavaScript enhancement
- RECOMMENDED: Cheerio with some Playwright for dynamic elements

## Anti-Detection
- Cloudflare challenge on first access
- RECOMMENDED: Playwright with stealth plugin for initial request
- Residential proxies may be needed

## Data to Extract
- Product name, price, description, images, ratings, reviews

## Qdrant Patterns Found
- Previous e-commerce scraper pattern: "kira_documents" #42
- Anti-detection strategy for Cloudflare: "kira_skills" #7

## Difficulty: 6/10
```

---

## Stage 2: ARCHITECT AGENT

**Purpose:** Design the scraper architecture, define interfaces, plan implementation

**Agent Soul:** `Scarlett` (super senior developer mode)

### Architecture Tasks:
```
2.1. Scraper Architecture Design
    - Choose crawler type (CheerioCrawler vs PlaywrightCrawler)
    - Define request flow (start URLs → listing → detail → output)
    - Plan error handling and retry strategies
    - Design proxy rotation strategy

2.2. TypeScript Interface Design
    - Define Product/Item interfaces
    - Define Request/Response types
    - Define Error types
    - Create validation schemas (Zod)

2.3. Project Structure
    - src/
      - main.ts (entry point)
      - types.ts (interfaces)
      - extractors/ (per-page-type extractors)
      - utils/ (helpers, validators)
      - config.ts (settings)
    - tests/
    - package.json

2.4. Output: Architecture Document
    - File structure
    - Interface definitions
    - Data flow diagram
    - Error handling strategy
```

### Example Architecture:
```typescript
// src/types.ts
interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  images: string[];
  rating: number;
  reviewCount: number;
  category: string;
  inStock: boolean;
  scrapedAt: string;
}

interface ProductScraperConfig {
  startUrls: string[];
  maxPages: number;
  requestDelay: number; // ms
  proxyRotation: boolean;
}

// src/main.ts flow
async function main() {
  const crawler = new PlaywrightCrawler({
    startUrls: config.startUrls,
    async requestHandler({ page, enqueueLinks }) {
      // Extract product links from listing
      // Enqueue detail pages
    },
    async pageHandler({ page, data }) {
      // Extract product data
      // Validate with Zod
      // Store output
    }
  });
}
```

---

## Stage 3: DEVELOPER AGENT

**Purpose:** Implement the scraper based on architecture

**Agent Soul:** `Scarlett` (coding mode)

### Development Tasks:
```
3.1. Setup Project
    - Initialize npm project
    - Install dependencies (crawlee, playwright, zod, etc.)
    - Create tsconfig.json with strict settings
    - Setup ESLint

3.2. Implement Types & Interfaces
    - Create src/types.ts
    - Define all data structures
    - Add Zod validation schemas
    - Ensure strict TypeScript

3.3. Implement Core Logic
    - Create main crawler
    - Implement page handlers
    - Add extractors for each page type
    - Implement error handling

3.4. Implement Anti-Detection
    - Add proxy rotation
    - Implement user-agent rotation
    - Add Playwright stealth plugins
    - Implement exponential backoff

3.5. Testing Loop (CRITICAL)
    - Run `npm run build` after each code change
    - If build fails → FIX errors
    - Repeat until build succeeds
    - Document any type issues encountered

3.6. Output: Working Scraper Code
    - All source files
    - Compiles without errors
    - Includes tests
```

### Scarlett's Development Rules:
```
✓ ALWAYS run `npm run build` after writing code
✓ NEVER proceed to next step if build fails
✓ Document and fix ALL TypeScript errors
✓ Use interfaces for all data
✓ Add JSDoc for complex logic
✓ Include error handling for every async operation
```

---

## Stage 4: QA AGENT

**Purpose:** Validate the scraper works correctly

**Agent Soul:** Use `Scarlett` in "QA mode" or create dedicated `QATester` soul

### QA Tasks:
```
4.1. Build Verification
    - Run `npm run build` → Confirm success
    - Check for any TypeScript warnings

4.2. Code Review
    - Check for code smells
    - Verify error handling is comprehensive
    - Ensure logging is adequate
    - Check documentation is complete

4.3. Functional Testing (dry run)
    - Run scraper on small URL subset
    - Verify data extraction works
    - Check output format
    - Validate error handling

4.4. Anti-Detection Testing
    - Test with fresh IP
    - Verify no immediate blocks
    - Test retry logic

4.5. Output: QA Report
    - Build status: PASS/FAIL
    - Code review findings
    - Test results
    - Recommendations
```

### QA Checklist:
```
□ TypeScript build completes without errors
□ All interfaces are properly defined
□ Error handling covers all async operations
□ Request delay is implemented
□ Proxy rotation is configured
□ Output format matches spec
□ Logging is comprehensive
□ Documentation is complete
□ No 'any' types used
□ Zod validation is implemented
```

---

## Stage 5: DOCUMENT & STORE

**Purpose:** Store knowledge in Qdrant and commit to project

### Knowledge Storage Tasks:
```
5.1. Qdrant Storage
    - Store successful scraping patterns
    - Document anti-detection strategies that worked
    - Store selector patterns for future reference
    - Add learnings to 'kira_documents'

5.2. Project Documentation
    - Create README.md with usage instructions
    - Document environment variables
    - Document API endpoints if applicable
    - Update PROGRESS.md

5.3. Git Commit
    - Stage all changes
    - Commit with descriptive message
    - Push to repository
```

---

## Agent Specialization Summary

| Stage | Agent | Soul | Key Capability |
|-------|-------|------|----------------|
| Research | Researcher | Scarlett (research mode) | Site analysis, Qdrant search |
| Architect | Architect | Scarlett (architect mode) | System design, TypeScript interfaces |
| Developer | Developer | Scarlett (dev mode) | Implementation, build verification |
| QA | QA Tester | Dedicated QA soul or Scarlett (QA mode) | Testing, validation, reporting |
| Document | Any | Scarlett | Qdrant storage, documentation |

---

## Complete Workflow Example

### Input:
```
Target: https://news-site.com
Extract: Article titles, authors, dates, URLs
Scope: Latest 100 articles
```

### Workflow Execution:

**1. RESEARCH →**
```
Scarlett (Research Mode):
- Visits news-site.com, analyzes structure
- Finds pagination, article cards
- Identifies: Static HTML, no anti-bot
- Searches Qdrant for 'news scraping patterns'
- Outputs: Research Report with selectors
```

**2. ARCHITECT →**
```
Scarlett (Architect Mode):
- Design: CheerioCrawler (no browser needed)
- Define Article interface
- Plan: Start URLs → Extract article links → Detail pages
- Output: Architecture document with types.ts
```

**3. DEVELOP →**
```
Scarlett (Dev Mode):
- Creates project structure
- Implements crawler
- Writes extractors
- RUN BUILD → Fixes type errors
- RUN BUILD → SUCCESS
- Outputs: Working scraper code
```

**4. QA →**
```
Scarlett (QA Mode) or QATester:
- Verifies build passes
- Runs dry test on 5 articles
- Validates output format
- Outputs: QA Report (PASS)
```

**5. STORE →**
```
- Stores scraping pattern in Qdrant 'kira_documents'
- Commits code to git
- Creates README
```

**Result:** Production-ready scraper with full test coverage

---

## Creating the Workflow in Claw-Temple

### Step 1: Create Agent Pool with Specialized Souls

Create a pool with 4 agents:
- **Researcher** - Scarlett with research-focused SOUL
- **Architect** - Scarlett with architecture-focused SOUL  
- **Developer** - Scarlett with coding-focused SOUL
- **QA** - Dedicated QA soul

### Step 2: Define Task Flow

Tasks flow through the pool:
```
1. Create Task "Research news-site.com" → Assign to Researcher
2. Create Task "Architect scraper" → Assign to Architect  
3. Create Task "Implement scraper" → Assign to Developer
4. Create Task "QA validation" → Assign to QA
```

### Step 3: Implement Automation

For full automation, create a master orchestrator that:
```
1. Spawns research task
2. Waits for completion
3. Passes research to architect
4. Waits for completion
5. Passes architecture to developer
6. Waits for completion
7. Spawns QA task
8. On QA pass → Store in Qdrant
```

---

## Quick Start: Single-Agent Scraper Creation

For simpler cases, Scarlett can handle ALL stages:

```
Scarlett (Full Stack Mode):
1. Research → Analyze target
2. Architect → Design structure  
3. Develop → Write code + run build
4. QA → Self-validate
5. Store → Document in Qdrant

Each iteration: Write code → Run build → Fix errors → Repeat
```

This is the default behavior when you give Scarlett a scraping task directly.

---

## Key Commands for Testing

```bash
# Setup
npm init -y
npm install crawlee playwright zod
npm install -D typescript @types/node eslint

# Type check (ALWAYS run after code changes)
npm run build
# or
npx tsc --noEmit

# Run scraper locally
npm run start

# Test on subset
npm run start -- --max-requests 10
```

---

## Remember: Qdrant is Your Brain

**Before starting:** Search Qdrant for similar projects
```
curl -X POST http://localhost:6333/collections/kira_documents/points/search \
  -H "Content-Type: application/json" \
  -d '{"query": "e-commerce scraping patterns", "limit": 5}'
```

**After success:** Store the pattern
```
curl -X POST http://localhost:6333/collections/kira_documents/pointsupsert \
  -H "Content-Type: application/json" \
  -d '{"points": [{"id": 1, "vector": [...], "payload": {"pattern": "...", "site": "..."}}]}'
```

**Useful collections:**
- `kira_documents` - Scraping patterns and best practices
- `kira_skills` - Technical documentation
- `kira_entities` - Specific site configurations