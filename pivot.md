Below is a tighter product spec focused on user flows for the SLP tool builder.

Product frame

Product goal

Help non-technical SLPs create and publish custom speech therapy mini apps for individual children without coding.

Primary jobs to be done

The platform should let an SLP:
	•	create a child profile
	•	choose a therapy tool template
	•	customize it quickly
	•	preview it instantly
	•	publish it to a parent/child-friendly experience
	•	track basic usage and progress

⸻

Core users

1. SLP

Main builder user.

Needs:
	•	speed
	•	simplicity
	•	customization
	•	reusable templates
	•	parent sharing
	•	confidence that the output “just works”

2. Parent/Caregiver

Uses assigned tools at home.

Needs:
	•	simple access
	•	clear instructions
	•	low-friction interaction
	•	visible child progress

3. Clinic/Admin

Optional in MVP-lite, but important later.

Needs:
	•	therapist seats
	•	child management
	•	billing
	•	organization-level oversight

⸻

Product scope for MVP

Included
	•	therapist accounts
	•	child profiles
	•	template library
	•	tool builder
	•	live preview
	•	publish/share
	•	parent access
	•	basic analytics
	•	versioned app instances

Excluded for v1
	•	custom code generation
	•	open-ended design canvas
	•	advanced AI agent orchestration
	•	teletherapy/video calling
	•	full EMR/practice management
	•	deep reporting
	•	insurance workflow

⸻

Main product objects

Child profile

Contains:
	•	name
	•	age range
	•	therapy goals
	•	interests
	•	preferred reinforcers
	•	communication level
	•	assigned tools

Template

A reusable tool type.

Examples:
	•	AAC board
	•	first/then board
	•	token board
	•	matching game
	•	visual schedule
	•	sentence builder

Tool instance

A customized version of a template for one child.

Example:
	•	Template: AAC board
	•	Child: Liam
	•	Title: Snack Request Board
	•	Config: 8 buttons, custom images, speech phrases

Assignment

Connection between a tool instance and a parent/child access path.

Session event

Recorded usage data:
	•	opened
	•	tapped button
	•	completed activity
	•	correct/incorrect
	•	duration

⸻

User flows

Flow 1: First-time SLP onboarding

Goal

Get an SLP from signup to first published tool as fast as possible.

Steps
	1.	SLP signs up
	2.	Chooses practice type:
	•	solo
	•	clinic
	•	school
	•	parent-only
	3.	Sees a welcome wizard:
	•	create first child
	•	choose first template
	•	customize and publish
	4.	Creates child profile
	5.	Selects template
	6.	Customizes tool
	7.	Previews tool
	8.	Publishes tool
	9.	Copies share link or assigns to parent portal

Success metric

First published tool in under 10 minutes.

UX notes
	•	do not drop them into a blank dashboard first
	•	use a guided wizard
	•	preload example content
	•	show immediate preview

⸻

Flow 2: Create a child profile

Goal

Set up a child once so future tools are faster and more personalized.

Steps
	1.	SLP clicks “Add Child”
	2.	Fills simple form:
	•	child display name
	•	age range
	•	therapy goals
	•	interests
	•	reinforcers
	•	optional notes
	3.	Saves profile
	4.	Platform suggests relevant templates

Outputs
	•	saved child record
	•	profile metadata used for suggestions
	•	faster future tool creation

UX notes

Keep this lightweight. Avoid medical-document feeling in v1.

⸻

Flow 3: Choose a template

Goal

Help SLP quickly find the right tool type.

Steps
	1.	SLP opens template library
	2.	Filters by:
	•	goal
	•	age range
	•	skill type
	•	use case
	3.	Sees cards like:
	•	AAC Board
	•	Token Board
	•	First/Then Board
	•	Matching Game
	4.	Clicks a template
	5.	Sees:
	•	what it does
	•	who it’s for
	•	quick preview
	•	estimated setup time
	6.	Selects “Use Template”

UX notes

Each template should answer:
	•	what problem it solves
	•	what setup is required
	•	what child-facing result looks like

⸻

Flow 4: Customize an AAC board

Goal

Create a child-specific communication board quickly.

Steps
	1.	SLP chooses AAC Board
	2.	Builder opens with:
	•	settings panel on left
	•	live preview on right
	3.	SLP configures:
	•	title
	•	grid size
	•	buttons
	•	image per button
	•	label text
	•	spoken phrase
	•	colors/options
	4.	SLP can:
	•	upload images
	•	reuse saved media
	•	duplicate buttons
	•	reorder buttons
	5.	Preview updates live
	6.	SLP tests tap-to-speak
	7.	Saves as draft or publishes

