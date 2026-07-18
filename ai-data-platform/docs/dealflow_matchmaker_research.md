# Deal-flow Matchmaker — Research Report

**Context:** VAIC 2026 Hackathon · Problem 135 · Track: Open Innovation  
**Sponsor:** National Innovation Center (NIC)  
**Date:** 2026-07-17 (updated 2026-07-18 with NIC startup lists)  
**Status:** Research complete — NIC-supported startups cataloged (Section 8.4)

---

## 1. Problem Summary

Build an AI-powered platform that automatically connects startups with:
- **Corporations** — for partnerships, pilot programs, procurement
- **Universities & research institutions** — for R&D collaboration, tech transfer
- **Investment funds** — for funding

Core capabilities:
1. **Analyze** startup profiles, capabilities, and business needs
2. **Identify** the most suitable partners, investors, or collaborators
3. **Draft** personalized outreach emails
4. **Schedule** meetings based on mutual availability (startup + NIC staff)

**Key insight:** This is NOT a startup→investor matching only. It's a **multi-sided marketplace** connecting startups to four distinct stakeholder types, with NIC as the orchestrator.

---

## 2. Competitive Landscape

### 2.1 Startup↔Investor Matching Platforms (Direct Competitors)

| Platform | Approach | Data | Differentiator |
|---|---|---|---|
| **VCMatch** | AI scores 4,100+ investors on thesis, stage, sector, check size, geography | Proprietary | 5-signal scoring + outreach templates |
| **OpenStars** | 15,000+ verified VCs, match scoring, warm intro templates | Proprietary | 50,000+ founders on platform |
| **Founder Relay** | Public-signal matching against 149K+ investor records | Public web data | Research briefs + email drafts from your inbox |
| **NUVC** | 7,800+ investors, pre-computed SBERT embeddings, 7-dimension pitch deck scoring | Proprietary + web | MCP-native (AI-agent accessible), LP-grade fund screening |
| **Venturepunks** | Multi-signal ensemble: sector (Jaccard), stage, thesis (semantic), network proximity | Proprietary | Explicit scoring transparency (no black box) |
| **Bridge** | Corporate innovation ↔ AI startup matching | Crunchbase, PitchBook, LinkedIn | Autonomous sourcing for corporate innovation teams |
| **Nesha** | Complementarity-first discovery using 40 years of research (HBR, McKinsey, BCG) | Proprietary | Grounded in management science research |
| **Refership** | AI Chief BD Officer — matches on values, product fit, business goals | Public web data | Communiqué + technical fit analysis |
| **Gearbox.AI** | 6+ years ML intersections + RFP process + startup sourcing | Multi-source datalake | Combines RFP workflow with AI scoring |

**Takeaway:** Investor matching is crowded. The differentiation for NIC is the **multi-stakeholder scope** (corporations + universities + research institutions + investors in one platform) and the **NIC brand/orchestration role**.

### 2.2 Pitch Deck / Startup Profile Analysis

| Platform | Approach | Output |
|---|---|---|
| **DeckVue** | LLM extracts 12 structured sections + Crunchbase enrichment + AI fact-checking | Structured profile + confidence scores |
| **SupScreen** | Structured AI extraction + risk signals + red flags | Investor-grade analysis |
| **MrBridge** | Unit economics analysis (CAC, LTV), TAM/SAM/SOM, founder verification | Investment memo |
| **Grizzz** | Evidence-linked claims, FME scores, source-linked extraction | Audit-ready diligence |
| **Raisebase** | Instant insights on market, startup, founders | Comprehensive profile |

### 2.3 Email Automation

| Platform | Approach |
|---|---|
| **ProRaise** | Personalized cold email per investor, sent from your Gmail/Outlook, auto follow-ups |
| **Raisi** | AI-generated outreach personalized to investor thesis and behavior |
| **Causo** | AI sales agent finding customers/investors, writing in your voice |
| **HeyEveryone** | Curated high-signal VC list → AI writes unique email per investor → auto sending |

---

## 3. Technical Approaches

### 3.1 Matching Algorithms — What Actually Works

#### Approach A: Semantic Embedding + Cosine Similarity (Most Common)

The dominant approach used by most platforms:

```
Startup Profile → SBERT/OpenAI Embedding → Vector DB
Investor Thesis → SBERT/OpenAI Embedding → Vector DB
Match Score = cosine_similarity(startup_vec, investor_vec)
```

**Used by:** NUVC (SBERT), OpenStars, FoundMatch (SBERT), Fundizr  
**Pros:** Simple, works with unstructured text, handles synonyms  
**Cons:** Doesn't capture relational structure (who knows whom), no explicit field matching

**Implementation:**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
# Or for Vietnamese: 'keepitreal/vietnamese-sbert'

startup_embedding = model.encode(startup_description)
investor_embedding = model.encode(investor_thesis)
score = cosine_similarity(startup_embedding, investor_embedding)
```

#### Approach B: Multi-Signal Ensemble Scoring

Used by Venturepunks — combines independent signals:

| Signal | Method | Weight |
|---|---|---|
| Sector fit | Jaccard similarity on tags | 30% |
| Stage alignment | Rule-based (seed vs Series A vs growth) | 25% |
| Thesis compatibility | SBERT semantic similarity | 25% |
| Network proximity | Graph distance in investment network | 10% |
| Geographic fit | Rule-based location matching | 10% |

**Pros:** Explainable, tunable, debuggable  
**Cons:** Requires well-structured data for all signals

#### Approach C: Graph Neural Networks (GNN)

Used by FoundMatch (LightGCN) and Investor-Recommender (GraphSAGE, GATv2):

```
Knowledge Graph: (Investor) --[invested_in]--> (Startup_A)
                               --[invested_in]--> (Startup_B)
                  (Startup) --[similar_to]--> (Other_Startup)
                            --[founded_by_alumni_of]--> (University)
