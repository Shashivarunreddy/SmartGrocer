import os
from docx_helper import (
    create_styled_document, add_title_page, add_custom_heading,
    add_callout, add_styled_table, Inches
)

REFLECTIONS = [
    {
        "num": 1,
        "name": "Shashi Varun Reddy",
        "id": "40510101",
        "role": "Team Leader, Project Manager & DevOps Engineer",
        "belbin": "Coordinator / Implementer",
        "filename": "Reflective_Statement_1_Shashi_Varun_Reddy_Project_Manager",
        "milestones": [
            "Project charter, repository setup, Git branching flow, and DSDM 2-week timebox schedules.",
            "Coordinating weekly supervisor agendas, chairing team meetings, and maintaining PRINCE2 Risk & Issue Logs.",
            "Deploying AWS EC2 Ubuntu production server running Docker Compose (PostgreSQL, Node API, FastAPI).",
            "Orchestrating cross-functional integration between mobile, web, backend, and AI microservices."
        ],
        "challenges": "Managing scope creep during Sprint 2 when AI features threatened core catalogue delivery; resolving merge conflicts across web and mobile shared TypeScript types; ensuring all team members adhered to sprint deadlines.",
        "description": (
            "As Team Leader and Project Manager for SmartGrocer, my core responsibilities spanned technical coordination, "
            "methodology governance, and production infrastructure deployment. In the initial Forming stage (Tuckman, 1965), "
            "I established our GitHub organization, enforced branch protection policies, and constructed our initial 10-week "
            "Gantt schedule in accordance with DSDM timeboxing principles (Lecture 4). Additionally, I took hands-on ownership "
            "of deploying our Docker Compose stack to an AWS EC2 instance (65.0.242.245) and setting up our Next.js Vercel "
            "pipeline, ensuring our team had continuous access to live staging environments for rapid evaluation."
        ),
        "feelings": (
            "At the outset, I felt significant pressure balancing management responsibilities with hands-on infrastructure tasks. "
            "During Sprint 2 (the Storming phase), anxiety peaked when backend schema changes broke mobile mock screens. "
            "However, as we established daily standups and baselined our API contract using Swagger, my confidence grew, "
            "and I felt immense satisfaction seeing our 5-person team perform smoothly in unison."
        ),
        "evaluation": (
            "Positively, my rigorous adherence to meeting minutes and PRINCE2 risk logging ensured zero missed supervisor deadlines, "
            "and our live AWS staging environment prevented the classic 'works on my machine' syndrome. On the negative side, "
            "I initially underestimated the time required to synchronize data structures between the Python AI microservice and "
            "the Node.js backend, which forced us to spend extra weekend hours during Sprint 3."
        ),
        "analysis": (
            "Reflecting on Belbin's (2010) team role theory, my natural inclination as a Coordinator enabled me to clarify team goals "
            "and delegate tasks according to individual strengths. However, as an Implementer, I occasionally took on too much "
            "technical workload myself rather than delegating. Applying Tuckman's (1965) model of group development helped me "
            "recognize our early friction as a natural Storming transition toward Norming. Utilizing DSDM MoSCoW prioritization "
            "proved crucial: when Gemini AI rate limits surfaced, we immediately deferred automated checkout booking and focused "
            "on Must-Have pantry synchronization."
        ),
        "conclusion": (
            "I learned that proactive communication and strict contract-first API design are far more effective than reactive debugging. "
            "If I were to undertake this project again, I would institute automated contract testing (such as Pact) earlier in Sprint 1 "
            "to completely eliminate cross-tier integration friction."
        ),
        "action_plan": (
            "In future commercial projects, I will pursue formal Scrum Master and PRINCE2 Agile certification, enhance my automated "
            "monitoring skills using Prometheus/Grafana, and continue cultivating empathetic leadership to empower autonomous engineering teams."
        )
    },
    {
        "num": 2,
        "name": "Alexander Wright",
        "id": "40510102",
        "role": "Lead Backend & Security Engineer",
        "belbin": "Shaper / Monitor Evaluator",
        "filename": "Reflective_Statement_2_Alexander_Wright_Backend_Security",
        "milestones": [
            "Architected Node.js/Express REST API gateway with TypeScript and PostgreSQL relational database schema.",
            "Engineered Prisma ORM data models, migration scripts, and seeders for 1,000 UK OpenFoodFacts products.",
            "Remediated critical Broken Object Level Authorization (BOLA / IDOR) vulnerabilities across shopping list endpoints.",
            "Implemented JWT bearer token authentication, bcrypt password hashing, and input validation guards."
        ],
        "challenges": "Resolving a severe BOLA vulnerability where users could manipulate other tenants' shopping lists; structuring relational foreign keys with cascade constraints for complex multi-item shopping runs.",
        "description": (
            "My primary responsibility was architecting and maintaining the core backend REST API gateway and PostgreSQL relational "
            "database. I designed 14 RESTful endpoints covering product catalogs, shopping lists, pantry inventories, and analytics. "
            "During a rigorous security review, I identified a critical Broken Object Level Authorization (BOLA) vulnerability "
            "(OWASP API1:2023) where an authenticated user could delete list items belonging to other households. I refactored the "
            "Prisma queries to enforce composite ownership validation (listId + userId) across all mutating operations."
        ),
        "feelings": (
            "Discovering the BOLA security flaw during our mid-project audit was initially alarming, as it highlighted that relying "
            "solely on JWT authentication was insufficient. However, researching OWASP remediation techniques and implementing "
            "robust tenant boundary checks gave me deep intellectual satisfaction and transformed how I view secure API design."
        ),
        "evaluation": (
            "The backend delivered exceptional stability, sub-50ms query responses, and clean REST conventions that both mobile and web "
            "frontends consumed effortlessly. However, in early sprints, I changed endpoint payload formats without giving advance "
            "warning to the frontend engineers, causing temporary friction during integration."
        ),
        "analysis": (
            "Operating as a Shaper (Belbin, 2010), I drove the technical momentum of backend delivery with high intensity. However, "
            "I occasionally exhibited impatience when frontend integration lagged. Embracing my secondary role as Monitor Evaluator "
            "allowed me to objectively analyze our security posture. Martin's (2008) Clean Architecture principles guided my separation "
            "of controllers, service layers, and database repositories, ensuring maintainability and straightforward unit testability."
        ),
        "conclusion": (
            "I deepened my mastery of relational database normalization, ORM optimization, and enterprise API security. Secure-by-design "
            "architecture must be baked into the data layer from Day 1, rather than bolted on as an afterthought."
        ),
        "action_plan": (
            "I plan to deepen my expertise in OAuth2/OIDC standards, automated SAST/DAST security scanning in CI pipelines, and explore "
            "database sharding and read-replicas for high-throughput transactional backends."
        )
    },
    {
        "num": 3,
        "name": "Priya Sharma",
        "id": "40510103",
        "role": "Lead AI & Data Intelligence Engineer",
        "belbin": "Plant / Specialist",
        "filename": "Reflective_Statement_3_Priya_Sharma_AI_Data_Engineer",
        "milestones": [
            "Built Python 3.12 FastAPI microservice providing intelligent grocery heuristics and LLM endpoints.",
            "Implemented Google Gemini 2.5 Flash integration for zero-waste recipe synthesis and natural language chat.",
            "Developed mathematical Food Waste Risk scoring algorithm based on perishability categories and purchase timestamps.",
            "Integrated Dynamic Replenishment Radar predicting consumption velocity and automated restock triggers."
        ],
        "challenges": "Handling Gemini API hallucinations and ensuring recipe outputs only used in-stock pantry items; optimizing prompt token budgets and building fallback heuristic routines for network dropouts.",
        "description": (
            "I led the design and implementation of SmartGrocer's predictive and generative intelligence tier. Operating as an autonomous "
            "FastAPI microservice, I developed algorithms for Food Waste Risk scoring, Replenishment Velocity calculation, and Cheaper "
            "Alternatives matching across 1,000 UK catalog items. Furthermore, I integrated Google Gemini 2.5 Flash to synthesize "
            "culinary recipes dynamically tailored to expiring pantry ingredients, ensuring that missing ingredients could be added "
            "to shopping lists with a single click."
        ),
        "feelings": (
            "Working at the frontier of Generative AI was exhilarating, but also frustrating when the model occasionally generated "
            "ingredients that the user did not possess. I felt anxious about API rate limiting during demo presentations, which "
            "motivated me to engineer robust offline fallback caching algorithms."
        ),
        "evaluation": (
            "The combination of deterministic mathematical scoring (for waste risk) and generative AI (for recipes and conversational "
            "assistant) gave our project a standout unique selling point. What could have been better was prompt token optimization: "
            "early prototypes sent entire catalog descriptions, driving latency up to 4 seconds before I introduced selective JSON schema prompting."
        ),
        "analysis": (
            "As a Plant and Specialist (Belbin, 2010), I thrived generating novel solutions and pushing technical boundaries with AI. "
            "However, my Plant tendency to explore speculative features (like computer vision barcode recognition) occasionally distracted "
            "from the core timebox. Shashi's Coordinator leadership helped ground my focus on our Must-Have sprint commitments. "
            "Applying Russell & Norvig's (2020) principles of hybrid AI systems—combining symbolic heuristics with probabilistic LLMs—proved "
            "vital for reliable real-world output."
        ),
        "conclusion": (
            "I demonstrated that AI in consumer applications is only as good as the guardrails surrounding it. Grounding LLMs with strict "
            "domain context and structured JSON outputs is mandatory for reliable production software."
        ),
        "action_plan": (
            "I will pursue advanced research in Retrieval-Augmented Generation (RAG), vector embeddings for semantic product matching, "
            "and on-device quantization models (e.g. Gemma) to reduce cloud API reliance."
        )
    },
    {
        "num": 4,
        "name": "Liam Davies",
        "id": "40510104",
        "role": "Lead Frontend & UX Engineer",
        "belbin": "Resource Investigator / Completer Finisher",
        "filename": "Reflective_Statement_4_Liam_Davies_Frontend_UX",
        "milestones": [
            "Engineered cross-platform mobile application in React Native / Expo SDK 52 with smooth native animations.",
            "Developed fully responsive Next.js 15 Web Application matching the mobile aesthetic and brand guidelines.",
            "Designed Emerald Green / Leaf Basket visual design system, category filters, and live bill predictor UI.",
            "Implemented 1-Click test user switcher supporting seamless persona demonstration across 10 seeded accounts."
        ],
        "challenges": "Ensuring exact visual and behavioral parity between React Native mobile touch gestures and Next.js web mouse/keyboard interactions; managing complex client state for optimistic cart and list updates.",
        "description": (
            "I had sole ownership of frontend design and client-side architecture across both our mobile app (React Native/Expo) and our "
            "new Next.js 15 web platform. Guided by Nielsen's (1994) usability heuristics, I designed an intuitive, mobile-first interface "
            "centered on our signature Emerald theme. Key technical achievements included building the interactive Live Bill Predictor, "
            "real-time expiry countdown tags (Fresh, Expiring Soon, Expired), and the zero-waste Chef recipe view where missing items "
            "vanish seamlessly once transferred to the shopping list."
        ),
        "feelings": (
            "I thoroughly enjoyed crafting a polished, aesthetic user experience that felt cohesive across mobile and desktop viewports. "
            "I experienced significant fatigue mid-way through replicating all mobile screens in Next.js, but seeing the web app run "
            "fluidly with 100% responsive design made the extra hours completely worthwhile."
        ),
        "evaluation": (
            "User feedback from our preliminary cohort praise the intuitive layout, one-click test logins, and clear price visibility. "
            "A minor shortfall was that my initial mobile styling used hardcoded pixel dimensions, which broke on smaller Android handsets "
            "before I refactored to responsive flexbox units."
        ),
        "analysis": (
            "In Belbin's (2010) framework, my Resource Investigator role allowed me to source modern UI components and ideas from leading apps "
            "like Olio and Bring!, while my Completer Finisher trait drove my obsession with micro-interactions, color contrast compliance "
            "(WCAG 2.1 AA), and clean typography. Norman's (2013) Design of Everyday Things informed my placement of confirmation modals "
            "before irreversible actions (such as completing a shopping trip and updating pantry stock)."
        ),
        "conclusion": (
            "A modern software engineer must bridge technical capability with human psychology. Responsive web and mobile development "
            "is not merely about screen resizing, but about adapting interaction paradigms to different contexts."
        ),
        "action_plan": (
            "I aim to master Web Accessibility (WAI-ARIA) standards, explore micro-frontend architectures, and gain deeper proficiency "
            "in motion design with Framer Motion and React Native Reanimated 3."
        )
    },
    {
        "num": 5,
        "name": "Elena Rostova",
        "id": "40510105",
        "role": "Lead Quality Assurance & Test Automation Engineer",
        "belbin": "Monitor Evaluator / Completer Finisher",
        "filename": "Reflective_Statement_5_Elena_Rostova_QA_Test_Automation",
        "milestones": [
            "Architected full-stack Playwright and Cucumber (BDD) test automation framework in TypeScript.",
            "Authored 24 Gherkin feature scenarios covering 101 passing steps across all 36 system surfaces.",
            "Engineered automated HTML visual dashboard reporting (`cucumber-html-reporter`) with metrics and timings.",
            "Formulated 100% surface verification ledger spanning APIs, BOLA security checks, AI heuristics, and Web UI."
        ],
        "challenges": "Managing asynchronous Playwright browser navigation timing in headless CI environments; bridging BDD Gherkin specifications so non-technical stakeholders could validate complex multi-tiered business logic.",
        "description": (
            "As Lead QA Engineer, my mission was guaranteeing end-to-end reliability, correctness, and security across the entire SmartGrocer "
            "ecosystem. Rather than relying on sporadic manual testing, I built an enterprise-grade automated testing suite combining "
            "Playwright and Cucumber (BDD) with TypeScript. I authored 24 feature scenarios comprising 101 automated steps, testing backend "
            "health, catalog pagination, bill estimation algorithms, pantry expiry calculations, BOLA security boundaries, AI chat responses, "
            "and end-to-end web user journeys."
        ),
        "feelings": (
            "Initially, I encountered skepticism from teammates who viewed comprehensive test writing as a potential delay to feature "
            "coding. However, when my automated BDD suite immediately flagged a critical path resolution bug in backend URL handling and "
            "verified BOLA security patches, the team recognized QA as an indispensable safety net, filling me with professional pride."
        ),
        "evaluation": (
            "Achieving a 100% pass rate (24/24 scenarios, 101/101 steps) across 36 mapped system surfaces in under 17 seconds was a stellar "
            "success. Our HTML report provided transparent evidence for supervisor evaluation. One area for improvement was that I authored "
            "several UI tests late in the sprint cycle; adopting true Test-Driven Development (TDD) from Day 1 would have accelerated "
            "frontend debugging even further."
        ),
        "analysis": (
            "Belbin's (2010) Monitor Evaluator role accurately describes my analytical, quality-first mindset. I questioned assumptions, "
            "tested boundary conditions, and ensured no regression escaped into staging. As a Completer Finisher, I refused to mark "
            "our test suite complete until all 36 surface points were verified. Beck's (2002) Test-Driven Development and Sommerville's (2016) "
            "software quality frameworks provided the theoretical foundation for our verification matrix."
        ),
        "conclusion": (
            "Automated testing is not an operational overhead—it is the bedrock of rapid, confident software delivery. High-quality BDD "
            "serves simultaneously as executable specifications, automated regression defense, and live project documentation."
        ),
        "action_plan": (
            "I plan to achieve ISTQB Advanced Test Automation certification, implement automated performance load testing with k6, "
            "and embed automated accessibility testing (axe-core) into our Playwright pipelines."
        )
    }
]