Key interactions
	•	add button
	•	edit button
	•	delete button
	•	drag reorder
	•	preview speech/audio

Success metric

Board created in under 5 minutes after familiarity.

⸻

Flow 5: Customize a learning game

Goal

Let the SLP make a simple child-friendly game without any game-design complexity.

Steps
	1.	SLP chooses matching game
	2.	System asks:
	•	match picture to picture?
	•	word to picture?
	•	category match?
	3.	SLP adds items
	4.	Chooses difficulty:
	•	number of cards
	•	feedback style
	•	timer on/off
	5.	Chooses reinforcement:
	•	sound
	•	stars
	•	animation
	6.	Previews the game
	7.	Publishes

UX notes

The SLP should edit content, not mechanics. Mechanics stay constrained.

⸻

Flow 6: Preview before publish

Goal

Give the SLP confidence before sharing.

Steps
	1.	SLP clicks Preview
	2.	System shows:
	•	tablet view
	•	mobile view
	•	fullscreen child mode
	3.	SLP can interact with it
	4.	SLP returns to edit if needed
	5.	Clicks Publish

Preview modes
	•	therapist preview
	•	child mode
	•	parent view with instructions

UX notes

Preview should feel nearly identical to final runtime.

⸻

Flow 7: Publish and share

Goal

Get the tool into real use immediately.

Steps
	1.	SLP clicks Publish
	2.	System creates a published version
	3.	SLP chooses delivery:
	•	copy secure link
	•	assign to parent portal
	•	print/export where applicable
	4.	System shows confirmation
	5.	SLP can send link directly

Output
	•	published app version
	•	share token or assignment record
	•	audit trail

UX notes

Publishing should never overwrite silently. Version each published release.

⸻

Flow 8: Parent uses assigned tool

Goal

Make home use easy and frustration-free.

Steps
	1.	Parent opens link or logs into portal
	2.	Sees assigned tools for the child
	3.	Opens a tool
	4.	Uses it with child
	5.	System logs usage
	6.	Parent optionally sees a simple completion message

Parent portal should show
	•	tool title
	•	thumbnail
	•	simple instructions
	•	last used
	•	recommended today

UX notes

No jargon. No complex menus. Extremely simple.

⸻

Flow 9: SLP reviews progress

Goal

Quickly understand if tools are being used and how the child is engaging.

Steps
	1.	SLP opens child profile
	2.	Clicks “Progress”
	3.	Sees summary:
	•	sessions this week
	•	most used tools
	•	button taps / completions
	•	activity accuracy where relevant
	•	last active date
	4.	Can drill into one tool
	5.	Sees event summary and trends

UX notes

For v1, keep it lightweight and practical rather than clinical.

⸻

Flow 10: Edit an existing tool

Goal

Allow quick iteration as therapy goals change.

Steps
	1.	SLP opens existing tool
	2.	Clicks Edit
	3.	System opens current config in builder
	4.	SLP changes content
	5.	Saves as:
	•	draft update
	•	new published version
	6.	Existing old version remains in history

Why this matters

Child goals evolve constantly. Editing must be frictionless.

⸻

Flow 11: Reuse a tool as a template for another child

Goal

Avoid rebuilding from scratch.

Steps
	1.	SLP opens an existing tool
	2.	Clicks “Duplicate”
	3.	Chooses another child
	4.	Edits only what is child-specific
	5.	Publishes new version

UX notes

This is a major retention feature. Therapists love reusable building blocks.

⸻

MVP information architecture

Main navigation
	•	Dashboard
	•	Children
	•	Templates
	•	My Tools
	•	Parent Sharing
	•	Progress
	•	Settings

Dashboard

Shows:
	•	recent children
	•	drafts
	•	recently published tools
	•	parent activity summary
	•	quick create button

Children

List of child profiles.

Templates

Template library with filters.

My Tools

All created tool instances.

Parent Sharing

Assignments and links.

Progress

Usage and activity summaries.

⸻

Detailed page-level flow

Dashboard

Entry actions:
	•	Create new child
	•	Create new tool
	•	Resume draft
	•	View recent activity

Child profile page

Sections:
	•	Overview
	•	Goals and preferences
	•	Assigned tools
	•	Progress
	•	Notes

Main actions:
	•	Create tool for this child
	•	Duplicate tool
	•	View parent access

Template detail page

Sections:
	•	use case
	•	preview
	•	setup fields summary
	•	examples
	•	start button

