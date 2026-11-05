# Decide For Me

Dokumentasi kebutuhan, role, alur aplikasi, panduan presentasi, dan bahan tanya jawab tersedia di [DOKUM.md](./DOKUM.md).

Decide For Me keeps its React, TypeScript, and Vite frontend and uses Laravel as a same-origin JSON API. Laravel handles authentication, validation, ownership, and persistence; PostgreSQL stores users, categories, options, and decision history. Sanctum's session-based SPA authentication keeps the browser UI on the existing frontend architecture.

## Requirements

- PHP 8.3 or later with `pdo_pgsql`
- Composer
- Node.js 22 or later and npm
- PostgreSQL

## Local development

1. Create a PostgreSQL database named `decide_for_me` (or choose another name and update the environment below).
2. Configure Laravel:

   ```sh
   cd backend
   cp .env.example .env
   composer install
   php artisan key:generate
   php artisan migrate
   php artisan serve --host=127.0.0.1 --port=8000
   ```

   Update `DB_*` in `backend/.env` with the local PostgreSQL connection.    The default Sanctum stateful domains include Laravel and Vite development origins on ports 3000 and 3001. If Vite selects another port or hostname, add that exact host and port to `SANCTUM_STATEFUL_DOMAINS`.
3. In a second terminal at the project root:

   ```sh
   npm install
   npm run dev
   ```

   Open `http://localhost:3000`. Vite proxies `/api` and `/sanctum` to Laravel.

## Production build

Set `APP_URL`, database credentials, and `SANCTUM_STATEFUL_DOMAINS` for the deployment. Set `SESSION_SECURE_COOKIE=true` when serving over HTTPS. Then build and migrate:

```sh
npm run build
cd backend
php artisan migrate --force
```

The Vite build is written to `backend/public/app`; Laravel serves the application routes and its static assets from `backend/public`. Deploy the Laravel public directory as the web root and keep `APP_DEBUG=false`.

## Optional AI decision reasons

The random picker works without AI. To add a short Gemini-written perspective after each pick, set `GEMINI_API_KEY` in `backend/.env` on the server (never in frontend variables or source code). The default lightweight model is `gemini-3.5-flash-lite`; override it with `GEMINI_MODEL` if needed. Then run `php artisan config:clear` if configuration is cached. The optional context entered before a pick is sent to Google Gemini and is not saved; the generated explanation is saved with that user's decision history. Without a key, the app clearly reports that AI is not configured and the random decision remains available.

## Checks

```sh
npm run lint
npm run build
cd backend && php artisan test
```

The Laravel feature tests use in-memory SQLite. PostgreSQL-specific services are not required to run the test suite. No AI provider key is included in this repository.
