# Backend Service

A Node.js/Express service providing API endpoints and database connectivity for the Jira Dashboard.

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database**: MongoDB (via Prisma ORM)
*   **Language**: TypeScript

## 🚀 Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Configuration**:
    Create a `.env` file in this directory:
    ```env
    PORT=3001
    DATABASE_URL="mongodb+srv://<username>:<password>@cluster.mongodb.net/jira_dashboard"
    ```

3.  **Generate Prisma Client**:
    ```bash
    npx prisma generate
    ```

## 🏃‍♂️ Running

*   **Development**:
    ```bash
    npm run dev
    ```

## 📝 API Overview

The backend uses a **Single Document Architecture**, meaning all sub-resources (stakeholders, links, filters) are stored as embedded documents within the Project.

### Sync
*   `POST /api/projects/sync`: Upserts projects from Jira into the MongoDB `Project` collection. Called on frontend login.

### Resources
*   `GET /api/projects/:key/stakeholders`
*   `POST /api/projects/:key/stakeholders`
*   `GET /api/projects/:key/links`
*   `POST /api/projects/:key/links`
*   `GET /api/projects/:key/filters`
*   `POST /api/projects/:key/filters`
*   `GET /api/projects/:key/overview`
*   `POST /api/projects/:key/overview`
