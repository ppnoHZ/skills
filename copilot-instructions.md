# GitHub Copilot Instructions for BPM Web Monorepo

## Project Overview
This is a **Vue 3** + **TypeScript** monorepo (pnpm + turbo) for a Business Process Management (BPM) platform. Provides a low-code Form Editor, Form Runtime, and Workflow management.

## Architecture

### Package Structure
- **`bpm-web`**: Main aggregation application (Shell).
- **`bpm-form-editor`**: Drag & drop form designer.
- **`bpm-form-runtime`**: Runtime engine to render JSON form definitions.
- **`bpm-form-components`**: Shared UI components (Atomic + Business widgets).
- **`bpm-common`**: Core business logic, storage, services, and base abstractions.
- **`bpm-workflow`**: BPMN workflow visualization and interaction.

### Key Architectural Patterns
1.  **Controller Pattern (`bpm-common`)**:
    -   Business logic is encapsulated in class-based controllers (e.g., `FormController`, `EditorController`) rather than directly inside Vue components.
    -   Reference: `packages/bpm-common/src/controller/FormController.ts`
2.  **Component Wrapper (`FdComponent`)**:
    -   Form widget interaction is standardized via the `FdComponent` class, providing a unified API (`getProps`, `setProps`) over raw Vue refs.
    -   Reference: `packages/bpm-form-components/src/component.ts`
3.  **State Management**:
    -   Uses **Pinia** for global state.
    -   `FormController` often bridges Pinia stores (`useFormStore`) and component logic.

## Development Workflows

### Build & Run
- **Package Manager**: `pnpm` (managed via `turbo` for task orchestration).
- **Commands**:
    -   `pnpm editor start`: Run Form Editor locally.
    -   `pnpm form start`: Run Form Runtime locally.
    -   `pnpm dev`: Run main `@bpm/web` app.
    -   `pnpm common`, `pnpm components`: Filtered scope for utilities/components.

### Tech Stack
-   **Core**: Vue 3, Vite, TypeScript.
-   **UI Library**: Ant Design Vue (`ant-design-vue`), Internal `@qes/components`.
-   **Diagramming**: `bpmn-js` (Workflow), `diagram-js`.
-   **Utils**: `lodash-es`, `dayjs`, `axios`.

## Coding Conventions
1.  **Internal Dependencies**:
    -   Reference workspace packages via `workspace:*` valid in `package.json`.
    -   Use `@qes/*` for internal organization utility libraries.
2.  **Styles**:
    -   Use Less (`.less`) for styling.
    -   Stylelint is configured; follow standard CSS ordering.
3.  **Component Design**:
    -   When modifying form widgets (`bpm-form-components`), ensure they implement `IComponentCommonProps` and register correctly with the runtime via `FdComponent` if interactive.

## Common Tasks
-   **Adding a new UI Component**:
    1.  Create Vue component in `bpm-form-components/src/components`.
    2.  Export via `bpm-form-components/src/index.tsx`.
    3.  Ensure corresponding types exist in `bpm-types`.
-   **Modifying Form Logic**:
    -   Check `FormController.ts` in `bpm-common` first. Avoid putting complex business logic in `.vue` generic runtime files.

## AI Copilot System
Located in `packages/bpm-form-components/src/components/chat`.

### Core Components
- **`Copilot.vue`**: The main chat container. Integrates `ant-design-x-vue` for the message stream and input.
- **`useChatMessages` (hook.ts)**: Encapsulates SSE streaming logic, message state management, and reasoning (COT) processing.
- **`AITip.vue`**: A small popover trigger placed next to form items for quick AI assistance.

### Key Logic
- **Prompt Transformation**: Templates using `${fieldKey}` are dynamically replaced with current form values via `transformPromptValue` in `utils.ts`.
- **Stream Parsing**: AI responses are parsed from JSON lines using `parseAIStreamData`, supporting content delta, reasoning deltas, and form schema updates.
- **State Selection**: Only one `AITip` can be active at a time, managed via `activeAiTipKey` provided by `Form.vue`.

## Internationalization (i18n)
- **Locale Directories**:
  - Common: `packages/bpm-common/src/locales/lang/[zh-CN|en-US]`.
  - Main App: `packages/bpm-web/src/locales/lang/[zh-CN|en-US]`.
- **Namespacing**: Each `.ts` file in the locale directory automatically becomes a namespace based on its filename (e.g., `ai-prompt.ts` -> `ai-prompt.*`).
- **Usage (Composition API)**:
  ```typescript
  import { useI18n } from 'bpm-common/src/hooks/useI18n';
  const { t } = useI18n();
  // Example: t('ai-prompt.save')
  ```
- **Conventions**:
  - Prefer adding shared business strings to `bpm-common`.
  - Use kebab-case for filenames/namespaces and camelCase for translation keys.

