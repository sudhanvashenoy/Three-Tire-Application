# Three-Tier Task Manager

A simple three-tier application:

| Tier        | Tech                  | Port  |
|-------------|-----------------------|-------|
| Frontend    | HTML/CSS/JS on nginx  | 3000  |
| Backend API | Node.js + Express     | 5000  |
| Database    | PostgreSQL 16         | (internal only) |

```
Browser --> Frontend (nginx :3000) --> Backend (Express :5000) --> PostgreSQL (db :5432)
```

## Folder structure

```
three-tier-app/
├── backend/
│   ├── docker-compose.yml        # backend + database
│   ├── volumes/                  # bind mount for Postgres data
│   └── app/
│       ├── Dockerfile
│       └── code/                 # backend source (server.js, db.js, package.json)
└── frontend/
    ├── docker-compose.yml
    └── app/
        ├── Dockerfile
        └── code/                 # frontend source (index.html, app.js, style.css, config.js)
```

## Run it

Requirements: Docker and Docker Compose.

1. Start the backend and database:

   ```bash
   cd backend
   docker compose up -d --build
   ```

2. Start the frontend:

   ```bash
   cd ../frontend
   docker compose up -d --build
   ```

3. Open http://localhost:3000 and add some tasks.

Check the API directly: http://localhost:5000/api/health

## Stop it

```bash
cd frontend && docker compose down
cd ../backend && docker compose down
```

Your tasks are kept in `backend/volumes/postgres-data`, so they survive restarts.
To wipe the data, stop the containers and delete that folder.

## API

| Method | Endpoint          | Description              |
|--------|-------------------|--------------------------|
| GET    | /api/health       | Backend + DB health      |
| GET    | /api/tasks        | List tasks               |
| POST   | /api/tasks        | Create task `{title}`    |
| PUT    | /api/tasks/:id    | Toggle done              |
| DELETE | /api/tasks/:id    | Delete task              |

## Notes

- The browser calls the backend at the URL in `frontend/app/code/config.js`
  (default `http://localhost:5000/api`). Change it if you deploy to a server.
- DB credentials are set in `backend/docker-compose.yml`. Change them before any real deployment.
