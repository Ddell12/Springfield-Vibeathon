# Artifact Order & Dependencies

## Recommended Order

```
1. User Journeys ──→ 2. Data Flow ──→ 5. AI Behavior Spec
       │                    │
       └──→ 3. Screen Inventory ──→ 4. Permissions Matrix ──→ 6. Billing Flow
                    │                       │                        │
                    ├──→ 7. Onboarding      │                        │
                    │                       │                        │
                    │                       │          8. Notification Map ┘
                    │                       │                        │
                    │                       │          9. Background Jobs ┘
                    │                       │                        │
                    └───────────────────────┴──→ 10. Convex Functions ┘
                                                                     │
                                                 11. Deployment & Infra ┘
```

## Dependencies

| # | Artifact | Needs First | Can Skip If |
|---|---|---|---|
| 1 | User Journeys | Nothing | Never — always start here |
| 2 | Data Flow | User Journeys | — |
| 3 | Screen Inventory | User Journeys | — |
| 4 | Permissions Matrix | Screen Inventory | Single role / no tiers |
| 5 | AI Behavior Spec | User Journeys, Data Flow | App isn't AI-powered |
| 6 | Billing Flow | Permissions Matrix | App is free for MVP |
| 7 | Onboarding Spec | Screen Inventory, User Journeys | — |
| 8 | Notification Map | User Journeys, Billing Flow | No emails beyond auth |
| 9 | Background Jobs | Data Flow, Notification Map | No async work / crons needed |
| 10 | Convex Function Inventory | Data Flow, Screen Inventory, Permissions Matrix, Background Jobs | — |
| 11 | Deployment & Infra | All above | — (always do last) |

## Minimum Viable Set (Hackathon Mode)

If you only have time for 5 artifacts:
1. **User Journeys** — what users do
2. **Screen Inventory** — what they see
3. **Data Flow** — Convex schema + entities
4. **Convex Function Inventory** — queries, mutations, actions
5. **Deployment & Infra** — env vars + deploy config

Add AI Behavior Spec as #6 if the app is AI-powered.

## Parallel Opportunities

After User Journeys is done, Data Flow + Screen Inventory can run in parallel.
After both are done, Permissions Matrix + AI Behavior Spec can run in parallel.
After Billing Flow + Notification Map, Background Jobs can start.