```

**Pros:** Captures relational patterns (e.g., "investors who backed startup X also back startups like Y")  
**Cons:** Requires cold-start handling for new entities, needs training data

#### Approach D: SocioLink — Knowledge Graph with Proximity Principle

Published in JMIS (2023, Xu, Chen & Zhao). The only academic paper specifically on startup recommendation:

- Models **five dimensions of proximity** in a knowledge graph:
  1. **Geographic proximity** — same city/region
  2. **Industry proximity** — same sector/vertical
  3. **Social network proximity** — shared connections (investors, advisors, alumni)
  4. **Organizational proximity** — similar company stage/size
  5. **Cognitive proximity** — similar technology/patent domains

- Uses **path-constrained random walks** on the knowledge graph to compute proximity scores
- Demonstrated superior performance over content-based and collaborative filtering baselines

**Relevance to NIC:** The proximity principle aligns naturally with NIC's ecosystem — they know the network. A knowledge graph connecting Vietnamese startups, corporations, universities, and investors would be the core IP.

#### Approach E: LLM-as-Judge Matching

For smaller datasets (NIC's curated ecosystem may be < 1000 entities):

```
Prompt: "Given this startup profile [X] and these 10 potential corporate partners [Y1..Y10], 
rank them by partnership fit and explain why."
```

**Pros:** High accuracy for curated lists, explainable, zero cold-start  
**Cons:** Cost scales with comparisons, latency per-match

### 3.2 Recommendation: Hybrid Approach for NIC

For a hackathon deliverable, the most pragmatic approach is a **hybrid multi-signal scorer**:

```
Stage 1: Coarse Filtering (rule-based)
  - Sector/industry match
  - Stage/funding alignment
  - Geography preference
  → Reduces pool from N → ~50 candidates

Stage 2: Semantic Scoring (SBERT)
  - Startup description ↔ Partner thesis/profiles
  - Multilingual embeddings (Vietnamese + English)
  → Ranks candidates by fit score

Stage 3: LLM Explanation (optional)
  - Generate "why this match" explanation for top-5 results
  - Personalize outreach email using match rationale
```

---

## 4. Data Sources

### 4.1 Vietnam-Specific Startup Data

| Source                                 | Type                            | Access             | Coverage                                              |
| -------------------------------------- | ------------------------------- | ------------------ | ----------------------------------------------------- |
| **startup.gov.vn**                     | National startup portal         | Public             | Government-registered startups, investors, incubators |
| **Viet.io**                            | Open-source ecosystem map       | Public             | Companies, investors in Vietnam                       |
| **BSSC Portal** (congthongtin.bssc.vn) | Startup database                | Public             | 1,000+ startups from BSSC programs                    |
| **NIC's own database**                 | Curated by NIC                  | Internal (primary) | Startups from NIC programs (Scale X, VietLeap)        |
| **NSSC**                               | National startup support center | Public             | Ecosystem reports, startup stories                    |

### 4.2 Global Startup/Investor Data

| Source | Type | Access | Coverage | Cost |
|---|---|---|---|---|
| **Crunchbase API** | Funding, profiles, predictions | Paid API | 610+ endpoints, LLM-powered insights | $59k+/yr |
| **PitchBook** | Private market data | Paid API | Comprehensive | $20k+/yr |
| **Dealroom** | Startup/tech ecosystem data | Paid API | Strong EU/global | Enterprise |
| **StartupHub.ai** | AI startup data + investor profiles | Free tier + paid API | Real-time discovery | Free to search; pay-per-call API |
| **FundedAPI** | Funding events, hiring signals | Free tier (100 calls/day) | JSON + webhooks | Free tier |
| **OpenPitch** | Open-source PitchBook alternative | Free, MCP-native | AI-focused companies | Free |
| **StartupGraph** | Open startup database | Free, open source | 8,400+ companies | Free |

### 4.3 University & Research Institution Data

| Source | Type | Access |
|---|---|---|
| **Google Scholar** | Research publications by institution | Public API limited |
| **OpenAlex** | Open catalog of research works, authors, institutions | Free API |
| **ORCID** | Researcher profiles | Public API |
| **Vietnamese university tech transfer offices** | Internal databases | Direct partnership (NIC-facilitated) |
| **WIPO PATENTSCOPE** | Patent database | Free search API |

### 4.4 Corporate Partner Data

| Source | Type | Access |
|---|---|---|
| **Vietnam business registry** | Registered companies | Public (limited structured) |
| **LinkedIn Sales Navigator / API** | Company profiles, employees | Paid |
| **Corporates' own innovation/R&D pages** | Web scraping | Public |
| **NIC's corporate partners** | Direct relationships | Internal (primary) |

### 4.5 Recommended Data Strategy for Hackathon

For a working demo within 48 hours:

1. **Seed database:** Create curated JSON profiles for 30-50 entities:
   - 15-20 startups (various sectors, stages)
   - 8-10 investors (angel, VC, corporate VC)
   - 5-7 corporations (with innovation mandates)
   - 5-7 universities/research institutions (with key labs/programs)

2. **Structure each profile** with standardized fields:
   ```json
   {
     "id": "startup_001",
     "type": "startup",
     "name": "EcoFarm AI",
     "description_vn": "Nền tảng AI tối ưu hóa chuỗi cung ứng nông sản...",
     "description_en": "AI platform optimizing agri-supply chain...",
     "sector": ["agritech", "ai", "supply_chain"],
     "stage": "seed",
     "founded": 2024,
     "location": "Ho Chi Minh City",
     "funding_raised": "$500K",
     "team_size": 12,
     "technology_stack": ["computer_vision", "iot", "ml"],
     "looking_for": ["corporate_pilot", "series_a_funding", "rd_partner"],
     "contact_email": "founder@ecofarm.ai"
   }
   ```

3. **Enrich on the fly:** Use StartupHub.ai or FundedAPI for real data on known entities.

---

## 5. Profile Analysis & Extraction

### 5.1 LLM-Based Profile Extraction

Startups submit unstructured profiles (pitch decks, websites, forms). Extract structured fields using an LLM:

```python
import json

