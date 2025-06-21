# 🚨 MANDATORY DECISION LOGGING REQUIREMENTS 🚨

## NON-NEGOTIABLE INSTRUCTION

Every significant decision MUST be documented in the decision log. This is a **MANDATORY REQUIREMENT** with **NO EXCEPTIONS**.

> ⚠️ **WARNING**: Failing to document decisions is considered incomplete work. All significant technical decisions MUST be documented.

## When to Log Decisions (REQUIRED)

Document decisions when:

- Choosing between multiple implementation approaches
- Selecting technologies or libraries
- Creating architectural designs
- Establishing patterns or conventions
- Making security-related decisions
- Optimizing for performance
- Refactoring or restructuring code
- Implementing new features
- Fixing complex bugs with multiple possible approaches

## Decision Log Format

Use ONLY this tabular markdown format when adding to the decision log (`decision-log.md`):

```markdown
| Date       | Decision                | Context                      | Options Considered                                 | Selected Option   | Reasoning                                      | Implementation Notes                     | Future Considerations                         | References                               |
| ---------- | ----------------------- | ---------------------------- | -------------------------------------------------- | ----------------- | ---------------------------------------------- | ---------------------------------------- | --------------------------------------------- | ---------------------------------------- |
| YYYY-MM-DD | Brief title of decision | Brief description of context | 1. Option 1 - pros/cons<br>2. Option 2 - pros/cons | The chosen option | Key reasoning point 1<br>Key reasoning point 2 | Files affected<br>Implementation details | Potential future impacts<br>Things to revisit | Links to documentation<br>Related issues |
```

## Decision Documentation Workflow

### 1. Before Making Changes

Before implementing any significant change:

- Identify the decision point
- Research available options
- Consider trade-offs

### 2. During Implementation

While implementing:

- Document files/components affected
- Keep notes on implementation details
- Record any unexpected challenges

### 3. After Completion

After implementing:

- Add a complete row to the decision log
- Include all columns with detailed information
- Place the entry in the appropriate section (Architectural Decisions or Trade-offs)

### 4. Self-Verification Checklist

✅ Did I document the decision with today's date?  
✅ Did I clearly explain the context/problem?  
✅ Did I list multiple options that were considered?  
✅ Did I justify why the selected option was chosen?  
✅ Did I document implementation details?  
✅ Did I note future considerations?  
✅ Did I include references?

## Integration With Other Processes

### Edit Protocol Integration

When following the edit protocol for large files:

- Include decision logging as an explicit step in your plan
- Document decisions BEFORE making major changes
- Update the decision log AFTER completing the implementation

### Feature Development Integration

When developing new features:

- Include decision logging in your development process
- Document ALL architectural and implementation decisions
- Ensure decision log entries match the implemented solution

## Example Entry

```markdown
| Date       | Decision                | Context                                                              | Options Considered                                                                                                                                   | Selected Option                        | Reasoning                                                                                                       | Implementation Notes                                                                                                               | Future Considerations                                                                                       | References                                     |
| ---------- | ----------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 2025-05-27 | Database Index Strategy | Users experience slow response times when filtering large watchlists | 1. Composite indexes - Fast reads, high write overhead<br>2. Single-column indexes - Balanced approach<br>3. No indexes - No overhead but poor reads | Single-column indexes on common fields | 1. Read-heavy pattern<br>2. Acceptable write overhead<br>3. PostgreSQL planner works well with multiple indexes | 1. Added indexes on user_id, tmdb_id, media_type, status<br>2. Modified WatchlistEntry.ts model<br>3. Updated watchlist.service.ts | 1. Monitor query performance<br>2. Consider composite indexes if needed<br>3. Add caching if issues persist | PostgreSQL indexing documentation<br>Issue #42 |
```

## Decision Significance Threshold

A decision is considered significant if ANY of the following apply:

- It affects multiple parts of the codebase
- It involves choosing between 2+ valid alternatives
- It establishes a pattern that may be followed elsewhere
- It might impact performance, security, or user experience
- It involves trade-offs between competing priorities
- It represents a deviation from existing patterns
- It will be difficult or costly to change later

## Final Reminder

**At the end of EVERY response where you've made significant decisions**, you MUST:

1. Verify that you've documented your decisions
2. Update the decision log if you haven't already
3. Explicitly state that you've documented your decisions
