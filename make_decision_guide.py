import os
from docx_helper import (
    create_styled_document, add_title_page, add_custom_heading,
    add_callout, add_styled_table, Inches
)

AUTHORS = [
    {"name": "Shashi Varun Reddy", "id": "40510101", "role": "Team Leader & Project Manager (Coordinator / Implementer)"},
    {"name": "Alexander Wright", "id": "40510102", "role": "Lead Backend & Security Engineer (Shaper / Monitor Evaluator)"},
    {"name": "Priya Sharma", "id": "40510103", "role": "Lead AI & Data Intelligence Engineer (Plant / Specialist)"},
    {"name": "Liam Davies", "id": "40510104", "role": "Lead Frontend & UX Engineer (Resource Investigator / Completer Finisher)"},
    {"name": "Elena Rostova", "id": "40510105", "role": "Lead QA & Test Automation Engineer (Monitor Evaluator / Completer Finisher)"}
]

def generate_decision_guide(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    doc_path = os.path.join(output_dir, "DECISION_GUIDE_AND_ALLOCATIONS.docx")
    md_path = os.path.join(output_dir, "DECISION_GUIDE_AND_ALLOCATIONS.md")
    
    # 1. Create DOCX
    doc = create_styled_document()
    add_title_page(
        doc,
        module_code="SOC11103",
        module_title="Postgraduate Group Project",
        project_title="SmartGrocer: Project Decision Guide & Team Allocations",
        subtitle="Workstream Division, Belbin Team Roles, Technical Choices & Submission Blueprint",
        authors=AUTHORS,
        institution="School of Computing, Edinburgh Napier University",
        date_str="Academic Year 2026/2027"
    )
    
    add_custom_heading(doc, "1. Executive Summary & Purpose", level=1)
    doc.add_paragraph(
        "This document provides the definitive architectural blueprint, governance structure, and role allocations "
        "for the SmartGrocer project under module SOC11103 (Postgraduate Group Project). Designed for a 5-person engineering "
        "team, it establishes explicit boundaries, responsibilities, and evidence trails required for academic assessment, "
        "group report compilation, and individual critical reflective statements."
    )
    
    add_callout(
        doc,
        "Guidance for Submission:\n"
        "• This document serves as the master decision log for group coordination.\n"
        "• Each team member should cross-reference this guide when writing their Individual Critical Reflective Statement.\n"
        "• Student names and matriculation numbers can be customized as needed prior to final submission.",
        title="ACADEMIC SUBMISSION NOTICE"
    )
    
    add_custom_heading(doc, "2. Team Allocations & Belbin Role Distribution", level=1)
    doc.add_paragraph(
        "To satisfy the postgraduate learning outcomes specified in Lectures 1 and 2, team roles were formed using Belbin's "
        "Team Role Theory and DSDM project governance to guarantee a balanced distribution of management, analytical, "
        "creative, and execution capabilities across the 5 members."
    )
    
    team_headers = ["Member & Matriculation", "Assigned Project Role", "Belbin Team Role", "Primary Technical Workstream", "Deliverables Owned"]
    team_data = [
        [
            "Shashi Varun Reddy\n(ID: 40510101)",
            "Project Manager &\nScrum Master",
            "Coordinator /\nImplementer",
            "DSDM Timeboxing, Scrum Sprints, PRINCE2 Risk & Issue Logs, CI/CD, AWS EC2 Cloud Infrastructure",
            "Gantt Schedule, Meeting Minutes (Weeks 1-10), Risk & Issue Logs, Deployment Pipeline"
        ],
        [
            "Alexander Wright\n(ID: 40510102)",
            "Lead Backend &\nSecurity Engineer",
            "Shaper /\nMonitor Evaluator",
            "Node.js/Express REST API Gateway, PostgreSQL Schema, Prisma ORM, BOLA Remediation, JWT Auth",
            "Backend API codebase, Database ERD, BOLA Security Patches, API Swagger Specs"
        ],
        [
            "Priya Sharma\n(ID: 40510103)",
            "Lead AI & Data\nIntelligence Engineer",
            "Plant /\nSpecialist",
            "Python 3.12 FastAPI microservice, Google Gemini 2.5 Flash, Waste Risk Analyzer, Replenishment Radar",
            "AI service endpoints, OpenFoodFacts UK 1k catalog pipeline, Zero-Waste Chef algorithm"
        ],
        [
            "Liam Davies\n(ID: 40510104)",
            "Lead Frontend &\nUX Engineer",
            "Resource Investigator /\nCompleter Finisher",
            "React Native / Expo Mobile App, Next.js 15 Web UI, Tailwind CSS, Live Bill Predictor, Expiry Badges",
            "Mobile App & Web App frontends, Responsive UI wireframes, 1-Click test user auth drawer"
        ],
        [
            "Elena Rostova\n(ID: 40510105)",
            "Lead QA & Test\nAutomation Engineer",
            "Monitor Evaluator /\nCompleter Finisher",
            "Playwright + Cucumber BDD E2E Test Suite, 100% Surface Coverage Ledger, HTML Dashboard Reporting",
            "E2E test suite (24 scenarios, 101 steps), cucumber-html-report, security verification tests"
        ]
    ]
    add_styled_table(doc, team_headers, team_data, [Inches(1.5), Inches(1.2), Inches(1.1), Inches(1.5), Inches(1.2)])
    
    add_custom_heading(doc, "3. Key Architectural & Technological Decisions", level=1)
    
    tech_headers = ["Domain", "Selected Technology", "Alternative Considered", "Justification & Academic Rationale"]
    tech_data = [
        [
            "Mobile Frontend",
            "React Native (Expo SDK 52) with TypeScript",
            "Native Swift / Kotlin or Flutter",
            "Permitted rapid cross-platform deployment, unified TypeScript codebase with web, and rich device camera integration for barcode scanning."
        ],
        [
            "Web Frontend",
            "Next.js 15 (App Router) + Tailwind CSS",
            "Vite SPA / Plain React",
            "Server components for immediate page loads, full desktop/mobile responsiveness, and exact feature parity with the mobile client."
        ],
        [
            "Backend API",
            "Node.js & Express with Prisma ORM",
            "Python Django / Spring Boot",
            "Asynchronous non-blocking I/O handling high concurrency, lightweight API gateway routing, and type-safe relational database queries."
        ],
        [
            "Database",
            "PostgreSQL Relational DB",
            "MongoDB / NoSQL",
            "Strict referential integrity required for financial tracking, multi-tenant shopping lists, foreign key cascade rules, and BOLA security isolation."
        ],
        [
            "AI Microservice",
            "Python 3.12 FastAPI + Google Gemini 2.5 Flash",
            "OpenAI GPT-4o / LangChain",
            "High execution speed of FastAPI ASGI, native numerical libraries (NumPy) for waste heuristics, and Gemini multimodal reasoning for recipes."
        ],
        [
            "E2E Testing & QA",
            "Playwright + Cucumber (BDD) with TS",
            "Cypress / Selenium / Jest alone",
            "Provides readable Gherkin scenarios for non-technical stakeholders, native APIRequestContext for backend testing, and headless chromium for web journeys."
        ],
        [
            "Cloud Hosting",
            "AWS EC2 Linux (Docker) + Vercel",
            "Heroku / Local only",
            "Guarantees a permanent live environment for external supervision grading, Docker isolation for backend/AI, and automated CDN caching via Vercel."
        ]
    ]
    add_styled_table(doc, tech_headers, tech_data, [Inches(1.2), Inches(1.5), Inches(1.3), Inches(2.5)])
    
    add_custom_heading(doc, "4. Development Methodology & Governance (DSDM + Scrum)", level=1)
    doc.add_paragraph(
        "In accordance with Lecture 4 guidelines on Rapid Application Development (RAD) and DSDM (Dynamic Systems Development Method), "
        "the team adopted an iterative timeboxed framework with 2-week prototyping cycles. Requirements were managed strictly under "
        "MoSCoW rules to ensure that Must Have and Should Have features were completed before timebox deadlines."
    )
    
    doc.add_paragraph(
        "• Must Have: User authentication, OpenFoodFacts product catalog lookup, multi-list shopping management, live bill estimation, pantry inventory tracking with expiry countdown, and BOLA security boundary enforcement.\n"
        "• Should Have: AI-powered Replenishment Radar, Waste Risk predictive score, Chef Gemini zero-waste meal recommendations, and 1-click test user switching.\n"
        "• Could Have: Interactive web dashboard (Next.js), floating AI chat assistant drawer, and automated HTML test execution reports.\n"
        "• Won't Have (Deferred): Direct automated payment gateway integration and supermarket home delivery booking API."
    )
    
    add_custom_heading(doc, "5. Assessment Deliverables & Weighting Breakdown", level=1)
    doc.add_paragraph(
        "As outlined in Lecture 1 (Slide 5), the module assessment consists of two major submissions:"
    )
    doc.add_paragraph(
        "1. Part 1 (40%): Background research, critical review of existing market systems, user requirements, system specification, and Part 1 individual reflective statements.\n"
        "2. Part 2 (60%): Final working prototype demonstration, comprehensive group evaluation report, full meeting minutes, project management evidence (Gantt, Risk/Issue logs), and Part 2 individual reflective statements."
    )
    
    doc.save(doc_path)
    
    # 2. Create MD
    md_content = f"""# SmartGrocer: Project Decision Guide & Team Allocations
**Module:** SOC11103 Postgraduate Group Project | **Institution:** School of Computing, Edinburgh Napier University

---

## 1. Team Allocations & Belbin Role Distribution

| Member & Matriculation | Assigned Project Role | Belbin Role | Primary Technical Workstream | Key Deliverables |
|---|---|---|---|---|
| **Shashi Varun Reddy** (40510101) | Project Manager & Scrum Master | Coordinator / Implementer | DSDM Timeboxing, Scrum Sprints, PRINCE2 Risk & Issue Logs, CI/CD, AWS EC2 Cloud Infrastructure | Gantt Schedule, Meeting Minutes (Weeks 1-10), Risk/Issue Logs, Deployment Pipeline |
| **Alexander Wright** (40510102) | Lead Backend & Security Engineer | Shaper / Monitor Evaluator | Node.js/Express REST API Gateway, PostgreSQL Schema, Prisma ORM, BOLA Remediation, JWT Auth | Backend API codebase, Database ERD, BOLA Security Patches, API Swagger Specs |
| **Priya Sharma** (40510103) | Lead AI & Data Intelligence Engineer | Plant / Specialist | Python 3.12 FastAPI microservice, Google Gemini 2.5 Flash, Waste Risk Analyzer, Replenishment Radar | AI service endpoints, OpenFoodFacts UK 1k catalog pipeline, Zero-Waste Chef algorithm |
| **Liam Davies** (40510104) | Lead Frontend & UX Engineer | Resource Investigator / Completer Finisher | React Native / Expo Mobile App, Next.js 15 Web UI, Tailwind CSS, Live Bill Predictor, Expiry Badges | Mobile App & Web App frontends, Responsive UI wireframes, 1-Click test user auth drawer |
| **Elena Rostova** (40510105) | Lead QA & Test Automation Engineer | Monitor Evaluator / Completer Finisher | Playwright + Cucumber BDD E2E Test Suite, 100% Surface Coverage Ledger, HTML Dashboard Reporting | E2E test suite (24 scenarios, 101 steps), cucumber-html-report, security verification tests |

---

## 2. Key Architectural Decisions

1. **Mobile Frontend:** React Native (Expo SDK 52) with TypeScript for rapid cross-platform execution and camera barcode scanning.
2. **Web Frontend:** Next.js 15 App Router + Tailwind CSS providing responsive mobile/desktop parity and instant page loads.
3. **Backend API:** Node.js Express Gateway with Prisma ORM for asynchronous non-blocking throughput and type-safe relational data mapping.
4. **Database:** PostgreSQL for ACID compliance, referential integrity across multi-tenant shopping lists, and BOLA security isolation.
5. **AI Microservice:** Python 3.12 FastAPI + Google Gemini 2.5 Flash for high-speed numerical heuristics and generative zero-waste culinary intelligence.
6. **E2E Testing:** Playwright + Cucumber BDD with 24 feature scenarios, 101 passing steps, and `cucumber-html-reporter` visual dashboard.
7. **Cloud Infrastructure:** AWS EC2 Linux running Docker Compose with PostgreSQL, Node.js API, and Python AI containers, paired with Vercel for web frontend hosting.

---

## 3. Development Methodology & Governance
- **DSDM / Agile:** 2-week timeboxed prototyping cycles (Lecture 4).
- **MoSCoW Prioritization:** Must-Have core flows (Auth, Catalog, Lists, Bill Predictor, Pantry Expiry, BOLA) baselined early.
- **PRINCE2 Controls:** Risk Log, Issue Log, Configuration Baselining via Git branches and pull requests.
"""
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
        
    print(f"Generated Decision Guide: {doc_path} and {md_path}")

if __name__ == "__main__":
    generate_decision_guide(r"S:\Shashi\SmartGrocer\submission_docs")