EXTRACTION_PROMPT = """Extract the following from this startup description. 
Return ONLY valid JSON with these fields:
- name: company name
- sector: array of industry sectors
- stage: one of [ideation, pre_seed, seed, series_a, series_b, growth]
- location: city, country
- description_vi: 2-sentence Vietnamese summary
- technology: array of key technologies
- looking_for: array from [funding, corporate_partnership, rd_collaboration, talent, mentorship]
- funding_raised: amount raised or null

Startup text:
{startup_text}
"""

# Using any LLM (OpenAI, Gemini, Claude, or local via Ollama)
response = llm.complete(EXTRACTION_PROMPT.format(startup_text=raw_profile))
profile = json.loads(response)
```

### 5.2 Vietnamese Language Support

Since NIC is Vietnam-based, profiles will be mixed Vietnamese/English. Key considerations:

- **Vietnamese SBERT model:** `keepitreal/vietnamese-sbert` on HuggingFace — produces embeddings that understand Vietnamese semantics
- **LLM for extraction:** Gemini 2.5 Flash supports Vietnamese well; GPT-4o also strong
- **Translation layer:** Use Google Translate or LLM to normalize all profiles to bilingual (VI + EN) for consistent matching
- **Sector tags:** Maintain a bilingual taxonomy (e.g., `nông_nghiệp` ↔ `agritech`)

---

## 6. Outreach Email Generation

### 6.1 Approach: Match-Informed Personalization

The key insight from ProRaise, Raisi, and others: **personalization quality directly correlates with response rate**. Generic "Dear Investor" emails convert poorly.

```python
EMAIL_PROMPT = """Write a personalized outreach email from {nic_staff_name} 
at Vietnam National Innovation Center (NIC) to {partner_name} at {partner_org}.

Context:
- Startup: {startup_name} — {startup_description}
- Partner: {partner_org} — {partner_description}
- Match rationale: {match_rationale}
- Suggested next step: {next_step}

Guidelines:
- Write in {"Vietnamese" if partner_is_vietnamese else "English"}
- Reference specific alignment points from the match rationale
- Propose 2-3 specific meeting times (from availability)
- Keep under 150 words
- Professional but warm tone

Email:
"""
```

### 6.2 Key Features from Competitors

| Feature | Implementation |
|---|---|
| **Per-investor personalization** | Inject match rationale (why they specifically) |
| **Send from user's inbox** | Gmail/Outlook OAuth integration, not a noreply address |
| **Auto follow-ups** | Sequence: Day 0 (initial) → Day 3 (gentle reminder) → Day 7 (last attempt) |
| **Reply detection** | Inbox webhook/web scraping to detect replies → auto-pause sequence |
| **A/B testing** | Variant subject lines, track open/response rates |

---

## 7. Meeting Scheduling

### 7.1 Calendar Integration Options

| Solution | Description | Best For |
|---|---|---|
| **Nylas Calendar API** | Unified API across Google, Outlook, Exchange, iCloud | Production-grade multi-provider |
| **Google Calendar API** | Direct GCal integration | Simpler setup, GSuite orgs |
| **Calendly API** | Booking page + availability management | Quick setup |
| **Cronofy** | Enterprise calendar sync | Large deployments |

### 7.2 Nylas Availability API (Recommended)

Nylas provides the cleanest solution for cross-provider availability checking:

```python
# Check mutual availability
response = nylas.calendar.get_availability({
    "participants": [
        {"email": "startup_founder@example.com"},
        {"email": "nic_staff@nic.gov.vn"}
    ],
    "duration_minutes": 30,
    "start_time": int(start_timestamp),
    "end_time": int(end_timestamp),
    "interval_minutes": 30
})
# Returns list of available slots across both calendars
```

### 7.3 For Hackathon: Simplified Approach

For a 48-hour demo, use Google Calendar API directly:

1. **NIC staff** maintains shared availability via a Google Calendar
2. **Startup/partner** provides preferred times in profile or via form
3. **Auto-scheduler:** Find overlaps → propose 3 slots in email → confirm via link

---

## 8. NIC Context & Ecosystem

### 8.1 About NIC

- **Established:** 2019, under Ministry of Planning and Investment (Decision 1269/QĐ-TTg)
- **Mission:** Develop Vietnam's national innovation and startup ecosystem
- **Key programs:**
  - **NIC Scale X** — 13-week deep-tech accelerator (health, clean energy, smart manufacturing, agritech, IoT)
  - **VietLeap AI Accelerator** — AI startup accelerator with BCG mentorship
  - Partnerships with JICA (Japan), UNDP, Plug and Play, MRI
- **Ecosystem role:** NIC is the central orchestrator connecting startups, corporations, universities, and investors

### 8.2 NIC's Unique Position

NIC is not just another matchmaking platform — they are the **trusted intermediary** with government backing. This changes the platform design:

- **Trust signal:** NIC's involvement makes cold outreach warmer
- **Curated quality:** NIC pre-vets startups through accelerator programs
- **Multi-stakeholder mandate:** Unlike pure investor-match platforms, NIC must serve corporations, universities, and research institutions too
- **Physical + digital:** NIC can facilitate in-person meetings at NIC facilities (Hoa Lac, Hanoi)

### 8.3 Related Vietnam Platforms

| Platform | Focus |
|---|---|
| **startup.gov.vn** | National startup portal — database of startups, investors, support orgs |
| **Viet.io** | Open-source ecosystem map of Vietnamese startups and investors |
| **BSSC Portal** | 1,000+ startups, investors, incubators |
| **BambuUP** | Open innovation platform connecting startups with corporations |

### 8.4 Startups Publicly Supported by NIC

This section catalogs startups that NIC has publicly backed through its accelerator programs and innovation challenges. These are verified from public sources (LinkedIn, VnExpress, PR Newswire, NIC program websites).

#### 8.4.1 NIC Scale X — Top 10 Cohort (2026)

**Program:** 13-week deep-tech accelerator, Jan–Apr 2026  
**Partners:** Embassy of Japan, UNDP, Mitsubishi Research Institute (MRI), Plug and Play  
**Selection:** 250+ applicants → Top 40 shortlisted → Top 20 pitched → **10 finalists**

| # | Startup | Country | Sector | Description |
|---|---------|---------|--------|-------------|
| 1 | **Alternō** | 🇻🇳 Vietnam | Clean Energy / ESG | (details not publicly disclosed) |
| 2 | **STAR GLOBAL** | 🇻🇳 Vietnam | Digital Twin / IoT | 3D/360 Smart Interactive Digital Twin platform |
| 3 | **enfarm Agritech** | 🇻🇳 Vietnam | Agritech | Smart farming / agri-tech solutions |
| 4 | **VOX Cool** | 🇻🇳 Vietnam | Clean Energy | (details not publicly disclosed) |
| 5 | **Rongbient Biotech** | 🇻🇳 Vietnam | Healthcare / Biotech | Biotechnology solutions |
| 6 | **SHOES AGTECH LTD** | 🇻🇳 Vietnam | Agritech | Agricultural technology |
| 7 | **Next Robotics** | 🇻🇳 Vietnam | Smart Manufacturing / IoT | Robotics solutions (also in VietLeap) |
| 8 | **N2TP Technology Solutions JSC** | 🇻🇳 Vietnam | Digital Infrastructure | Technology solutions |
| 9 | **esa Inc.** | 🇯🇵 Japan | (not specified) | Japanese startup |
| 10 | **NanoFrontier株式会社** | 🇯🇵 Japan | (not specified) | Japanese deep-tech startup |

**Note:** ~80% Vietnamese, ~20% Japanese. Sectors span healthcare, clean energy & ESG, smart factories, agritech, IoT, and digital infrastructure.

**Sources:**
- [Plug and Play APAC LinkedIn](https://www.linkedin.com/posts/plugandplayapac_nic-scale-x-top-10-startups-activity-7461975751622574080-Eyvx)
- [UNDP Vietnam LinkedIn — Top 40 announcement](https://www.linkedin.com/posts/undp-in-viet-nam_nicscalex-undpvietnam-innovation-activity-7445457779214958592-nQeN)
- [PR Newswire — NIC Scale X Launch](https://www.prnewswire.com/apac/news-releases/vietnam-national-innovation-center-the-embassy-of-japan-undp-mitsubishi-research-institute-and-plug-and-play-launch---nic-scale-x-accelerator-program-302660340.html)

#### 8.4.2 VietLeap AI Accelerator — 10 Startups (2025–2026)

**Program:** Specialized AI accelerator, Oct 2025 – Jan 2026  
**Partners:** JICA, Boston Consulting Group (BCG), Embassy of Japan  
**Model:** "Challenge-Solution" — corporations pose real problems, startups propose AI solutions  
**Result:** 8 MOUs signed at Demo Day (Jan 14, 2026), 45+ 1-on-1 sessions with 20+ corporations

| # | Startup | Focus Area | Description (from public sources) |
|---|---------|------------|-----------------------------------|
| 1 | **Diaflow** | AI Agents / Automation | AI agent platform for workflow automation |
| 2 | **VBrain** | Enterprise AI | AI solutions for business intelligence |
| 3 | **Freshdi** | Supply Chain / Agri | AI-powered supply chain optimization |
| 4 | **Finful** | Fintech / AI | AI financial solutions |
| 5 | **Brain-Life Link** | HealthTech / AI | Neurological health / brain-computer interface |
| 6 | **Next Robotics** | Robotics / AI | Robotics and automation (also in Scale X) |
| 7 | **Pixel ML** | Enterprise AI | Machine learning solutions |
| 8 | **OdaAI** | Enterprise AI | AI for business operations |
| 9 | **MindShift** | HR Tech / AI | Personalized training / HR optimization |
| 10 | **MedCAT** | HealthTech / AI | AI for healthcare / medical diagnostics |

**Corporate partners engaged:** EVN, Heineken Vietnam, Cốc Cốc, VinVentures, and 20+ others  
**Mentors:** 26+ experts from Vietnam, Japan, Australia, Thailand, and USA

**Sources:**
- [VnExpress — 9 AI startups at Demo Day](https://vnexpress.net/9-startup-ai-viet-trinh-dien-giai-phap-truoc-doanh-nghiep-nhat-5005787.html)
- [VnExpress — VietLeap Business Matching Day](https://vnexpress.net/ket-noi-de-startup-ai-giai-bai-toan-cua-doanh-nghiep-lon-4992796.html)
- [VOV World — VietLeap Demo Day](https://vovworld.vn/news/vietleap-demo-day-marks-leap-forward-for-vietnam-japan-ai-innovation-2404631.vov5)
- [VietLeap AI Accelerator official site](https://vietleapai.nic.gov.vn/)

#### 8.4.3 Vietnam Innovation Challenge (VIC) 2024 — Top Solutions

**Program:** Annual innovation challenge chaired by Ministry of Planning and Investment, organized by NIC and Meta  
**Theme (2024):** "Innovation to accelerate the Semiconductor industry and Artificial Intelligence"  
**Scale:** 750+ solutions from 20 countries, 3M+ views/engagements  
**Awards ceremony:** October 1, 2024 (Innovate Vietnam 2024 / NIC 5th anniversary)

##### Top 5 Outstanding Solutions (honored by Prime Minister Phạm Minh Chính)

| # | Organization | Track | Solution |
|---|-------------|-------|----------|
| 1 | **Cadence** (USA) | Semiconductor | Cadence Cerebrus Intelligent Chip Explorer — ML-based chip design automation |
| 2 | **Nexus Photonics** (USA) | Semiconductor | Nexus PIC: lighting up microchips |
| 3 | **FPT** (Vietnam) | AI | AI Innovation for Digital Future |
| 4 | **Viettel** (Vietnam) | AI | Innovation Star awardee |
| 5 | **CHOSEN** (Vietnam) | AI | Sustainable Innovation awardee |

##### Top 15 Outstanding Solutions (startup/SME track only)

| Organization | Track | Description |
|---|---|---|
| **BlockX** | Semiconductor | Startup — semiconductor innovation |
| **TreSemi** | Semiconductor | Startup — semiconductor innovation |
| **MotionsCloud** | AI | Startup — AI solutions |
| **Abivin Vietnam** | AI | Startup — AI logistics/supply chain optimization |
| **AhaFood AI** | AI | Startup — AI for food/agri |
| **enfarm** | AI | Startup — AI agritech (also in Scale X) |

**Note:** Viettel, DSAC, VNPT GenAI, and Phenikaa were also in the Top 15 but represent large corporations / research institutions, not startups.

**Sources:**
- [VIC 2024 official site](https://vic.nic.gov.vn/2024-en)
- [LinkedIn — VIC 2024 Recap](https://www.linkedin.com/pulse/recap-vietnam-innovation-challenge-2024-ceremony-innovate-ynosc)
- [SBBS — VIC 2024 top 5 ceremony](https://sbbs.com.vn/thi-truong/tin-tuc-thi-truong/thach-thuc-doi-moi-sang-tao-viet-nam-2024-vinh-danh-5-giai-phap-tieu-bieu-xuat-sac-ids-e8843db6-42f2-4e7e-91c9-b73fa6b48f19)

#### 8.4.4 Google for Startups Programs (with NIC)

NIC partners with Google on multiple startup support programs:

| Program | Partner | Description | Status |
|---|---|---|---|
| **Google for Startups: Startup Academy Vietnam** | Google + NIC | 5-day intensive training for early-stage tech startups (education, health, agri, finance, gaming, retail) | Launched 2024 |
| **Google for Startups Accelerator: Southeast Asia — Vietnam** | Google + NIC + US Mission | Equity-free accelerator for Seed–Series B AI startups, bootcamp + 12-week mentorship | Launched July 2025 |
| **AI Solutions Lab** | Google + NIC + DSAC (Da Nang) | 46 startups mentored on building/scaling AI solutions with Google tech (Gemini, Vertex AI) | Completed |
| **"Build for the AI Future"** | Google + NIC | Two new programs for 150 Vietnamese startups building GenAI solutions | Announced June 2026 |

**Known Vietnamese participant (Google for Startups Accelerator 2024):** **Doctranslate.io** — AI translation startup, selected as 1 of 19 startups in the Southeast Asia cohort.

**Sources:**
- [Google for Startups Accelerator: SE Asia](https://startup.google.com/programs/accelerator/southeast-asia/)
- [Hanoi Times — Google NIC partnership June 2026](https://hanoitimes.vn/google-nic-empower-vietnamese-startups.739067.html)
- [VTV — Doctranslate.io Google Accelerator](https://vtv.vn/cong-nghe/startup-ai-viet-lot-vao-top-google-for-startups-accelerator-2024-20241009191233297.htm)
- [Google for Startups, Startup Academy Vietnam](https://gfs.nic.gov.vn/)

#### 8.4.5 Full Consolidated Startup List

All uniquely identifiable startups publicly supported by NIC (deduplicated across programs):

| # | Startup | Programs | Sector |
|---|---------|----------|--------|
| 1 | **Alternō** | Scale X | Clean Energy / ESG |
| 2 | **STAR GLOBAL** | Scale X | Digital Twin / IoT |
| 3 | **enfarm Agritech** | Scale X, VIC 2024 | Agritech / AI |
| 4 | **VOX Cool** | Scale X | Clean Energy |
| 5 | **Rongbient Biotech** | Scale X | Healthcare / Biotech |
| 6 | **SHOES AGTECH LTD** | Scale X | Agritech |
| 7 | **Next Robotics** | Scale X, VietLeap | Robotics / AI / Smart Manufacturing |
| 8 | **N2TP Technology Solutions JSC** | Scale X | Digital Infrastructure |
| 9 | **esa Inc.** 🇯🇵 | Scale X | (unspecified) |
| 10 | **NanoFrontier株式会社** 🇯🇵 | Scale X | (unspecified) |
| 11 | **Diaflow** | VietLeap | AI Agents / Automation |
| 12 | **VBrain** | VietLeap | Enterprise AI |
| 13 | **Freshdi** | VietLeap | Supply Chain / AI |
| 14 | **Finful** | VietLeap | Fintech / AI |
| 15 | **Brain-Life Link** | VietLeap | HealthTech / AI |
| 16 | **Pixel ML** | VietLeap | Enterprise AI |
| 17 | **OdaAI** | VietLeap | Enterprise AI |
| 18 | **MindShift** | VietLeap | HR Tech / AI |
| 19 | **MedCAT** | VietLeap | HealthTech / AI |
| 20 | **BlockX** | VIC 2024 | Semiconductor |
| 21 | **TreSemi** | VIC 2024 | Semiconductor |
| 22 | **MotionsCloud** | VIC 2024 | AI |
| 23 | **Abivin Vietnam** | VIC 2024 | AI / Logistics |
| 24 | **AhaFood AI** | VIC 2024 | AI / FoodTech |
| 25 | **Doctranslate.io** | Google for Startups (w/ NIC) | AI / Translation |

**Total: 25 unique startups** (including 2 Japanese startups from Scale X)

**Caveats:**
- The full Top 40 and Top 20 lists for NIC Scale X are not publicly published by name — only the final Top 10 is
- Google for Startups cohorts have many participants; only Doctranslate.io was explicitly identifiable in public reporting as a Vietnamese participant
- NIC may support startups through other channels (direct partnership, workspace at NIC facilities, investment facilitation) not captured here
- Descriptions for some Scale X startups are inferred from limited public data; verify with NIC directly for details

---

## 9. Recommended Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js / React)                │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐ │
│  │ Startup  │  │ Partner  │  │ Match    │  │ Meeting    │ │
│  │ Onboard  │  │ Browse   │  │ Results  │  │ Scheduler  │ │
│  │ (Form +  │  │ (Filter  │  │ (Ranked  │  │ (Calendar  │ │
│  │  Upload) │  │  + Grid) │  │  Cards)  │  │  Picker)   │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
└───────┼─────────────┼─────────────┼───────────────┼────────┘
        │             │             │               │
┌───────┼─────────────┼─────────────┼───────────────┼────────┐
│       │       BACKEND (FastAPI / Python)           │        │
│       │                                            │        │
│  ┌────▼────────┐  ┌──────────────┐  ┌──────────────▼─────┐ │
│  │ Profile     │  │ Match Engine │  │ Outreach Engine    │ │
│  │ Extractor   │  │              │  │                    │ │
│  │ • LLM parse │  │ Stage 1:     │  │ • Email draft      │ │
│  │ • Structured│  │   Rule filter│  │   (LLM + match     │ │
│  │   JSON      │  │ Stage 2:     │  │    rationale)      │ │
│  │ • Bilingual │  │   SBERT score│  │ • Gmail send       │ │
│  │   normalize │  │ Stage 3:     │  │ • Follow-up seq    │ │
│  │             │  │   LLM explain│  │ • Reply detection  │ │
│  └─────────────┘  └──────┬───────┘  └────────────────────┘ │
│                          │                                  │
│  ┌───────────────────────▼──────────────────────────────┐  │
│  │              Data Layer (PostgreSQL + pgvector)       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Startups │  │ Partners │  │ Matches  │           │  │
│  │  │ (profile │  │ (investor│  │ (scores, │           │  │
│  │  │ +embed)  │  │  +corp   │  │  status, │           │  │
│  │  │          │  │  +uni    │  │  history)│           │  │
│  │  │          │  │  +embed) │  │          │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Technology Stack Recommendation

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | Next.js 14 + TypeScript + TailwindCSS | Fast iteration, SSR, NIC-friendly |
| **Backend** | FastAPI (Python) | Async, easy LLM integration, fast dev |
| **Database** | PostgreSQL + pgvector | Store profiles + embeddings in same DB |
| **Embeddings** | `keepitreal/vietnamese-sbert` | Vietnamese-optimized SBERT |
| **LLM** | Gemini 2.5 Flash or GPT-4o-mini | Profile extraction + email generation + match explanation |
| **Calendar** | Google Calendar API (simple) or Nylas (production) | Meeting scheduling |
| **Email** | Gmail API (OAuth) | Send from NIC staff inbox |
| **Auth** | Supabase Auth or NextAuth.js | Simple auth for hackathon |
| **Deploy** | Vercel (frontend) + Railway/Render (backend) | Quick deploy |
| **Vector Search** | pgvector `<=>` cosine operator | In-DB similarity search |

---

## 10. Data Model (Minimum Viable)

```sql
-- Core tables
CREATE TABLE startups (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    description_vi TEXT,
    description_en TEXT,
    sectors TEXT[],           -- ['agritech', 'ai']
    stage VARCHAR(50),        -- 'seed', 'series_a', etc.
    location VARCHAR(255),
    founded_year INT,
    team_size INT,
    funding_raised VARCHAR(100),
    looking_for TEXT[],       -- ['funding', 'corporate_pilot', 'rd']
    contact_email VARCHAR(255),
    embedding VECTOR(384),    -- SBERT embedding
    created_at TIMESTAMP
);

