# Go-to-Market — Bridges

## 1. Market Context

The autism therapy tool market sits at a unique inflection point. An estimated 1 in 36 children in the US is diagnosed with autism spectrum disorder (CDC, 2023), and the demand for ABA therapy and speech therapy dramatically outstrips supply. Families wait 6–12 months for therapy services. Those who get in receive 10–25 hours per week — leaving 140+ hours where parents are on their own with limited tools and guidance.

The existing tool landscape is bifurcated: enterprise platforms (CentralReach, Catalyst) that serve clinic operations at $200+/seat/month, and consumer apps (Speech Blubs, AutiSpark) that offer generic content disconnected from actual therapy plans. Neither empowers parents or individual therapists to create custom tools. Meanwhile, the vibe-coding revolution has proven that non-technical users can create software with AI assistance — but no platform has applied this capability to a specific domain with pre-loaded expertise.

Why now: AI language models have reached the quality threshold where they can reliably understand therapy-specific language ("discrete trial training," "manding," "visual schedule for transitioning"). Google's embedding models make domain-specific RAG affordable. Text-to-speech from ElevenLabs sounds natural enough to model language for children. And ABA therapy itself is under increasing scrutiny, creating openness among families and professionals to AI-augmented alternatives. The timing for Bridges is a convergence of technical readiness, market frustration, and cultural openness.

The addressable audience: 1.5M+ families of autistic children in the US, plus ~80,000 BCBAs, ~200,000 SLPs, and hundreds of thousands of special education professionals. Even capturing 0.01% of families in the first year (150 families) would exceed the 90-day goal.

---

## 2. Launch Strategy

Bridges' launch unfolds in three phases, designed for a solo founder with limited budget and strong domain credibility.

**Pre-launch (Now through Vibeathon):** Build the product. Document the journey. Capture attention at the Springfield Vibeathon (March 23–27, 2026) as the debut moment. The Vibeathon is both a build sprint and a launch event — winning or placing gives Bridges credibility, press, and an audience from day one.

**Soft launch (Vibeathon week + 2 weeks after):** Share Bridges with the Vibeathon audience, local autism community contacts, and 2–3 targeted online communities. Collect feedback aggressively. Fix the biggest friction points. Get 10–20 parents using it with their kids and 3–5 therapists creating tools.

**Public launch (Week 4–6 post-Vibeathon):** Broader push into autism parent communities, therapist groups, and social media. Lead with parent testimonials and therapist endorsements from the soft launch period. The story: "A dad built the tool he wished existed for his autistic son — and now any parent can use it."

---

## 3. Pre-Launch Playbook

Since the Vibeathon is March 23–27 and today is March 23, the pre-launch is compressed into the event itself. Here's the immediate plan:

**Vibeathon Week (March 23–27):**
- Day 1 (Mon): Build Phase 0 and Phase 1. Post on X/LinkedIn: "Building a vibe-coding tool for autism parents at the Springfield Vibeathon. My son Ace has Level 1 ASD — this is personal." Include a screenshot of the builder.
- Day 2 (Tue): Build Phase 2 and Phase 3. Post a 30-second screen recording of building a communication board with TTS. Tag @caborque (Codefi) and #VibeTheGap.
- Day 3 (Wed): Build Phase 4 and Polish. Post: "My son's communication board speaks for him now. Built it in 30 seconds." Include audio clip.
- Day 4 (Thu): Build Phase 5 and Phase 6 (auth + deploy). Final polish. Prepare demo.
- Day 5 (Fri): Demo day. Present Bridges. Record the demo. Post the recording everywhere.

**Week 1 Post-Vibeathon (March 28 – April 3):**
- Share the demo video on X, LinkedIn, Reddit (r/autism, r/ABA, r/slp)
- Post in 3 autism parent Facebook groups (find the largest active ones)
- DM 5 BCBAs or SLPs who post therapy content on Instagram/TikTok — offer early access
- Write a short blog post or Twitter thread: "What I learned building an AI therapy tool at a hackathon"
- Start collecting feedback from anyone who tries it

**Week 2 (April 4–10):**
- Fix the top 3 friction points from user feedback
- Create a simple feedback form (Google Form or Typeform embedded in the app)
- Reach out to 2 local ABA clinics in Springfield for pilot conversations
- Post 2x on X showing real parent use cases (with permission)

