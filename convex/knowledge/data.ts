export type KnowledgeEntry = {
  title: string;
  content: string;
  category:
    | "aba-terminology"
    | "speech-therapy"
    | "tool-patterns"
    | "developmental-milestones"
    | "iep-goals";
};

export const KNOWLEDGE_ENTRIES: KnowledgeEntry[] = [
  // ─── ABA Terminology (22 entries) ───────────────────────────────────────────
  {
    title: "Discrete Trial Training (DTT)",
    category: "aba-terminology",
    content:
      "Discrete Trial Training is a structured ABA teaching method that breaks skills into small, distinct units called trials. Each trial consists of a discriminative stimulus, a prompt, the child's response, and a consequence. DTT is conducted in a distraction-free environment with multiple repetitions. Data is collected on every trial to measure progress.",
  },
  {
    title: "Natural Environment Teaching (NET)",
    category: "aba-terminology",
    content:
      "Natural Environment Teaching embeds learning opportunities within everyday activities and settings rather than structured table work. The therapist follows the child's motivation and interests to create teachable moments. NET promotes generalization because skills are practiced in the contexts where they naturally occur. This approach is often more engaging for children who resist structured instruction.",
  },
  {
    title: "Manding",
    category: "aba-terminology",
    content:
      "A mand is a verbal behavior where the child requests something they want or need. Manding is considered the most important verbal operant because it is directly reinforced by getting the desired item or action. Teaching manding reduces frustration-based behaviors because the child gains a way to communicate wants. Mand training often begins with highly preferred items to ensure strong motivation.",
  },
  {
    title: "Tacting",
    category: "aba-terminology",
    content:
      "A tact is a verbal label or comment about something in the environment. When a child says 'dog' upon seeing a dog, they are tacting. Tacting is reinforced by social praise rather than by receiving the item named. Strong tacting skills support conversational language and shared attention.",
  },
  {
    title: "Echoics",
    category: "aba-terminology",
    content:
      "An echoic is the verbal behavior of repeating what another person says. Building echoic repertoires is a foundational step in developing functional speech. Echoics are reinforced immediately when the child reproduces the model. Therapists use echoic training to establish sounds, words, and phrases before transferring them to mands and tacts.",
  },
  {
    title: "Intraverbals",
    category: "aba-terminology",
    content:
      "Intraverbals are verbal responses to another person's verbal behavior where the words are not copied and no object is present. Answering questions, filling in song lyrics, and having conversations are all intraverbal behaviors. This verbal operant is critical for social conversation and academic responding. Intraverbal training often follows solid mand and tact repertoires.",
  },
  {
    title: "Token Economy",
    category: "aba-terminology",
    content:
      "A token economy is a reinforcement system where tokens are earned for target behaviors and later exchanged for preferred items or activities. Tokens serve as conditioned reinforcers that bridge the gap between behavior and backup reinforcers. This system teaches delayed gratification and self-monitoring. Token boards visually represent progress toward the backup reinforcer.",
  },
  {
    title: "Prompting Hierarchy",
    category: "aba-terminology",
    content:
      "A prompting hierarchy is an ordered sequence of cues used to help a child perform a target behavior. Common levels range from most-to-least intrusive: physical, gestural, verbal, and independent. Prompt fading involves systematically reducing prompts as the child becomes more proficient. Errorless learning typically uses most-to-least prompting to minimize mistakes.",
  },
  {
    title: "Fixed Ratio Reinforcement Schedule",
    category: "aba-terminology",
    content:
      "A fixed ratio schedule delivers reinforcement after a set number of correct responses. For example, a token board that requires five tokens before a reward operates on a fixed ratio 5 schedule. This schedule produces high and steady rates of responding. The predictability can motivate children who benefit from knowing exactly how many behaviors are needed.",
  },
  {
    title: "Functional Behavior Assessment (FBA)",
    category: "aba-terminology",
    content:
      "A Functional Behavior Assessment identifies the antecedents, behaviors, and consequences maintaining a challenging behavior. The assessment determines the function of the behavior: escape, attention, access to tangibles, or sensory. An FBA informs the development of a behavior intervention plan. Accurate function identification ensures that interventions address the root cause rather than just the symptom.",
  },
  {
    title: "ABC Data Collection",
    category: "aba-terminology",
    content:
      "ABC data records the Antecedent, Behavior, and Consequence around each occurrence of a target behavior. The antecedent is what happened immediately before the behavior. The consequence is what happened immediately after. Analyzing patterns across multiple ABC records helps identify the function and triggers of the behavior.",
  },
  {
    title: "Task Analysis",
    category: "aba-terminology",
    content:
      "Task analysis breaks a complex skill into its sequential component steps. Each step is taught and measured independently before chaining them together. Visual schedules often display task analyses in picture or word format. This approach is especially helpful for multi-step routines like hand washing, dressing, and toothbrushing.",
  },
  {
    title: "Forward Chaining",
    category: "aba-terminology",
    content:
      "Forward chaining teaches the steps of a task analysis in order from first to last. The child is prompted through all steps except the first, which they complete independently. Mastery of the first step is established before teaching the second. This method highlights progress by building from the natural start of a routine.",
  },
  {
    title: "Backward Chaining",
    category: "aba-terminology",
    content:
      "Backward chaining teaches the last step of a task analysis first and works toward the beginning. The child is prompted through all steps except the last, experiencing the reinforcement of completion. As each step is mastered, the therapist prompts one fewer step. Backward chaining provides frequent success because the child always finishes the task independently.",
  },
  {
    title: "Shaping",
    category: "aba-terminology",
    content:
      "Shaping reinforces successive approximations of a target behavior that the child cannot yet perform. Each step gets slightly closer to the final goal behavior. When the current approximation is consistent, the criterion for reinforcement is raised. Shaping is used to develop novel behaviors including speech sounds and complex motor skills.",
  },
  {
    title: "Generalization",
    category: "aba-terminology",
    content:
      "Generalization occurs when a learned behavior is performed in settings, with people, or with materials other than those used in training. Stimulus generalization means the behavior transfers across different cues. Response generalization means related behaviors also improve. Programming for generalization from the start—by using multiple trainers, settings, and examples—prevents a skill from being locked to one context.",
  },
  {
    title: "Discrimination Training",
    category: "aba-terminology",
    content:
      "Discrimination training teaches the child to respond differently to different stimuli. The target stimulus signals that a response will be reinforced, while non-target stimuli signal no reinforcement. Successful discrimination means the child can distinguish between similar items or instructions. This underlies receptive identification, matching, and academic sorting tasks.",
  },
  {
    title: "VB-MAPP Assessment",
    category: "aba-terminology",
    content:
      "The Verbal Behavior Milestones Assessment and Placement Program (VB-MAPP) evaluates language and learning skills based on Skinner's analysis of verbal behavior. It assesses milestones across 16 skill areas in three developmental levels. Results guide individualized programming and help track language development. The VB-MAPP is commonly used by BCBAs to inform ABA therapy goals.",
  },
  {
    title: "Extinction",
    category: "aba-terminology",
    content:
      "Extinction involves withholding the reinforcer that has been maintaining a behavior, causing the behavior to decrease over time. When extinction is implemented, an extinction burst—a temporary increase in the behavior—is expected before it decreases. Extinction must be applied consistently and is most effective when combined with teaching a replacement behavior. Ignoring attention-maintained behavior while reinforcing appropriate requests is a common example.",
  },
  {
    title: "Continuous Reinforcement Schedule",
    category: "aba-terminology",
    content:
      "A continuous reinforcement schedule provides a reinforcer after every correct response. This schedule is used during the initial acquisition of new skills because it builds the behavior quickly. Once the skill is established, reinforcement is thinned to an intermittent schedule to promote maintenance. Continuous reinforcement is less resistant to extinction than intermittent schedules.",
  },
  {
    title: "ABLLS-R Assessment",
    category: "aba-terminology",
    content:
      "The Assessment of Basic Language and Learning Skills – Revised (ABLLS-R) is a criterion-referenced tool that tracks skill acquisition across 25 domains. It assesses language, academic, self-help, and motor skills. The ABLLS-R helps create individualized ABA programs by identifying prerequisite skills and gaps. Progress is tracked over time using the scoring guide's visual skill tracking grid.",
  },
  {
    title: "Differential Reinforcement of Alternative Behavior (DRA)",
    category: "aba-terminology",
    content:
      "DRA reinforces a specific alternative behavior that serves the same function as the challenging behavior while placing the challenging behavior on extinction. For example, reinforcing a child for raising their hand instead of shouting out. The alternative behavior must be as efficient as the problem behavior to be effective. DRA is a function-based intervention that supports positive behavior.",
  },

  // ─── Speech Therapy (22 entries) ──────────────────────────────────────────
  {
    title: "Augmentative and Alternative Communication (AAC)",
    category: "speech-therapy",
    content:
      "AAC encompasses all the tools and strategies used to supplement or replace spoken communication. This includes low-tech options like picture boards and high-tech devices like speech-generating devices. AAC does not hinder speech development; research consistently shows it supports it. All children who cannot reliably use speech should have access to an AAC system.",
  },
  {
    title: "PECS Phase 1: Physical Exchange",
    category: "speech-therapy",
    content:
      "In Phase 1 of the Picture Exchange Communication System, the child learns to pick up a picture of a desired item and hand it to a communication partner. Two trainers work together—one behind the child to prompt the exchange, one in front to receive the picture. The child receives the desired item immediately as reinforcement. Physical exchange establishes the fundamental communication act before discrimination is taught.",
  },
  {
    title: "PECS Phase 4: Sentence Structure",
    category: "speech-therapy",
    content:
      "In PECS Phase 4, the child learns to construct a sentence strip using an 'I want' card followed by the picture of the desired item. This phase introduces multi-symbol communication and expands expressive language. The sentence strip is handed to the communication partner who reads it aloud. Phase 4 builds toward generative language by teaching a flexible sentence frame.",
  },
  {
    title: "Core Vocabulary",
    category: "speech-therapy",
    content:
      "Core vocabulary consists of the small set of words used most frequently across all communication contexts. These words—like 'want,' 'go,' 'more,' 'help,' and 'stop'—account for approximately 80% of what people say. Core words are the foundation of AAC symbol organization systems. Teaching core vocabulary enables flexible, generative communication rather than scripted requests.",
  },
  {
    title: "Fringe Vocabulary",
    category: "speech-therapy",
    content:
      "Fringe vocabulary consists of less frequent, highly personal, and topic-specific words. Examples include names of family members, preferred foods, and special interests. While core vocabulary is shared across users, fringe vocabulary is individualized. AAC systems balance core pages for high-frequency use with fringe pages for personalized content.",
  },
  {
    title: "Aided Language Stimulation",
    category: "speech-therapy",
    content:
      "Aided language stimulation (or modeling) involves the communication partner pointing to symbols on the AAC device while speaking to the child. This technique shows the child how the AAC system maps onto language. The communication partner models at least one symbol per sentence. Research supports aided language stimulation as an effective strategy for building AAC use.",
  },
  {
    title: "Joint Attention",
    category: "speech-therapy",
    content:
      "Joint attention is the shared focus between two people on an object or event, coordinated through eye gaze, pointing, or showing. It typically emerges around 9 to 12 months in typical development. Joint attention is a critical precursor to language development and social learning. Many children with autism have difficulty initiating or responding to joint attention bids.",
  },
  {
    title: "Pragmatics",
    category: "speech-therapy",
    content:
      "Pragmatics is the use of language in social contexts—knowing what to say, when to say it, and how to say it. Pragmatic skills include turn-taking, topic maintenance, understanding sarcasm, and adapting language to the listener. Children with autism often have pragmatic difficulties even when their vocabulary and grammar are strong. Social pragmatic groups and scripted role-play activities are commonly used to teach these skills.",
  },
  {
    title: "Mean Length of Utterance (MLU)",
    category: "speech-therapy",
    content:
      "MLU measures the average number of morphemes per utterance in a language sample and is used as an index of grammatical development. A child at Brown's Stage I produces mostly single words with an MLU under 2. MLU is calculated by counting all morphemes across a 50-utterance sample. MLU is used to track language growth and compare a child's language to developmental norms.",
  },
  {
    title: "Receptive Language",
    category: "speech-therapy",
    content:
      "Receptive language refers to the ability to understand language that is heard or read. This includes following instructions, identifying pictures, and comprehending questions. Receptive language typically develops ahead of expressive language. Deficits in receptive language may not be obvious because children often use contextual cues to appear to understand more than they do.",
  },
  {
    title: "Expressive Language",
    category: "speech-therapy",
    content:
      "Expressive language is the ability to convey thoughts, wants, and information through spoken words, gestures, writing, or AAC. Expressive language includes vocabulary, grammar, sentence structure, and narrative skills. A child's expressive vocabulary at 24 months is a strong predictor of later language outcomes. Speech-language pathologists assess and treat both receptive and expressive language delays.",
  },
  {
    title: "Functional Echolalia",
    category: "speech-therapy",
    content:
      "Functional echolalia occurs when a child uses repeated phrases in a way that is communicatively meaningful, even though the phrase was learned as a unit. For example, a child may say 'Do you want a cookie?' to mean 'I want a cookie' because that phrase was associated with receiving a cookie. Functional echolalia is different from delayed echolalia, which may serve different purposes. SLPs work to shape echoed scripts into flexible, generative language.",
  },
  {
    title: "Voice Output Communication Aid (VOCA)",
    category: "speech-therapy",
    content:
      "A VOCA is an electronic device that produces spoken output when the user activates symbols, letters, or words. VOCAs range from simple single-message buttons to sophisticated dynamic-display devices. High-tech VOCAs can generate novel sentences using programmed vocabulary. Access methods include direct touch, switch access, and eye gaze for individuals with motor limitations.",
  },
  {
    title: "Word Approximations",
    category: "speech-therapy",
    content:
      "Word approximations are attempts at words that are not yet fully formed but are recognizable as an intended target. For example, 'nana' for 'banana' or 'wa' for 'water.' SLPs treat approximations as functional communication and reinforce them while working toward clearer production. Reinforcing approximations is important to keep the child motivated to communicate.",
  },
  {
    title: "Incidental Teaching",
    category: "speech-therapy",
    content:
      "Incidental teaching is a naturalistic language intervention where the therapist arranges the environment to create communication opportunities, then responds to the child's initiations with prompts to produce language. The child's motivation drives the interaction. Incidental teaching promotes generalized communication because language is practiced in natural contexts. This approach contrasts with massed-trial instruction.",
  },
  {
    title: "Oral Motor Exercises",
    category: "speech-therapy",
    content:
      "Oral motor exercises target the strength, coordination, and movement of the lips, tongue, jaw, and cheeks. These exercises are sometimes used to support speech sound production in children with oral motor weakness. The evidence base for oral motor exercises in isolation is mixed; best practice integrates them with actual speech production tasks. SLPs assess oral motor function as part of a comprehensive articulation evaluation.",
  },
  {
    title: "Speech Sound Development Norms",
    category: "speech-therapy",
    content:
      "Speech sound development follows a predictable sequence. Most children produce all consonants correctly by age 8. Early-developing sounds like /m/, /b/, /p/, and /n/ are typically mastered by age 3. Later-developing sounds like /r/, /l/, /s/, /z/, /sh/, and /th/ are often not mastered until age 7 or 8. SLPs use these norms to determine whether a child's errors are age-appropriate or warrant intervention.",
  },
  {
    title: "Scripting in Communication",
    category: "speech-therapy",
    content:
      "Scripting involves learning and using memorized phrases or dialogues in social situations. Many autistic individuals use scripts from movies, books, or TV shows to communicate. SLPs work with scripts by using them as a bridge to more flexible language. Script fading procedures gradually modify the memorized phrase toward spontaneous, generative communication.",
  },
  {
    title: "Symbol-Based Communication",
    category: "speech-therapy",
    content:
      "Symbol-based communication uses graphic symbols—photographs, line drawings, or abstract icons—to represent words and concepts. Symbol sets range from Picture Communication Symbols (PCS) to Boardmaker symbols to PECS cards. Symbol selection considers the child's cognitive level, visual processing abilities, and vocabulary needs. A robust symbol vocabulary gives children the tools to express a wide range of ideas.",
  },
  {
    title: "Language Modeling Strategies",
    category: "speech-therapy",
    content:
      "Language modeling provides the child with a model of target language just above their current level. Self-talk involves narrating your own actions, while parallel talk narrates the child's actions. Expansion takes the child's utterance and adds grammatical or semantic complexity. These strategies are used throughout the day to enrich language input without demanding a response.",
  },
  {
    title: "Naturalistic Language Intervention",
    category: "speech-therapy",
    content:
      "Naturalistic language intervention (NLI) refers to a family of approaches that embed language teaching within child-initiated, play-based activities. NLI follows the child's lead, uses natural reinforcers, and promotes generalization. Approaches include Enhanced Milieu Teaching, Pivotal Response Treatment, and incidental teaching. Research supports NLI as effective for increasing communication in children with autism.",
  },
  {
    title: "Dynamic Display AAC",
    category: "speech-therapy",
    content:
      "Dynamic display AAC devices change the symbol pages automatically as the user selects words, enabling access to a larger vocabulary. When a user taps 'go,' the page may update to show destinations like 'school,' 'park,' and 'store.' This contrasts with static displays that require manual page turning. Dynamic displays can store thousands of vocabulary items organized in hierarchical or semantic categories.",
  },

  // ─── Tool Patterns (22 entries) ──────────────────────────────────────────
  {
    title: "Visual Schedule Best Practices",
    category: "tool-patterns",
    content:
      "Effective visual schedules use concrete, consistent symbols the child can understand. Schedules should be posted at the child's eye level and referenced at each transition. Starting with a shorter schedule of 3 to 5 steps builds success before expanding. Including the child in checking off completed steps promotes active engagement and independence.",
  },
  {
    title: "Token Board Motivation Design",
    category: "tool-patterns",
    content:
      "Token boards are most effective when the backup reinforcer is highly preferred and chosen by the child. Starting with fewer tokens (2 to 3) creates faster success before gradually increasing the requirement. The token itself—star, sticker, or custom symbol—should be motivating or novel. Consistency in delivering tokens immediately after target behaviors is critical to the system's effectiveness.",
  },
  {
    title: "Communication Board Layout",
    category: "tool-patterns",
    content:
      "Communication board layout affects how quickly a user can access vocabulary. Placing the most frequently used symbols in the center where motor access is easiest follows principles of motor planning. Consistent symbol placement across pages reduces cognitive load. Color-coding by word class (verbs in green, nouns in yellow) helps users learn to navigate the board faster.",
  },
  {
    title: "First-Then Board Usage",
    category: "tool-patterns",
    content:
      "First-then boards help children understand the sequence of a non-preferred demand followed by a preferred reward. The board must remain visible throughout the activity to function as a constant reminder. Choosing a highly motivating reinforcer for the 'then' section increases compliance with the 'first' demand. First-then boards work best when the demand is brief and clearly defined.",
  },
  {
    title: "Choice Board Design Principles",
    category: "tool-patterns",
    content:
      "Choice boards empower children by offering control within structured limits. Offering 2 to 4 choices is appropriate for most children; too many options creates decision overload. Including at least one highly preferred option increases engagement. Rotating choices regularly prevents satiation and keeps reinforcers powerful.",
  },
  {
    title: "Picture Symbol Selection",
    category: "tool-patterns",
    content:
      "Selecting appropriate picture symbols begins with understanding the child's visual processing level. Photographs of real objects are most concrete and are best for early learners. Line drawings with text labels work well for children who have had symbol exposure. Abstract symbols require explicit teaching. Symbols should be tested with the child before being added to a board.",
  },
  {
    title: "Visual Supports for Anxiety Reduction",
    category: "tool-patterns",
    content:
      "Visual supports reduce anxiety by making abstract expectations concrete and predictable. Countdown timers, written warnings like 'five more minutes,' and visual routines all help manage transition anxiety. Providing a visual 'end' to difficult activities reassures the child that demands are temporary. Consistent use of visual supports builds the child's ability to tolerate uncertainty over time.",
  },
  {
    title: "AAC Vocabulary Organization",
    category: "tool-patterns",
    content:
      "AAC vocabulary can be organized by semantic category, activity, or motor pattern. Core vocabulary pages prioritize high-frequency words; fringe pages hold topic-specific terms. Motor planning approaches use consistent symbol placement so the user's muscles learn the paths to commonly used words. Regular vocabulary reviews ensure the AAC system grows with the child's communication needs.",
  },
  {
    title: "Reinforcer Variety and Satiation Prevention",
    category: "tool-patterns",
    content:
      "A reinforcer that is always available or always used loses its motivating power over time. Rotating a menu of reinforcers—activities, social rewards, edibles, tokens—maintains their effectiveness. Preference assessments conducted regularly identify current high-preference items. Limiting access to preferred items outside of reinforcement contexts increases their value during intervention.",
  },
  {
    title: "Prompt Fading Strategies",
    category: "tool-patterns",
    content:
      "Prompt fading systematically reduces the level of support provided as the child gains independence. Time delay introduces a pause between the instruction and the prompt, giving the child a chance to respond first. Graduated guidance reduces physical support from full hand-over-hand to shadowing to no touch. Fading must be planned before intervention begins to prevent prompt dependency.",
  },
  {
    title: "Schedule Density for Visual Schedules",
    category: "tool-patterns",
    content:
      "Schedule density refers to how many activities or steps are included in a visual schedule. A dense schedule with many steps provides more predictability but may overwhelm some children. Starting with 3 to 5 steps and adding more as the child demonstrates readiness is a sound approach. Activity-based schedules organize steps within one activity; daily schedules cover the whole day.",
  },
  {
    title: "Errorless Learning in Tool Design",
    category: "tool-patterns",
    content:
      "Errorless learning is a teaching approach where prompts ensure the child always makes the correct response. This prevents practice errors from being reinforced and reduces frustration. In digital tools, this might mean limiting the choice set so only the correct answer is available at first. Errorless prompting is faded over time as the child gains fluency.",
  },
  {
    title: "Data Collection for Therapy Tools",
    category: "tool-patterns",
    content:
      "Effective data collection tracks whether the child is meeting the goals the tool was designed to support. Frequency data counts how often a behavior occurs. Duration data records how long a behavior lasts. Interval recording samples behavior at set intervals. Digital tools that log interactions automatically reduce the burden on therapists and parents.",
  },
  {
    title: "Communication Temptation Strategies",
    category: "tool-patterns",
    content:
      "Communication temptations are environmental arrangements that create a need for the child to communicate. Placing desired items in view but out of reach creates a mand opportunity. Giving small amounts of a preferred item so the child must request more is another common strategy. These setups support naturalistic language intervention by creating authentic communicative contexts.",
  },
  {
    title: "Visual Timers",
    category: "tool-patterns",
    content:
      "Visual timers show the passage of time in a concrete way, helping children understand how long an activity will last. Time Timer and digital countdown displays are common examples. Visual timers reduce time-related anxiety by making an abstract concept—duration—visible. They are especially useful during transitions, wait times, and work periods.",
  },
  {
    title: "Natural Environment Teaching with Communication Boards",
    category: "tool-patterns",
    content:
      "Communication boards used in natural environments are most effective when vocabulary matches the setting. A playground board might include 'swing,' 'slide,' 'push,' and 'friend.' Boards should be easily accessible during the activity, not stored in a bag. Teaching communication partners to prompt use of the board during play maximizes opportunities.",
  },
  {
    title: "Carryover Activities for Generalization",
    category: "tool-patterns",
    content:
      "Carryover activities bridge skills learned in therapy to everyday life. Home programs with simple, clear instructions help families implement strategies consistently. Using the same tools across home, school, and therapy settings promotes generalization. Brief training for all communication partners ensures consistent use of prompts and reinforcement.",
  },
  {
    title: "Parent-Implemented Interventions",
    category: "tool-patterns",
    content:
      "Parent-implemented interventions increase the intensity and consistency of therapy by extending it into the home environment. Parent coaching sessions teach caregivers to use evidence-based strategies naturally during daily routines. Research shows parent-implemented NLI significantly improves child language outcomes. Brief, practical guidance is more likely to be implemented consistently than lengthy training.",
  },
  {
    title: "Generalization Programming from the Start",
    category: "tool-patterns",
    content:
      "Planning for generalization at the start of intervention prevents skills from being locked to one setting or person. Using multiple trainers, varied materials, and different settings from early in training promotes broad generalization. Programming for generalization is not something added at the end; it is built into every phase of instruction.",
  },
  {
    title: "Environmental Arrangement for Communication",
    category: "tool-patterns",
    content:
      "Environmental arrangement modifies the physical setting to increase communication opportunities. Placing items on high shelves, putting preferred items in clear containers, and breaking routines intentionally all create reasons to communicate. This strategy works best when combined with responsive communication partners who acknowledge and respond to all communication attempts.",
  },
  {
    title: "Visual Schedule for Transitions",
    category: "tool-patterns",
    content:
      "Transition-specific visual schedules show the sequence of steps required to move from one activity to another. For example, a 'pack-up' schedule might show: put toys away, get backpack, put on shoes, wait by door. Breaking down transitions into visible steps reduces behavior problems that often occur during unpredictable change. Mastery of transition schedules builds independence over time.",
  },
  {
    title: "Adapting Tools for Individual Learners",
    category: "tool-patterns",
    content:
      "Every child is unique, and therapy tools must be adjusted to match the child's cognitive level, motor abilities, and interests. A token board for a younger child may have 3 tokens and a sticker as a reward; for an older child, it may have 10 tokens leading to screen time. The best tool is the one the child will actually engage with. Regular assessment of the tool's effectiveness informs adjustments.",
  },

  // ─── Developmental Milestones (22 entries) ────────────────────────────────
  {
    title: "Joint Attention Emergence (9-12 Months)",
    category: "developmental-milestones",
    content:
      "Joint attention typically emerges between 9 and 12 months of age. Infants begin to follow a caregiver's gaze and point to share interest in objects. Responding to joint attention (following a point) typically precedes initiating joint attention. Joint attention is one of the strongest predictors of later language development.",
  },
  {
    title: "Proto-Declarative Pointing (12 Months)",
    category: "developmental-milestones",
    content:
      "Around 12 months, typically developing children use proto-declarative pointing to share attention about objects and events. This gesture communicates 'look at that!' rather than 'give me that.' Proto-declarative pointing signals emerging Theory of Mind—the understanding that others have separate mental states. Absence of pointing by 12 months is an early indicator of communication concerns.",
  },
  {
    title: "First Words (12 Months)",
    category: "developmental-milestones",
    content:
      "Most children produce their first words around 12 months of age. First words are typically labels for people and objects in the child's immediate environment. A 'word' is a consistent sound pattern used with meaning, not just babbling. Parents often notice first words before clinicians because they hear the child most frequently.",
  },
  {
    title: "Two-Word Combinations (18-24 Months)",
    category: "developmental-milestones",
    content:
      "Typically developing children begin combining two words between 18 and 24 months. Combinations like 'more milk,' 'daddy go,' and 'big dog' emerge once the child has a single-word vocabulary of approximately 50 words. Two-word speech represents a significant leap in expressive language. Absence of two-word combinations by 24 months is a red flag that warrants evaluation.",
  },
  {
    title: "50-Word Vocabulary by 24 Months",
    category: "developmental-milestones",
    content:
      "A 50-word expressive vocabulary by age 24 months is a commonly cited developmental milestone. Children who do not reach this milestone are often identified as 'late talkers.' While some late talkers catch up without intervention, many benefit from early speech-language therapy. A vocabulary of 50 words is associated with the onset of two-word combinations.",
  },
  {
    title: "Symbolic Play Development",
    category: "developmental-milestones",
    content:
      "Symbolic play emerges around 18 to 24 months when children begin using objects to represent other objects, such as pretending a block is a car. By age 3, children engage in simple role play and pretend scenarios. Symbolic play is linked to language development because both involve using symbols to represent reality. Children with autism often show differences in the quality and quantity of symbolic play.",
  },
  {
    title: "Theory of Mind Development",
    category: "developmental-milestones",
    content:
      "Theory of Mind is the ability to understand that others have beliefs, desires, and knowledge different from one's own. Typically developing children demonstrate a basic Theory of Mind by age 4 on false-belief tasks. Theory of Mind is foundational to social interaction, conversation, and understanding deception and humor. Many children with autism have differences in Theory of Mind development.",
  },
  {
    title: "Executive Function Development",
    category: "developmental-milestones",
    content:
      "Executive function includes working memory, cognitive flexibility, and inhibitory control. These skills develop gradually throughout childhood and into early adulthood. Working memory allows children to hold instructions in mind while completing tasks. Executive function difficulties are common in autism and ADHD and contribute to challenges with transitions, task initiation, and rule-following.",
  },
  {
    title: "Sensory Processing in Development",
    category: "developmental-milestones",
    content:
      "Sensory processing involves integrating and responding to information from the senses. Typical development involves gradually habituating to sensory input and regulating responses. Children with sensory processing differences may be over-responsive (avoiding input) or under-responsive (seeking input). Sensory differences are common in autism and affect daily functioning, attention, and behavior.",
  },
  {
    title: "Imitation Development",
    category: "developmental-milestones",
    content:
      "Imitation is the ability to copy the actions and sounds of others. Imitation begins in early infancy with facial imitation and develops into object imitation by 9 to 12 months. Imitation is foundational to social learning, language acquisition, and pretend play. Children with autism often show deficits in imitation that affect their ability to learn from observation.",
  },
  {
    title: "Cause-and-Effect Understanding",
    category: "developmental-milestones",
    content:
      "Understanding cause and effect emerges in the sensorimotor stage of development. Infants begin to recognize that their actions produce predictable results, such as pressing a button to hear a sound. This understanding is foundational for intentional communication—recognizing that communicating produces a desired response. Cause-and-effect toys and activities support the development of intentional behavior.",
  },
  {
    title: "Peer Interaction Development",
    category: "developmental-milestones",
    content:
      "Peer interaction develops from parallel play (playing alongside peers without interaction) to associative and cooperative play. Cooperative play involving shared goals and role negotiation typically emerges around age 4. Peer relationships require social reciprocity, perspective-taking, and communication skills. Children with autism often need explicit teaching and structured supports to engage in peer interaction.",
  },
  {
    title: "Emotional Regulation (Ages 3-5)",
    category: "developmental-milestones",
    content:
      "Between ages 3 and 5, children develop increasing capacity to identify, express, and manage their emotions. They begin to label basic emotions and connect them to situations. With support, they learn strategies like deep breathing, taking a break, and asking for help. Children with autism often need explicit emotional regulation instruction and visual supports for identifying feelings.",
  },
  {
    title: "Reading Readiness Skills",
    category: "developmental-milestones",
    content:
      "Reading readiness includes phonological awareness, print awareness, letter knowledge, and oral language skills. Children who can identify and manipulate sounds in words (phonemic awareness) are better prepared for reading instruction. Reading readiness skills typically develop between ages 4 and 6. For children with autism, strong oral language and vocabulary support reading comprehension.",
  },
  {
    title: "Functional Communication Development",
    category: "developmental-milestones",
    content:
      "Functional communication refers to communication that reliably meets the child's everyday needs. Children typically develop a range of communicative functions including requesting, rejecting, commenting, greeting, and asking questions. When a child lacks functional communication, problem behaviors often emerge to serve these functions. Building functional communication is a top priority in ABA and speech-language therapy.",
  },
  {
    title: "Play-Based Learning",
    category: "developmental-milestones",
    content:
      "Play is the primary context for learning in early childhood. Through play, children develop language, social skills, problem-solving, and self-regulation. Play-based therapy embeds skill targets within motivating activities rather than structured drills. Research supports play-based approaches as effective for children with autism when guided by a skilled therapist.",
  },
  {
    title: "Self-Regulation Milestones",
    category: "developmental-milestones",
    content:
      "Self-regulation is the ability to manage one's emotions, attention, and behavior. Infants rely on caregivers for co-regulation; by age 5, children should show increasing self-regulation. Self-regulation supports academic readiness, social behavior, and response to frustration. Supports like visual schedules, sensory breaks, and social-emotional curricula build self-regulation skills.",
  },
  {
    title: "Transition Skills for Daily Living",
    category: "developmental-milestones",
    content:
      "Transition skills include the ability to shift from one activity or setting to another with minimal distress. Children develop transition flexibility gradually through predictable routines and explicit preparation. Visual warnings, timers, and transition objects help children prepare for changes. Transition difficulties are common in autism and can be addressed with structured visual supports.",
  },
  {
    title: "Independence in Daily Living Skills",
    category: "developmental-milestones",
    content:
      "Daily living skills include dressing, toileting, feeding, and personal hygiene. These skills develop gradually from complete dependence in infancy to independence in middle childhood. For children with developmental differences, explicit task analysis and visual supports accelerate skill acquisition. Daily living skill independence significantly impacts quality of life and family functioning.",
  },
  {
    title: "Pretend Play Stages",
    category: "developmental-milestones",
    content:
      "Pretend play progresses through recognizable stages. At 12 to 18 months, children perform familiar actions on themselves, such as pretending to drink. By 24 months, actions are extended to dolls and others. By 30 months, object substitution appears. Rich pretend play is associated with advanced language and theory of mind development.",
  },
  {
    title: "Early Social-Emotional Development",
    category: "developmental-milestones",
    content:
      "Social-emotional development begins at birth with attachment formation. By 6 months, infants show social smiles and early interest in faces. Stranger anxiety emerges around 8 to 9 months. Toddlers show empathy by offering comfort and imitating emotional expressions. Early social-emotional foundations support all later relationship and communication skills.",
  },
  {
    title: "Attention and Focus Milestones",
    category: "developmental-milestones",
    content:
      "Sustained attention develops gradually throughout childhood. Toddlers can focus for 2 to 5 minutes on a preferred activity. By age 5, children can attend to structured activities for 10 to 15 minutes. Attention difficulties are a core feature of ADHD and are also common in autism. Building attention skills supports responsiveness to instruction and play interaction.",
  },

  // ─── IEP Goals (22 entries) ───────────────────────────────────────────────
  {
    title: "SMART Goal Framework for IEPs",
    category: "iep-goals",
    content:
      "IEP goals must be Specific, Measurable, Achievable, Relevant, and Time-bound (SMART). A specific goal names the exact skill and context. Measurable goals include criteria for success such as '80% accuracy across 3 sessions.' Achievable and relevant goals are grounded in baseline data and the child's current needs. Time-bound goals specify a deadline, typically the annual IEP review date.",
  },
  {
    title: "Manding IEP Goal",
    category: "iep-goals",
    content:
      "A sample manding goal: 'Given a desired item out of reach, [child] will independently request the item using a 2-word phrase across 3 out of 4 opportunities in 4 consecutive sessions.' Baseline data must document the child's current manding rate and form. Mastery criteria should include generalization across settings and communication partners. This goal targets functional communication as a replacement for challenging behavior.",
  },
  {
    title: "Communication Board Use IEP Goal",
    category: "iep-goals",
    content:
      "A sample communication board goal: '[Child] will independently navigate to the correct page and select a symbol to make a request across 80% of opportunities across 3 consecutive data days.' This goal requires the child to access the device without prompting. Generalization criteria should specify multiple settings (home, school, therapy) and partners. Progress is measured by logging prompted vs. independent device use.",
  },
  {
    title: "Visual Schedule Independence IEP Goal",
    category: "iep-goals",
    content:
      "A sample visual schedule goal: '[Child] will independently complete a 5-step visual schedule by transitioning to each activity and checking off each step without verbal prompts across 4 out of 5 school days.' Baseline data should document current level of prompting needed. This goal supports independence in daily routines and reduces transition-related behavior. Fading prompts systematically is key to achieving this goal.",
  },
  {
    title: "Token Board Use IEP Goal",
    category: "iep-goals",
    content:
      "A sample token board goal: '[Child] will remain on task during a work period until earning 5 tokens, then independently choose a reinforcer from a choice board, across 4 out of 5 trials per day for 2 consecutive weeks.' This goal combines on-task behavior, self-monitoring, and choice-making. Baseline should document current token tolerance and typical work duration.",
  },
  {
    title: "First-Then Compliance IEP Goal",
    category: "iep-goals",
    content:
      "A sample first-then goal: '[Child] will complete a non-preferred 2-minute task (first) before accessing a preferred activity (then) with no more than one verbal reminder across 3 out of 4 daily opportunities.' This goal targets compliance with adult directives using a visual support. The non-preferred task should be gradually lengthened as the child meets criteria. Baseline documents current compliance rate without the first-then board.",
  },
  {
    title: "Choice-Making IEP Goal",
    category: "iep-goals",
    content:
      "A sample choice-making goal: '[Child] will indicate a preferred item or activity from a field of 2 choices by touching, pointing to, or vocalizing a selection within 10 seconds across 4 out of 5 opportunities.' Choice-making is a foundational self-determination skill. Expanding the choice set to 3 or 4 options is a natural next step. This goal also supports functional communication.",
  },
  {
    title: "Functional Communication Replacement Behavior Goal",
    category: "iep-goals",
    content:
      "A functional communication replacement goal teaches a communicative behavior that serves the same function as a challenging behavior. Example: '[Child] will hand a break card to an adult when in need of a break, replacing escape-maintained tantrum behavior, across 3 out of 4 opportunities across 3 consecutive sessions.' This goal requires FBA data to confirm the escape function. The replacement behavior must be at least as efficient as the problem behavior.",
  },
  {
    title: "Peer Interaction IEP Goal",
    category: "iep-goals",
    content:
      "A sample peer interaction goal: '[Child] will initiate a social exchange (greeting, invitation to play, or topic comment) with a peer across 2 out of 3 opportunities during structured free play with adult support available.' Baseline data should document current rate and form of peer initiations. Social skills groups and peer-mediated intervention are common supports for this goal.",
  },
  {
    title: "Sensory Break Request IEP Goal",
    category: "iep-goals",
    content:
      "A sample sensory break request goal: '[Child] will independently use a designated signal (card, symbol, or phrase) to request a sensory break when showing signs of dysregulation, across 3 out of 4 opportunities across 2 consecutive weeks.' This goal gives the child agency over their sensory needs while maintaining an appropriate request form. Baseline should document current self-regulation patterns and break-request attempts.",
  },
  {
    title: "Following Multi-Step Directions IEP Goal",
    category: "iep-goals",
    content:
      "A sample direction-following goal: '[Child] will follow 2-step unrelated directions with no more than one repetition across 4 out of 5 opportunities in 3 consecutive sessions.' Baseline should document current direction-following at the 1-step level. This goal supports classroom participation and transitions. Context clues should be eliminated to ensure comprehension of the verbal directions.",
  },
  {
    title: "Emotional Regulation IEP Goal",
    category: "iep-goals",
    content:
      "A sample emotional regulation goal: '[Child] will identify their feelings on a visual scale (calm, worried, frustrated, angry) and select an appropriate coping strategy from a visual menu with adult prompting, across 3 out of 4 occurrences of emotional dysregulation per week.' This goal builds emotional literacy and self-management. Baseline data should document frequency of dysregulation and current coping skill use.",
  },
  {
    title: "Requesting Help IEP Goal",
    category: "iep-goals",
    content:
      "A sample requesting-help goal: '[Child] will independently signal a need for assistance (raise hand, hand help card, or say help) within 30 seconds of encountering a difficult task, across 4 out of 5 opportunities.' Teaching children to request help is a high-priority self-advocacy skill. This goal reduces problem behavior that may be maintained by escape from difficult demands.",
  },
  {
    title: "Social Greeting IEP Goal",
    category: "iep-goals",
    content:
      "A sample social greeting goal: '[Child] will respond to a greeting (Hello, Hi) with a verbal or AAC greeting within 5 seconds across 3 out of 4 daily opportunities.' Generalization should include multiple people across multiple settings. Prompted greetings should be faded using time delay. This goal supports social integration and relationship building.",
  },
  {
    title: "Progress Monitoring for IEP Goals",
    category: "iep-goals",
    content:
      "IEP teams are required to monitor and report progress on annual goals at regular intervals. Progress monitoring data should be collected frequently enough to make instructional decisions. If a student is not making adequate progress, the IEP team should reconvene to revise the goal or change the intervention. Data-based decision-making ensures the IEP remains effective.",
  },
  {
    title: "Generalization Criteria in IEP Goals",
    category: "iep-goals",
    content:
      "Generalization criteria specify that a skill must be demonstrated in multiple settings, with multiple people, or across multiple materials. Without generalization criteria, a child may master a skill only in the training context. Including 'across 3 settings with 3 different adults' in a goal ensures the skill is truly functional. Generalization data is collected after mastery in the training setting.",
  },
  {
    title: "Mastery Criteria for IEP Goals",
    category: "iep-goals",
    content:
      "Mastery criteria define what level of performance constitutes goal achievement. Common formats include percent correct (80% accuracy), number of consecutive sessions (4 out of 5 sessions), or rate measures (3 independent initiations per day). Mastery criteria should be rigorous enough to ensure the skill is stable before moving to the next goal. Setting mastery criteria too low may lead to premature generalization attempts.",
  },
  {
    title: "Academic Readiness IEP Goals",
    category: "iep-goals",
    content:
      "Academic readiness goals address the prerequisite skills needed for formal instruction, such as matching, sorting, imitation, and joint attention. These goals are common in preschool and early elementary IEPs. Meeting academic readiness goals supports transition into general education classrooms. Skills like attending to a group and waiting one's turn are often included in this domain.",
  },
  {
    title: "Self-Care IEP Goals",
    category: "iep-goals",
    content:
      "Self-care IEP goals address daily living skills such as dressing, handwashing, and toileting. These goals use task analysis to break complex routines into teachable steps. Visual schedules and checklists are common supports for self-care goals. Mastery in self-care significantly improves family quality of life and the child's independence.",
  },
  {
    title: "Commenting and Labeling IEP Goal",
    category: "iep-goals",
    content:
      "A sample commenting goal: '[Child] will spontaneously label an item, action, or attribute in the environment without a prompt across 5 opportunities per 30-minute session across 3 consecutive sessions.' Commenting goals target tacting beyond requests, expanding communicative function. These goals support conversational language and social participation. Baseline data should document current rate of spontaneous comments.",
  },
  {
    title: "Imitation IEP Goal",
    category: "iep-goals",
    content:
      "A sample imitation goal: '[Child] will imitate a 3-step motor sequence demonstrated by the therapist within 5 seconds, with no more than one verbal prompt, across 4 out of 5 opportunities across 3 sessions.' Imitation goals often precede language goals because imitation is foundational to observational learning. Baseline data documents current imitation level and latency.",
  },
  {
    title: "Tolerating Changes in Routine IEP Goal",
    category: "iep-goals",
    content:
      "A sample flexibility goal: '[Child] will tolerate an unexpected change in the daily schedule when presented with a change card and brief verbal explanation, without engaging in more than minor protest (no self-injury or aggression), across 3 out of 4 occurrences per week.' This goal directly addresses the rigidity that is common in autism. Baseline data should document current reactions to schedule changes.",
  },
];