CREATE TABLE partners (
    id UUID PRIMARY KEY,
    name VARCHAR(255),
    type VARCHAR(50),         -- 'investor', 'corporation', 'university', 'research_institution'
    description_en TEXT,
    description_vi TEXT,
    sectors TEXT[],
    investment_stage VARCHAR(50),  -- for investors
    check_size_range VARCHAR(50),   -- for investors
    innovation_areas TEXT[],        -- for corporations
    research_domains TEXT[],        -- for universities
    location VARCHAR(255),
    contact_email VARCHAR(255),
    embedding VECTOR(384),
    created_at TIMESTAMP
);

CREATE TABLE matches (
    id UUID PRIMARY KEY,
    startup_id UUID REFERENCES startups(id),
    partner_id UUID REFERENCES partners(id),
    score FLOAT,              -- 0-100 match score
    match_rationale TEXT,      -- LLM-generated explanation
    status VARCHAR(50),       -- 'suggested', 'emailed', 'meeting_scheduled', 'completed'
    email_draft TEXT,
    email_sent_at TIMESTAMP,
    meeting_scheduled_at TIMESTAMP,
    created_at TIMESTAMP
);

-- Vector similarity index
CREATE INDEX ON startups USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON partners USING ivfflat (embedding vector_cosine_ops);
```

---

## 11. Matching Pipeline Implementation

```python
# match_engine.py — Complete matching pipeline for NIC Deal-flow Matchmaker

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import List, Dict