**Weeks 3–4 (April 11–24):**
- Continue posting 3x/week on X and LinkedIn
- Respond to every comment, DM, and email
- Identify 1–2 parents willing to share their story publicly
- Identify 1–2 therapists willing to review/endorse the tool
- Prepare for public launch with testimonials and demo content

---

## 4. Launch Week Plan

**Public launch: ~Week 5 post-Vibeathon (late April 2026)**

**Monday — Tease:** Post on X/LinkedIn: "Something I've been building for my son Ace is ready for every family. Launching Thursday." Include a 15-second preview clip.

**Tuesday — Story:** Long-form post/thread telling the full story. The Stacey parallel from the Vibeathon challenge (a non-technical person building something real). Your personal why. Ace's journey. What Bridges does. End with: "It's free. It's live Thursday."

**Wednesday — Therapist angle:** Post targeted at therapists: "BCBAs and SLPs — what if you could build custom therapy tools in 30 seconds instead of 3 hours?" Include a screen recording of building a DTT data sheet. Share in SLP and ABA professional groups.

**Thursday — Launch day:**
- Post on X, LinkedIn, Reddit (r/autism, r/ABA, r/slp, r/specialed), and Hacker News
- Post in 5 autism parent Facebook groups (stagger throughout the day)
- Email or DM everyone who showed interest during soft launch: "It's live"
- Monitor for bugs — have Convex dashboard and Vercel logs open all day
- Respond to every comment within 1 hour
- Post a "thank you" at end of day with first user numbers

**Friday — Momentum:**
- Share any early user stories or screenshots (with permission)
- Post a "what I'm hearing from parents" thread on X
- Reach out to autism parenting bloggers and podcasters for future coverage

**Weekend — Sustain:**
- Keep responding to all comments and DMs
- Document any feature requests or friction points
- Plan next week's content

---

## 5. Post-Launch Growth

**Weeks 1–4:** Focus on retention and feedback.
- Talk to every active user personally (DM or email). Ask: "What did you build? Did your child use it? What's missing?"
- Fix bugs fast — every fix is a trust builder
- Post 3x/week showing real tools built by real parents
- Track which tool types are most popular — double down on those
- Add the top-requested feature or template each week

**Weeks 5–8:** Focus on organic distribution.
- Launch a "Share your Bridges tool" campaign — parents who share tools in Facebook groups get featured on the Bridges social accounts
- Every shared tool link has a "Built on Bridges" footer — this is passive distribution
- Approach 3 ABA clinics about pilot programs: "Your therapists save 3 hours/week on material prep."
- Submit Bridges to Product Hunt (prepare a polished listing with demo video)
- Begin SEO: publish 2 blog posts targeting "autism visual schedule app" and "custom ABA therapy tools"

**Weeks 9–12:** Focus on conversion and revenue.
- Introduce the premium tier (Stripe integration)
- Monitor free-to-paid conversion. Target: 3–5% conversion within 30 days of sign-up
- Reach out to autism parenting podcasts for guest appearances (lead with the personal story, not the product)
- Explore partnership with one autism advocacy organization (Autism Speaks, ASAN, etc.)
- If at 50+ active families: create a private Bridges parent community (Facebook group or Discord)

---

## 6. Channel Strategy

Ranked by expected ROI for Bridges' specific audience:

**1. Autism Parent Facebook Groups (Highest ROI)**
Effort: Low (posting) | Return: High (direct access to target users) | Timeline: Immediate
These groups (50K–200K members each) are where parents ask "what app should I use?" almost daily. A genuine post from a parent/builder — not a promotional ad — showing a tool they built for their child will generate clicks. Share the story, not the product. Let the product sell itself through shared tool links.

**2. Reddit — r/autism, r/ABA, r/slp, r/specialed**
Effort: Low-Medium | Return: High | Timeline: 1–2 weeks
Reddit communities value authenticity and hate promotional content. Post as a parent who built something, not as a founder selling something. Share the Vibeathon story. Offer to build a free tool for anyone who describes their need. This demonstrates value and generates word-of-mouth.

**3. X (Twitter) and LinkedIn — Build in Public**
Effort: Medium (3 posts/week) | Return: Medium-High | Timeline: 2–4 weeks
The "dad building AI tools for his autistic son" narrative resonates across both platforms. X reaches the tech/startup audience (potential supporters, press, investors). LinkedIn reaches professionals (therapists, clinic owners, special ed administrators). Post a mix of: personal Ace stories, 30-second demo clips, parent testimonials, and behind-the-scenes build updates.

