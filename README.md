# Jira Dashboard

A comprehensive dashboard for visualizing Jira project data, managing timesheets, and tracking team activity. Built with Next.js (Frontend) and Express/Prisma (Backend), it provides deeper insights and easier navigation than standard Jira views.

## 🚀 Features

*   **Portfolio Summary**: Aggregated view of all projects with health, schedule, and budget status.
*   **Project Overview**: Detailed metrics, burn rates, and timeline visualizations (Gantt/Stacked Bars) for Epics.
*   **Timesheet Management**: View member worklogs, drill down into daily activity, and export timesheets.
*   **Recent Activity**: Track team actions (comments, status changes) with user filtering and issue drill-down.
*   **Advanced Filtering**: Filter projects by custom JQL, status, and assignees with stored preferences.
*   **Quick Links**: Customizable sidebar for quick access to external project resources (PMI, Confluence, etc.).
*   **PMI Integration**: dedicated interaction for PMI tickets with search helper.

## 🛠️ Architecture

The project is divided into two main parts:

*   **`frontend/`**: Next.js (App Router) application using `jira.js` to communicate directly with Jira API for most read operations. It also syncs project data to our backend on login.
*   **`backend/`**: Node.js/Express application with Prisma ORM connecting to **MongoDB**. It stores persistent data (Stakeholders, Links, Overview, Filters) using a **Single Document Architecture** (Embedded Documents) for each project.

## 📋 Prerequisites

*   Node.js 18+
*   npm
*   A Jira Cloud instance and an API Token.
*   **MongoDB Database** (Cloud Atlas or Local).

## 🔧 Installation & Setup

### 1. Frontend Setup

Navigate to the frontend directory:
```bash
cd frontend
npm install
```

**Configuration:**
Create a `.env` (or `.env.local`) file in `frontend/`:
```env
JIRA_DOMAIN=your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

### 2. Backend Setup

Navigate to the backend directory:
```bash
cd backend
npm install
```

**Configuration:**
Create a `.env` file in `backend/`:
```env
DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/jira_dashboard"
PORT=3001
```

## 🏃‍♂️ Running the Application

### Start Frontend (Development)
```bash
cd frontend
npm run dev
```
Access the dashboard at [http://localhost:3000](http://localhost:3000).

### Start Backend (Development)
```bash
cd backend
npm run dev # If script exists, else `npx ts-node index.ts` (Check package.json)
```
*Note: The current backend setup in `package.json` only has a placeholder "test" script. You may need to run via `npx ts-node index.ts` if no dev script is configured yet.*

## 📖 Usage Guide

1.  **Dashboard Home**: View the high-level status of all projects.
2.  **Project Detail**: Click a project name to view its dedicated dashboard.
3.  **Timesheet**: Scroll down on the project page to view the team timesheet. Click "History" on any log to see what was done.
4.  **Quick Links**: Use the "Quick Links" sidebar on the project page. If "PMI" link is empty, a search popup will appear.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.