class MatchEngine:
    def __init__(self):
        # Vietnamese-optimized SBERT
        self.model = SentenceTransformer('keepitreal/vietnamese-sbert')
        self.sector_taxonomy = self._load_taxonomy()
    
    def stage_1_filter(self, startup: Dict, partners: List[Dict]) -> List[Dict]:
        """Rule-based coarse filtering"""
        filtered = []
        for partner in partners:
            # Sector overlap check
            sector_overlap = set(startup['sectors']) & set(partner.get('sectors', []))
            if not sector_overlap:
                continue
            
            # Stage alignment (for investors)
            if partner['type'] == 'investor':
                if startup['stage'] not in partner.get('investment_stage', []):
                    continue
            
            # Looking-for match
            if 'funding' in startup.get('looking_for', []) and partner['type'] != 'investor':
                continue  # Startup wants funding but partner isn't investor
                
            filtered.append(partner)
        return filtered
    
    def stage_2_semantic_score(self, startup: Dict, partners: List[Dict]) -> List[Dict]:
        """SBERT semantic similarity scoring"""
        startup_text = f"{startup['description_vi']} {startup.get('description_en', '')}"
        startup_emb = self.model.encode([startup_text])[0]
        
        results = []
        for partner in partners:
            partner_text = f"{partner['description_vi']} {partner.get('description_en', '')}"
            partner_emb = self.model.encode([partner_text])[0]
            
            similarity = float(cosine_similarity([startup_emb], [partner_emb])[0][0])
            
            # Bonus for sector overlap
            sector_overlap = len(
                set(startup['sectors']) & set(partner.get('sectors', []))
            ) / max(len(startup['sectors']), 1)
            
            # Composite score
            score = 0.6 * similarity + 0.4 * sector_overlap
            
            results.append({
                **partner,
                'similarity': round(similarity, 3),
                'sector_overlap': round(sector_overlap, 3),
                'score': round(score * 100, 1)
            })
        
        return sorted(results, key=lambda x: x['score'], reverse=True)
    
    def stage_3_explain(self, startup: Dict, partner: Dict, client) -> str:
        """LLM-generated match explanation"""
        prompt = f"""Explain in 2-3 sentences why this startup and {partner['type']} 
are a good match. Be specific about their alignment.

Startup: {startup['name']} — {startup['description_en']}
Partner: {partner['name']} — {partner['description_en']}
Sectors: startup {startup['sectors']}, partner {partner.get('sectors', [])}
Match score: {partner.get('score')}/100

Explanation:"""
        
        return client.complete(prompt)
    
    def match(self, startup: Dict, all_partners: List[Dict], client=None) -> List[Dict]:
        """Full matching pipeline"""
        # Stage 1: Coarse filter
        candidates = self.stage_1_filter(startup, all_partners)
        
        # Stage 2: Semantic scoring
        scored = self.stage_2_semantic_score(startup, candidates)
        
        # Stage 3: LLM explanation (optional)
        if client:
            for match in scored[:5]:  # Top 5 only
                match['rationale'] = self.stage_3_explain(startup, match, client)
        
        return scored