**4. Therapist Instagram and TikTok**
Effort: Medium | Return: Medium | Timeline: 4–8 weeks
Many BCBAs and SLPs share therapy content on Instagram Reels and TikTok. Reach out to 5–10 therapy content creators. Offer early access. If they make a video showing Bridges, each one reaches 5K–50K therapists. One viral TikTok from an SLP could drive thousands of sign-ups.

**5. SEO / Blog Content**
Effort: High | Return: High (long-term) | Timeline: 8–16 weeks
Target long-tail keywords parents actually search: "custom visual schedule app autism," "ABA therapy tools for parents," "communication board maker." Write genuinely helpful content — not keyword-stuffed SEO bait. Each blog post should include a CTA to build the described tool on Bridges.

**6. Product Hunt**
Effort: Medium (one-time prep) | Return: Medium (burst) | Timeline: One-day event
Good for a visibility spike and credibility badge. Prepare a polished listing with demo video, screenshots, and the founder story. Best launched on a Tuesday or Wednesday. Expected result: 100–500 visits, some sign-ups, and a "Featured on Product Hunt" badge.

---

## 7. Content Strategy

**Core content pillar: "Tools parents build."** Every piece of content shows a real parent or therapist building a real tool. This demonstrates the product without being promotional.

**Weekly content cadence (solo founder, 3 posts/week):**

| Day | Platform | Content Type |
|-----|----------|-------------|
| Monday | X + LinkedIn | Demo clip: 30-second screen recording of building a tool |
| Wednesday | X | Personal story or Ace update related to therapy/tools |
| Friday | X + LinkedIn | User spotlight: tool a parent/therapist built (with permission) |

**Monthly content:**
- 1 blog post (SEO-targeted, 1000–1500 words)
- 1 longer-form story (X thread or LinkedIn article) about the Bridges journey

**Content rules:**
- Never post marketing copy. Post stories, demos, and real use cases.
- Always show the product in action, not just talk about it.
- Lead with the child or parent, not the technology.
- Ask permission before sharing any user's tool or story.
- Respond to every reply and DM — community engagement is content.

---

## 8. Community Strategy

**Where the audience already gathers:**

- **Facebook Groups:** "Autism Parents Support Group" (200K+), "ABA Therapy Parents" (50K+), dozens of regional autism parent groups. These are where parents ask questions, share frustrations, and recommend tools. Show up as a helpful parent first, founder second.

- **Reddit:** r/autism (600K+), r/ABA (30K+), r/slp (50K+), r/specialed (30K+). Valuable for honest feedback and reaching power users (therapists who actively seek new tools). Post authentically — Reddit punishes self-promotion.

- **Therapy professional groups:** SLP Facebook groups ("SLP Talk," "The Informed SLP"), BCBA forums, state-level ABA association listservs. These are where therapists share resources. Getting one respected BCBA to post about Bridges is worth more than 100 social media posts.

- **Local community:** Springfield autism support networks, early intervention programs, local ABA clinics. Face-to-face relationships with 5 local therapists who can become early champions.

**Community building approach:**
- For the first 6 months, participate in existing communities rather than building your own. You don't have the user base to sustain a standalone community yet.
- At 50+ active families: consider a private Facebook group or Discord for Bridges parents to share tools and tips.
- At 100+ therapists: consider a therapist advisory board (3–5 BCBAs/SLPs who test features and provide clinical guidance).

---

## 9. Key Metrics

**Tied to 90-day goal: 50 active parents, 10 therapists, 3 clinic pilots, first premium users.**

**Acquisition:**
| Metric | Target (90 days) |
|--------|-----------------|
| Website visitors | 2,000 |
| Sign-ups (free accounts) | 200 |
| Tools created (total) | 500 |

**Activation:**
| Metric | Target |
|--------|--------|
| Tool created within first session | 60% of visitors who reach /builder |
| Tool shared via link | 30% of tools created |
| Time to first tool | < 90 seconds median |

**Retention:**
| Metric | Target |
|--------|--------|
| 7-day return rate | 30% |
| 30-day return rate | 15% |
| Tools per active user per week | 2+ |

**Revenue (post-freemium launch):**
| Metric | Target |
|--------|--------|
| Free-to-paid conversion | 3–5% |
| MRR at 90 days | $500 (from early premium adopters) |
| Therapist referrals driving sign-ups | 20% of new users |