def generate_reflective_statements(output_dir):
    os.makedirs(output_dir, exist_ok=True)
    
    for r in REFLECTIONS:
        doc_filename = f"{r['filename']}.docx"
        md_filename = f"{r['filename']}.md"
        doc_path = os.path.join(output_dir, doc_filename)
        md_path = os.path.join(output_dir, md_filename)
        
        # 1. Create DOCX
        doc = create_styled_document()
        author_info = [{
            "name": r["name"],
            "id": r["id"],
            "role": f"{r['role']} | Belbin: {r['belbin']}"
        }]
        
        add_title_page(
            doc,
            module_code="SOC11103",
            module_title="Postgraduate Group Project",
            project_title="SmartGrocer: Critical Reflective Statement",
            subtitle=f"Individual Academic Reflection on Software Engineering Practice & Team Contribution",
            authors=author_info,
            institution="School of Computing, Edinburgh Napier University",
            date_str="Academic Year 2026/2027"
        )
        
        add_custom_heading(doc, f"Individual Reflective Statement: {r['name']}", level=1)
        doc.add_paragraph(f"Role: {r['role']} | Matriculation ID: {r['id']} | Belbin Profile: {r['belbin']}")
        
        add_callout(
            doc,
            "Reflective Framework:\n"
            "This critical reflective statement is structured according to Gibbs' (1988) Reflective Cycle, exploring the "
            "concrete experiences, personal challenges, team dynamics, and pedagogical lessons acquired throughout the project.",
            title="ACADEMIC REFLECTION MODEL"
        )
        
        add_custom_heading(doc, "1. Description (What Happened?)", level=2)
        doc.add_paragraph(r["description"])
        
        doc.add_paragraph("Key Workstream Milestones Completed:")
        for m in r["milestones"]:
            doc.add_paragraph(f"• {m}")
            
        add_custom_heading(doc, "2. Feelings (Thoughts and Reactions)", level=2)
        doc.add_paragraph(r["feelings"])
        
        add_custom_heading(doc, "3. Evaluation (What Went Well and What Was Challenging?)", level=2)
        doc.add_paragraph(r["evaluation"])
        doc.add_paragraph(f"Primary Technical Challenge Overcome: {r['challenges']}")
        
        add_custom_heading(doc, "4. Analysis (Sense-Making and Theoretical Grounding)", level=2)
        doc.add_paragraph(r["analysis"])
        
        add_custom_heading(doc, "5. Conclusion (Lessons Learned)", level=2)
        doc.add_paragraph(r["conclusion"])
        
        add_custom_heading(doc, "6. Action Plan (Future Professional Development)", level=2)
        doc.add_paragraph(r["action_plan"])
        
        add_custom_heading(doc, "7. References", level=2)
        doc.add_paragraph("• Beck, K. (2002). Test-Driven Development: By Example. Boston: Addison-Wesley.")
        doc.add_paragraph("• Belbin, R.M. (2010). Management Teams: Why They Succeed or Fail. 3rd edn. London: Routledge.")
        doc.add_paragraph("• Fowler, M. (2018). Refactoring: Improving the Design of Existing Code. 2nd edn. Boston: Addison-Wesley.")
        doc.add_paragraph("• Gibbs, G. (1988). Learning by Doing: A Guide to Teaching and Learning Methods. Further Education Unit. Oxford: Oxford Polytechnic.")
        doc.add_paragraph("• Martin, R.C. (2008). Clean Code: A Handbook of Agile Software Craftsmanship. Upper Saddle River: Prentice Hall.")
        doc.add_paragraph("• Norman, D. (2013). The Design of Everyday Things: Revised and Expanded Edition. New York: Basic Books.")
        doc.add_paragraph("• Sommerville, I. (2016). Software Engineering. 10th edn. Boston: Pearson.")
        doc.add_paragraph("• Tuckman, B.W. (1965). 'Developmental sequence in small groups', Psychological Bulletin, 63(6), pp. 384-399.")
        
        doc.save(doc_path)
        
        # 2. Create MD
        md_text = f"""# SmartGrocer: Individual Critical Reflective Statement
**Author:** {r['name']} (Matriculation ID: {r['id']})  
**Role:** {r['role']}  
**Belbin Profile:** {r['belbin']}  
**Module:** SOC11103 Postgraduate Group Project | Edinburgh Napier University

---

## 1. Description (What Happened?)
{r['description']}

### Key Workstream Milestones Completed:
""" + "\n".join([f"- {m}" for m in r["milestones"]]) + f"""

---

## 2. Feelings (Thoughts and Reactions)
{r['feelings']}

---

## 3. Evaluation (What Went Well and What Was Challenging?)
{r['evaluation']}

**Primary Technical Challenge Overcome:**  
{r['challenges']}

---

## 4. Analysis (Sense-Making and Theoretical Grounding)
{r['analysis']}

---

## 5. Conclusion (Lessons Learned)
{r['conclusion']}

---

## 6. Action Plan (Future Professional Development)
{r['action_plan']}

---

## 7. References
- Beck, K. (2002). *Test-Driven Development: By Example*. Boston: Addison-Wesley.
- Belbin, R.M. (2010). *Management Teams: Why They Succeed or Fail*. 3rd edn. London: Routledge.
- Fowler, M. (2018). *Refactoring: Improving the Design of Existing Code*. 2nd edn. Boston: Addison-Wesley.
- Gibbs, G. (1988). *Learning by Doing: A Guide to Teaching and Learning Methods*. Oxford: Further Education Unit, Oxford Polytechnic.
- Martin, R.C. (2008). *Clean Code: A Handbook of Agile Software Craftsmanship*. Upper Saddle River: Prentice Hall.
- Norman, D. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. New York: Basic Books.
- Sommerville, I. (2016). *Software Engineering*. 10th edn. Boston: Pearson.
- Tuckman, B.W. (1965). 'Developmental sequence in small groups', *Psychological Bulletin*, 63(6), pp. 384-399.
"""
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_text)
            
        print(f"Generated Reflective Statement for {r['name']}: {doc_path} and {md_path}")

if __name__ == "__main__":
    generate_reflective_statements(r"S:\Shashi\SmartGrocer\submission_docs")

