    # Smart Error Tracker Web

    `apps/web` contains the React + Vite dashboard for Smart Error Tracker.

    ## Scope

    The web app currently covers four product surfaces:

    - Dashboard welcome and onboarding
    - Project listing and creation
    - Project setup with SDK snippets and API key guidance
    - Issue list and issue detail investigation

    ## Main Flow

    ```text
    /dashboard
        -> /projects
        -> /projects/new
        -> /projects/:id/setup
        -> /projects/:id/issues
    ```

    The main issues workspace is still available at `/issues`, and issue detail remains at `/issues/:id`.

    ## Routes

    | Route | Purpose |
    | --- | --- |
    | `/dashboard` | Welcome page with onboarding checklist, summary cards, and recent issue preview |
    | `/projects` | Project list with setup and issues entry points |
    | `/projects/new` | Minimal project creation form |
    | `/projects/:id/setup` | Guided setup page with install, initialization, API key, and test-event steps |
    | `/projects/:id/issues` | Project-aware bridge into the issues workspace |
    | `/issues` | Main live issue list for the currently connected project |
    | `/issues/:id` | Issue detail page |
    | `/settings` | Minimal workspace settings page |

    ## Environment

    Create `apps/web/.env.local`:

    ```dotenv
    VITE_API_BASE_URL="http://localhost:3000"

    # Optional: pre-connect the dashboard to a project
    # VITE_API_KEY="set_your_generated_api_key"

    # Optional: enable local admin-backed project creation
    # VITE_ADMIN_TOKEN="dev-admin-token"
    ```

    Notes:

    - `VITE_API_KEY` is optional. Without it, the dashboard still renders and guides the user through setup.
    - `VITE_ADMIN_TOKEN` must match the API `ADMIN_TOKEN` if you want to create projects and generate keys from the UI.
    - If `VITE_ADMIN_TOKEN` is missing, the app falls back to local draft project state for onboarding.

    ## Development

    From the repository root:

    ```bash
    pnpm --filter web dev
    pnpm --filter web build
    ```

    Default dev URL:

    - `http://localhost:5173`

    ## Notes

    - The design system is intentionally reused across dashboard, projects, setup, and issues.
    - The `/projects/:id/issues` route is a thin product-flow wrapper. The live issue list continues to be powered by the existing `/issues` experience.
    - API key generation and project listing depend on the local `/admin/*` endpoints.
