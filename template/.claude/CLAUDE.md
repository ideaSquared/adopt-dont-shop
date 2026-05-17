# CLAUDE.md

Behavioural guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgement.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" -> "Write tests for invalid inputs, then make them pass"
- "Fix the bug" -> "Write a test that reproduces it, then make it pass"
- "Refactor X" -> "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

# Project-Specific Guidelines

## Testing

- Write tests first (TDD)
- Test behaviour, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always

**Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Jest (libs) + Vitest (apps & service)
- **State Management**: Prefer immutable patterns

## TypeScript Guidelines

- No `any` - use `unknown` if a type is truly unknown
- No type assertions unless absolutely necessary with clear justification
- No `@ts-ignore` or `@ts-expect-error` without explicit explanation
- Prefer `type` over `interface`
- Use Zod or any Standard Schema compliant schema library for runtime validation

## Code Style

- No data mutation - work with immutable data structures
- Pure functions wherever possible
- No nested if/else - use early returns, guard clauses, or composition
- Avoid deep nesting (max 2 levels)
- Keep functions small and focused

## Backend Patterns (Express)

Architecture: **Controllers -> Services -> Models**

- Controllers handle HTTP req/res only, no business logic
- Services contain business logic, are pure and testable
- Models define data shape and persistence
- Throw errors from services; let middleware handle HTTP responses

## Frontend Patterns (React + Vite)

- Functional components only
- Custom hooks start with `use`
- Prefer React Query for server state
- Prefer Context for shared UI state
- Local `useState` for component-specific state

## Monorepo Awareness

- Understand which packages depend on your changes
- Build libraries before testing dependent apps (Turbo handles this via `dependsOn`)
- Test changes in the context of the full application
- Update shared types consistently across packages
