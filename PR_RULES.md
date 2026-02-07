# AI PR Reviewer - Custom Rules

This file allows you to define custom rules that the AI should follow when reviewing Pull Requests.

## General Guidelines
- [ ] **Utility Functions:** Ensure all utility functions are placed in the `utils/` directory.
- [ ] **Error Handling:** All async operations must have try/catch blocks.
- [ ] **Comments:** Public functions must have JSDoc comments.
- [ ] **Variables:** Use `const` over `let` whenever possible.

## Project Specific
- [ ] **Components:** React components should be functional components.
- [ ] **Testing:** New logic must include unit tests.