```

---

## 12. Email Generation Pipeline

```python
# outreach_engine.py

OUTREACH_PROMPT_EN = """You are a professional outreach coordinator at Vietnam National Innovation Center (NIC).

Write a personalized outreach email to connect a startup with a potential partner.

STARTUP:
- Name: {startup_name}
- Description: {startup_description}
- Sector: {startup_sectors}
- Looking for: {startup_needs}

PARTNER:
- Name: {partner_name}
- Type: {partner_type}
- Description: {partner_description}

MATCH RATIONALE: {match_rationale}

MEETING OPTIONS:
{meeting_slots}

Write an email that:
1. Introduces NIC and the purpose of the connection
2. Explains why this specific match makes sense (use the rationale)
3. Proposes 2-3 meeting times
4. Has a clear call to action
5. Is professional but warm, under 200 words
6. Is in {language} language

Email:"""

def generate_outreach_email(startup, partner, rationale, meeting_slots, llm_client):
    """Generate personalized outreach email"""
    prompt = OUTREACH_PROMPT_EN.format(
        startup_name=startup['name'],
        startup_description=startup['description_en'],
        startup_sectors=', '.join(startup['sectors']),
        startup_needs=', '.join(startup.get('looking_for', [])),
        partner_name=partner['name'],
        partner_type=partner['type'],
        partner_description=partner['description_en'],
        match_rationale=rationale,
        meeting_slots='\n'.join(meeting_slots),
        language='Vietnamese' if partner.get('location', '').startswith('Vietnam') else 'English'
    )
    return llm_client.complete(prompt)
