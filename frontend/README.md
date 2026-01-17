# Frontend Application

A Next.js 14+ application serving as the UI for the Jira Dashboard.

## 🛠️ Tech Stack

*   **Framework**: Next.js (App Router)
*   **Language**: TypeScript
*   **Styling**: Vanilla CSS, module CSS
*   **Jira Client**: `jira.js`
*   **Backend Integration**: Custom Express API (for MongoDB persistence)
*   **Charts**: Recharts

## 🚀 Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Configuration**:
    Create a `.env` (or `.env.local`) file:
    ```env
    JIRA_DOMAIN=your-domain.atlassian.net
    JIRA_EMAIL=your-email@example.com
    JIRA_API_TOKEN=your-api-token
    ```

## 🏃‍♂️ Running

*   **Development**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

*   **Production Build**:
    ```bash
    npm run build
    npm start
    ```

## 📂 Key Components

*   `src/app`: App Router pages and layouts.
*   `src/components`: Reusable UI components (Timesheet, FilterManager, ProjectListTable).
*   `src/actions`: Server Actions for data fetching and mutations.
*   `src/lib`: Utilities and Jira client configuration.