Builder page

Main areas:
	•	top bar: save, preview, publish
	•	left sidebar: configuration fields
	•	center/right: live preview
	•	bottom or modal: asset manager

Published tool page

Modes:
	•	therapist preview
	•	parent view
	•	child runtime

⸻

AI-assisted flows

AI should be optional and assistive.

Flow 12: AI-assisted first draft generation

Goal

Help the SLP create content faster.

Steps
	1.	SLP selects child
	2.	Clicks “Generate first draft”
	3.	Inputs or uses child goals/interests
	4.	AI suggests:
	•	button labels
	•	sample phrases
	•	matching pairs
	•	reward ideas
	5.	SLP reviews and edits
	6.	Saves tool

Guardrails
	•	AI only fills structured fields
	•	AI does not generate arbitrary app code
	•	SLP approves all output before publish

⸻

Functional requirements by flow

Authentication
	•	email/password or magic link
	•	role-based access
	•	organization support later

Child management
	•	create/edit/archive child
	•	goal tagging
	•	preference metadata

Template engine
	•	schema-based configuration
	•	reusable components
	•	versioning support

Builder
	•	draft save
	•	live preview
	•	media upload
	•	validation
	•	publish workflow

Runtime
	•	fast load
	•	touch-first
	•	event tracking
	•	accessibility options

Sharing
	•	secure share link
	•	parent portal assignment
	•	expiration options later

Analytics
	•	event logging
	•	per-tool summaries
	•	per-child summaries

⸻

Non-functional requirements

Performance
	•	published tools should load fast on tablets and phones
	•	builder preview should feel instant

Accessibility
	•	large touch targets
	•	readable contrast
	•	optional reduced clutter modes
	•	text + image + audio support

Safety and privacy
	•	secure child records
	•	role-based visibility
	•	audit logging for publish/edit actions
	•	minimal sensitive data in MVP

Reliability
	•	drafts auto-save
	•	published versions immutable
	•	bad edits should not break a live tool

⸻

Example UX rules

Therapist builder rules
	•	never start from a blank screen unless explicitly requested
	•	always provide a default example
	•	always show live preview
	•	constrain choices so creation is easy

Child-facing rules
	•	minimal text
	•	large buttons
	•	predictable feedback
	•	no hidden interactions
	•	no dense menus

Parent-facing rules
	•	easy entry
	•	clear instructions
	•	one-click launch
	•	simple progress signals

⸻

Suggested v1 templates and flows

1. AAC Board

Best for communication requests.
Flow complexity: medium
Priority: highest

2. First/Then Board

Best for transitions and behavior support.
Flow complexity: low
Priority: highest

3. Token Board

Best for reinforcement.
Flow complexity: low
Priority: high

4. Matching Game

Best for vocabulary/concepts.
Flow complexity: medium
Priority: high

5. Visual Schedule

Best for routines and transitions.
Flow complexity: low
Priority: high

⸻

Database-oriented flow mapping

When SLP creates a tool

Creates:
	•	app_instance
	•	config_json
	•	draft status

When SLP publishes

Creates/updates:
	•	published version
	•	share token or assignment
	•	published timestamp

When parent uses a tool

Creates:
	•	session start event
	•	interaction events
	•	completion event
	•	session summary

When SLP edits later

Creates:
	•	new version record
	•	updated config
	•	prior version retained

⸻

Lean event model

For v1, log only a small set of universal events:
	•	app_opened
	•	app_closed
	•	item_tapped
	•	answer_correct
	•	answer_incorrect
	•	activity_completed
	•	token_added
	•	audio_played

That is enough to build useful summaries.

⸻

Recommended MVP build order

Phase 1
	•	auth
	•	child profiles
	•	template registry
	•	AAC board builder/runtime
	•	publish/share link

Phase 2
	•	first/then board
	•	token board
	•	visual schedule
	•	basic analytics

Phase 3
	•	matching game
	•	parent portal
	•	duplication/versioning polish
	•	AI content suggestions

⸻

Clean spec summary

Product thesis

Non-technical SLPs do not want to design software. They want to quickly produce child-specific therapy tools from trusted templates.

Core architecture
	•	React/Next.js builder
	•	schema-driven templates
	•	config-driven runtime apps
	•	publishable secure web experiences
	•	lightweight progress tracking

Core UX principle

Template-first, guided, preview-driven creation.

Core user flow

Create child → choose template → customize → preview → publish → share → review usage → iterate.

Next, I can turn this into a wireframe-level screen spec with each page broken into sections, buttons, fields, and components.