```

---

## 13. Latency & Performance

For a demo with 50 entities and SBERT matching:

| Step | Time |
|---|---|
| Profile extraction (LLM, startup) | 1-3s (one-time on profile creation) |
| Embedding computation (per entity) | 50ms (one-time) |
| Stage 1 filtering (rule-based) | < 10ms |
| Stage 2 semantic scoring (vector DB) | < 50ms for 50 entities |
| Stage 3 LLM explanation (per top match) | 1-2s (Gemini Flash) |
| Email generation (per match) | 1-2s |
| **Total match time** | **~2-4 seconds** |

For pre-computed embeddings (stored in DB): **< 100ms** for top matches.

---

## 14. Differentiation & Winning Strategies

### What makes this stand out from existing platforms:

1. **Multi-stakeholder, not just investors** — No existing platform properly handles corporations, universities, and research institutions alongside investors in a unified matchmaking system.

2. **NIC as orchestrator** — NIC's government mandate and trust position means the platform isn't just a marketplace; it's a **curated innovation pipeline** backed by a national institution.

3. **Vietnamese-first** — Every competitor is English-first. Vietnamese SBERT embeddings, bilingual profiles, and Vietnamese-language outreach give NIC a unique moat.

4. **End-to-end workflow** — From profile → match → personalized email → scheduled meeting. Most competitors do one piece well; few do the full pipeline.

5. **Knowledge graph potential** — The SocioLink approach can be adapted to model the Vietnamese innovation network: startups connected to universities via alumni, corporations via pilots, investors via portfolio.

### Bonus features for demo points:

- **Match analytics dashboard** — Show pipeline metrics (matches made, emails sent, meetings booked, deals closed)
- **Multi-criteria search** — Filter partners by type, sector, stage, location
- **Batch matching** — Upload list of startups, get ranked matches for all
- **Email tracking** — Open/click/reply rates per match
- **Meeting prep brief** — Auto-generate 1-page brief for NIC staff before each intro meeting

---

## 15. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Cold start** — No real data at launch | Seed with curated profiles from NIC's existing programs; offer manual profile creation |
| **Match quality** — Poor matches erode trust | Multi-signal scoring with human-override; NIC staff can approve/reject matches |
| **Data freshness** — Startup profiles become stale | Periodic re-extraction; status flags (actively fundraising? still operating?) |
| **Email deliverability** — Outreach lands in spam | Send from NIC's own domain; warm up domain; personalized, non-spammy content |
| **Vietnamese NLP quality** — SBERT/LLM may underperform on Vietnamese | Use Vietnamese-specific models (`keepitreal/vietnamese-sbert`); bilingual fallback |
| **Privacy** — Sensitive startup financials | Profile extraction stores only what startup explicitly submits; no scraping |

---

## 16. Quick-Start: 48-Hour Hackathon Plan

### Hour 0-4: Setup + Data
- Scaffold Next.js + FastAPI project
- Create 30-50 seed profiles (JSON)
- Set up PostgreSQL + pgvector

### Hour 4-12: Core Matching
- Implement profile extraction (LLM prompt)
- Implement SBERT embedding + vector storage
- Implement 3-stage matching pipeline
- Build match results UI

### Hour 12-24: Pipeline Features
- Implement email generation (LLM prompt)
- Integrate Google Calendar API for meeting slots
- Build email draft preview UI
- Build meeting scheduler UI

### Hour 24-36: Polish
- Dashboard with match metrics
- Partner browsing + filtering
- Vietnamese language support
- Responsive/mobile UI

### Hour 36-48: Deploy + Demo
- Deploy to Vercel + Railway
- Prepare demo flow with real-looking data
- Record demo video
- Prepare pitch deck

---

## 17. Sources

### Competitive Platforms
1. **VCMatch** — https://vcmatch.ai/ (AI investor matching with 4,100+ investors)
2. **OpenStars** — https://openstars.ai/ (50,000+ founders, 15,000+ VCs)
3. **Founder Relay** — https://www.founderrelay.com/ (Public-signal matching, 149K+ investor records)
4. **NUVC** — https://nuvc.ai/ (VC intelligence, MCP-native, 7,800+ investors, SBERT embeddings)
5. **Venturepunks** — https://venturepunks.ai/ (Multi-signal ensemble scoring with transparency)
6. **Bridge** — https://bridgematches.com/ (Corporate innovation ↔ startup matching)
7. **Nesha** — https://nesha.ai/ (Complementarity-first partner intelligence)
8. **Refership** — https://refership.com/ (AI Chief BD Officer)
9. **Gearbox.AI** — https://www.gearbox.ai/v-index (Open innovation datalake with ML matching)
10. **ProRaise** — https://proraise.app/product/outreach (Personalized investor email automation)
11. **Raisi** — https://www.raisi.ai/ (Signal-driven investor matching + automated outreach)
12. **DeckVue** — https://deckvue.ai/ (LLM pitch deck extraction — 12 structured sections)
13. **SupScreen** — https://www.supscreen.com/ (AI startup analysis with risk signals)

### Academic Research
14. **SocioLink** — Xu, Chen & Zhao (2023). "SocioLink: Leveraging Relational Information in Knowledge Graphs for Startup Recommendations." *Journal of Management Information Systems*, 40(2), 655-682. https://doi.org/10.1080/07421222.2023.2196771

### Open Source Implementations
15. **FoundMatch** — https://github.com/Arjo216/Found-Match (Next.js + FastAPI + LightGCN/SBERT + pgvector + LangGraph)
16. **Investor-Recommender** — https://github.com/sartaj04/Investor-Recommender (GNN-based: GraphSAGE, GATv2 + Django + React)
17. **IEC-2B-AI-Project** — https://github.com/bxjyj/IEC-2B-AI-Project (Random Forest + OpenAI embeddings + Claude)
18. **Matchpoint-AI** — https://github.com/mnk-nasir/Matchpoint-AI (JavaScript/Python stack)

### Data APIs & Sources
19. **Crunchbase API** — https://data.crunchbase.com/ (610+ endpoints, LLM-powered investor insights)
20. **StartupHub.ai** — https://www.startuphub.ai/api-docs (Free tier, REST + MCP API, AI startup data)
21. **FundedAPI** — https://fundedapi.com/ (Free tier, 100 calls/day, JSON + webhooks)
22. **OpenPitch** — https://github.com/Avierovich/openpitch (Open-source PitchBook alternative, MCP-native)
23. **StartupGraph** — https://firstpartyhq.com/startupgraph (Open source, 8,400+ companies)

### Calendar & Email APIs
24. **Nylas Calendar API** — https://developer.nylas.com/docs/v3/calendar/ (Multi-provider availability)
25. **Google Calendar API** — https://developers.google.com/calendar (Direct GCal integration)
26. **Gmail API** — https://developers.google.com/gmail/api (Send from user inbox)

### Vietnam Ecosystem
27. **NIC** — https://nic.gov.vn/ (National Innovation Center)
28. **startup.gov.vn** — http://startup.gov.vn/ (National startup portal)
29. **Viet.io** — https://viet.io/ (Open-source Vietnam startup ecosystem map)
30. **BSSC Portal** — https://congthongtin.bssc.vn/ (1,000+ startups, investors)
31. **NSSC** — https://nssc.gov.vn/ (National startup support center, ecosystem reports)
32. **NIC Scale X** — https://vnic.nic.gov.vn/ (NIC deep-tech accelerator)
33. **VietLeap AI Accelerator** — https://vietleapai.nic.gov.vn/ (AI startup accelerator)

### Vietnamese NLP
34. **`keepitreal/vietnamese-sbert`** — Vietnamese-optimized Sentence-BERT on HuggingFace
