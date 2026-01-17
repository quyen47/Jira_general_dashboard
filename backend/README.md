# Backend Service

A Node.js/Express service providing API endpoints and database connectivity for the Jira Dashboard.

## 🛠️ Tech Stack

*   **Runtime**: Node.js
*   **Framework**: Express.js
*   **Database ORM**: Prisma
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
    DATABASE_URL="file:./dev.db"  # Example for SQLite
    ```

3.  **Database Migration** (if using Prisma):
    ```bash
    npx prisma migrate dev
    ```

## 🏃‍♂️ Running

*   **Development**:
    ```bash
    npm run dev
    # Or directly if script missing:
    npx ts-node index.ts
    ```

## 📝 API Overview

*   `GET /`: Health check
*   *(More endpoints to be added)*
