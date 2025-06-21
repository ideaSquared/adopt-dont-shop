# LARGE FILE & COMPLEX CHANGE PROTOCOL

## MANDATORY PLANNING & EXECUTION PROTOCOL

When handling large files (>300 lines) or complex changes, follow the protocol below.

### 📌 PHASE 1: MANDATORY PLANNING

1. **Begin with a detailed plan _before_ making any edits**
2. The plan **must include**:

   - ✅ All functions or sections that need modification
   - ✅ The order in which changes should be applied
   - ✅ Dependencies between changes
   - ✅ Estimated number of separate edits

3. Use the following format for proposed plans:

### 🧾 PROPOSED EDIT PLAN TEMPLATE

**Working with:** `[filename]`  
**Total planned edits:** `[number]`

#### Edit Sequence:

1. `[First specific change]` — Purpose: `[why it's needed]`
2. `[Second specific change]` — Purpose: `[why it's needed]`
3. ...

_Do you approve this plan?_ I will proceed with **Edit [number]** after explicit user confirmation.

### 🛠️ MAKING EDITS

- Focus on **one conceptual change at a time**
- Provide **before/after code snippets** with concise explanations
- Ensure each change matches the **project's coding style and conventions**
- Follow **SOLID principles** and emphasize **readability and testability**
- No TODOs, placeholders, or incomplete stubs

## 🚦 EXECUTION PHASE

- After each confirmed edit, mark progress with:

```
✅ Completed edit [#] of [total]. Ready for next edit?
```

- If unexpected complexity or scope creep is discovered:
  - ⛔ Stop immediately
  - 📋 Update the edit plan
  - 📣 Wait for user approval before continuing

## 🔄 REFACTORING GUIDANCE

- Break work into **logical, independently functional chunks**
- Ensure each intermediate state is **stable and functional**
- Use **temporary duplication** if necessary to maintain continuity
- Clearly state the **refactoring pattern** used (e.g., Extract Method, Move Function)

## ⏱️ RATE LIMIT AVOIDANCE

- For large files:
  - Propose splitting changes across **multiple sessions**
  - Prioritize edits that are **logically complete**
  - Define clear **stopping points** for review and approval

Each new feature or request must include:

- ✅ A complete **Product Requirements Document (PRD)** describing:

  - Feature summary
  - User stories or behavioral expectations
  - Acceptance criteria
  - Constraints or technical notes

- ✅ An **AI-managed decision log** noting:
  - EVERY decision made
  - All architectural choices
  - Trade-offs considered
  - All changes made
