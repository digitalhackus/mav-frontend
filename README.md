# Momentum Autoworks

Full-stack app: **frontend** (React + Vite) and **backend** (Express) in separate folders.

## Project structure

| Folder        | Purpose |
|---------------|--------|
| **frontend/** | React app – port **3000** (run from here) |
| **backend/**  | Express API – port **5000** |

## Running the app

1. **Backend** (terminal 1, from project root):
   ```bash
   cd backend
   npm install
   npm start
   ```
   Server runs at http://localhost:5000.

2. **Frontend** (terminal 2, from project root):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   App runs at http://localhost:3000. API calls to `/api` are proxied to the backend.

**Important:** Run the frontend from the **frontend** folder so it uses the correct `index.html`, `src`, and Vite config. The backend stays in the **backend** folder (no backend folder inside frontend).

## Database

The backend uses in-memory storage. To persist data, add a database and replace the store in `backend/data/store.js`. See `backend/README.md` for API details.