**Leading indicators to watch daily/weekly:**
- Tools created per day (is usage growing?)
- Share link clicks per day (is organic distribution working?)
- RAG search queries (what are users asking for? Are they hitting gaps in the knowledge base?)
- TTS plays (are children engaging with communication boards?)
- Feature requests (what's missing?)

---

## 10. Budget Considerations

**Monthly costs at launch (< 500 users):**

| Item | Cost | Notes |
|------|------|-------|
| Vercel Hosting | $0 | Hobby plan (sufficient for launch) |
| Convex Backend | $0 | Free tier (1M function calls, 1GB) |
| Claude API | ~$30 | ~500 conversations/month |
| ElevenLabs | ~$5 | Starter plan for TTS |
| Google Embeddings | $0 | Free tier generous |
| Domain name | ~$12/year | bridges.tools or similar |
| **Total** | **~$36/month** | |

**Optional investments (when budget allows):**

| Item | Cost | ROI |
|------|------|-----|
| Vercel Pro | $20/month | Needed if traffic exceeds hobby limits |
| Convex Pro | $25/month | Needed at ~1000+ active users |
| ElevenLabs Scale | $22/month | More TTS characters, better voices |
| Product Hunt launch prep (designer for assets) | $200 one-time | Polished PH listing |
| Sponsored post in autism parenting newsletter | $100–300 | Direct reach to target audience |

**Where to invest first:**
1. API costs (Claude + ElevenLabs) — these are the core experience
2. Domain name — professionalism matters in health-adjacent tools
3. Product Hunt prep — one-time spend for a burst of visibility

**Where NOT to spend:**
- Paid ads (too early — you don't know your messaging or conversion rate yet)
- Design tools (use free tiers of Figma, Google Stitch)
- Premium hosting (free tiers are sufficient until 1000+ users)

---

## 11. Risks

**1. Facebook group moderation blocks promotional posts**
Risk: High | Impact: Reduces the highest-ROI channel.
Mitigation: Never post promotional content. Share your personal story and let others click through. Use tool share links (which show the tool, not a landing page) as the entry point. If a post gets removed, respect the group rules and try a different angle.

**2. Therapist pushback — "AI shouldn't be making therapy tools"**
Risk: Medium | Impact: Could slow therapist adoption and create negative word-of-mouth.
Mitigation: Position clearly: "Bridges doesn't create therapy plans — it creates the materials therapists already make by hand." Lead with the therapist time-saving angle, not the parent independence angle. Get early therapist endorsements and feature them prominently.

**3. Parent-created tools are clinically inappropriate**
Risk: Medium | Impact: If a parent builds a tool based on misunderstanding of their child's goals, it could be unhelpful or counterproductive.
Mitigation: Include disclaimer: "Bridges creates practice tools, not therapy. Always follow your therapist's guidance." System prompt steers toward safe, general-purpose tools (visual supports, communication aids) and away from clinical interventions. Long-term: allow therapists to review and approve tools built by their clients' parents.

**4. Early users churn after novelty wears off**
Risk: High | Impact: Could stall growth before reaching product-market fit.
Mitigation: Focus on tools with daily utility (morning routine schedules, mealtime communication boards) that become part of the family's routine. Track which tools get used daily vs. created-once-and-abandoned. Double down on the daily-use patterns.

**5. Competitor enters the space**
Risk: Low (short-term), Medium (12-month) | Impact: Could erode differentiation.
Mitigation: The moat is domain intelligence (therapy knowledge base) + community (shared tools, therapist endorsements) + founder authenticity (Desha's story). These compound over time. Ship fast, build relationships, and stay 6 months ahead of anyone who tries to copy the idea without the domain expertise.

**6. Vibeathon demo fails or underperforms**
Risk: Medium | Impact: Missed the debut moment and credibility opportunity.
Mitigation: Ruthlessly prioritize the demo flow. One perfect flow (parent creates a communication board with TTS) is better than five buggy features. Practice the demo 3+ times before presentation. Have a backup plan: if live demo fails, show a pre-recorded version.

**7. API cost spike if usage grows faster than expected**
Risk: Low | Impact: Could force premature monetization or feature cuts.
Mitigation: Claude Sonnet (not Opus) keeps costs manageable. TTS caching reduces ElevenLabs calls by ~60%. RAG uses cheap embeddings (Google free tier). At current pricing, 1000 users/month costs ~$100 in API fees — well within sustainable range. Monitor daily API spend from week 1.
