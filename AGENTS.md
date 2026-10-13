# Project guidelines for coding agents

These instructions apply to this project and its subfolders unless a more specific `AGENTS.md` provides additional instructions. Read and follow them when working here. Keep this file named `AGENTS.md` so coding agents can discover it.

## 1. Follow SOLID principles

Use these principles to keep code easy to understand and change:

- **Single responsibility:** Give each module, class, or function one clear responsibility. Separate page display, application rules, database access, and calls to external services.
- **Open/closed:** Make it possible to add new behavior without repeatedly changing unrelated, working code.
- **Liskov substitution:** An implementation that replaces another must preserve the behavior its callers expect.
- **Interface segregation:** Keep interfaces small and focused. Do not make a component depend on methods it does not use.
- **Dependency inversion:** Keep application rules independent of specific databases and service providers. Pass dependencies into code where this makes them easier to replace or test.

Apply these ideas to functions and modules as well as classes. Use abstractions when they solve a real problem; do not add unnecessary classes or layers just to follow a pattern.

## 2. Make code modular

- Group related code by feature or responsibility, using the project's existing structure where possible.
- Separate reusable components, application logic, external service connections, and data access when their responsibilities differ.
- Keep module boundaries clear and avoid circular dependencies.
- Share genuinely reusable logic instead of copying it. Keep feature-specific logic close to its feature.

## 3. Keep code simple and readable

- Prefer straightforward code over clever shortcuts.
- Write small, focused functions and avoid deeply nested conditions. Use early returns when they improve clarity.
- Use the language's standard features and existing project tools before adding new dependencies.
- Remove unused code, outdated comments, and temporary debugging output.
- Add comments to explain reasons, assumptions, or unusual behavior. Do not describe every obvious statement.
- Build what the current requirements need. Avoid designing for hypothetical future features.

## 4. Use clear names

- Choose variable, function, class, file, and folder names that explain their purpose.
- Prefer names such as `findRelatedTopics`, `saveLearningSession`, and `selectedTopicId` over vague names such as `processData`, `handleStuff`, and `value`.
- Name functions after the action they perform and booleans after a clear condition, such as `isLoading` or `canSaveTopic`.
- Avoid unexplained abbreviations. Use consistent words for the same concept throughout the project.
- Follow the naming conventions of the language and existing codebase.

## 5. Keep files focused

- Do not put an entire feature or application into one large file.
- Split a file when it contains separate responsibilities, unrelated sections, or code that is difficult to navigate.
- Use meaningful folders and file names so another developer can find the relevant code quickly.
- Do not impose an arbitrary line limit or create many tiny files without a clear benefit. Clarity and responsibility determine when to split.

## 6. Understand the requirements before changing code

- Read the relevant project documents and nearby code before implementing a change.
- Use the latest agreed decisions in `STARTUP_IDEA.md`, `DEVELOPMENT_TASKLIST.md`, `PHASE_2_TECHNICAL_PLAN.md`, and `TOPIC_RELATIONSHIPS.md` when those documents are relevant.
- Keep optional features out of the first release unless the user asks to include them.
- Keep changes focused on the requested task. Preserve unrelated work and never undo another contributor's changes without a clear reason.
- Ask for clarification when conflicting requirements would materially change the result; otherwise proceed with a reasonable, stated assumption.

## 7. Handle errors and protect data

- Validate data at application boundaries, including user input and responses from external services.
- Handle missing data, failed requests, and unavailable services with clear behavior and useful messages.
- Check permissions on the server for protected operations. Do not rely only on checks in the interface.
- Keep secret API keys and credentials out of source code, browser code, logs, and committed files. Use appropriate environment variables or secret storage.
- Collect and log only the user data needed for the feature. Avoid exposing private information in error messages.

## 8. Verify changes appropriately

- Run relevant existing checks after changing code, such as formatting, type checks, builds, or focused tests.
- Add meaningful tests for important application rules, bug fixes, permissions, and failure cases when needed.
- Avoid tests that only repeat the implementation or unnecessary testing for simple documentation changes.
- Keep external service calls replaceable in tests. Clearly distinguish simulated checks from checks against a live service.
- Report what was checked and any checks that could not be completed. Do not claim a feature works without supporting evidence.

## 9. Keep documentation and handoffs useful

- Update relevant documentation when behavior, setup, or an agreed design changes.
- Document required configuration using example values, never real secrets.
- Summarize what changed, why it changed, how it was verified, and any remaining limitations in plain language.

## Guiding rule

Write code that another developer can understand, maintain, and extend without needing its original author to explain it.
