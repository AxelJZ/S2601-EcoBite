# isp-manager-api

REST API for **ISP Manager**: NestJS 11 + Prisma 7 on **PostgreSQL** (Neon). Authentication uses **access JWTs** and **opaque refresh tokens** in httpOnly cookies, with database-backed sessions and rotation.

---

## Architecture (Summary)

| Layer                    | Role                                                                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Domain modules**       | `Auth`, `User`, `Customer`, `Order` — each with its own controller / service; code lives under **`src/modules/`** (`auth`, `user`, `customer`, `order`).                |
| **Prisma**               | Data access; schema and migrations under `src/prisma/`; `PrismaModule` is a global singleton.                                                                           |
| **Shared HTTP layer**    | `bootstrap/http-app.setup.ts`: CORS (`FRONTEND_ORIGINS`), `cookie-parser`, `trust proxy`. In production, CORS fails at startup if explicit origins are not configured.  |
| **Global cross-cutting** | Pipes (`CustomValidationPipe` + **class-validator**), guards (global JWT + roles + CSRF + Throttler), error filter, response interceptor, **Pino** through nestjs-pino. |

All HTTP errors go through **`HttpExceptionFilter`** with a unified JSON shape; successful responses go through **`ResponseInterceptor`** (wrapper `{ success, data, ... }`). Configuration is loaded with typed **`@nestjs/config`** namespaces (`app`, `database`, `auth`) and **Joi** validation at startup (`env.validation.ts`).

---

## Database (Neon)

- **PostgreSQL** managed in **Neon** (TLS connection string in `DATABASE_URL`).
- The schema lives in `src/prisma/schema.prisma`; versioned migrations live in `src/prisma/migrations/`.
- **Optional seed**: `npm run db:seed` (requires `DATABASE_URL` and the configured script).
- **SQL schema and diagram** (reference view in dbdiagram.io): [https://dbdiagram.io/d/ISP-Manager-Schema-69f11828ddb9320fdc7f81c5](https://dbdiagram.io/d/ISP-Manager-Schema-69f11828ddb9320fdc7f81c5)

---

## Run Locally

**Requirements:** Node.js 22+.

Create a **`.env`** file at the repo root. **`@nestjs/config`** loads it at startup; keys are validated with Joi in **`src/config/env.validation.ts`**.

### `.env` Variables

Values aligned with the repo **`.env`** file (Neon + JWT for local development):

```env
DATABASE_URL="Ask aleoterob@gmail for the URL (due to GitHub's secret policies for public repositories)."

# JWT
JWT_ACCESS_SECRET="replace-with-a-random-secret-of-at-least-32-characters"

ACCESS_COOKIE_NAME="access_token"
REFRESH_COOKIE_NAME="refresh_token"

# App (optional; Joi applies default values when omitted)
NODE_ENV=development
PORT=3000
APP_NAME="isp-manager-api"
JWT_ACCESS_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
COOKIE_MAX_AGE=900000
JWT_ISSUER=isp-manager-api
JWT_AUDIENCE=isp-manager-api
COOKIE_SAMESITE=strict
CSRF_COOKIE_NAME=csrf_token
CSRF_HEADER_NAME=x-csrf-token
FRONTEND_ORIGINS=http://localhost:5173
```

Other keys accepted by Joi are described in **`src/config/env.validation.ts`** (for example **`COOKIE_SECURE`**, **`COOKIE_DOMAIN`**, **`TRUST_PROXY`**, **`SWAGGER_ENABLED`**, **`CSRF_*`**, **`SENTRY_*`**).

> **Note:** Committing credentials and secrets in documentation is **not** a good security practice. They are still included here so anyone who wants to **test locally** can copy the block with minimal friction; real environments should use private environment variables only and rotate any exposed value.

### Commands

```bash
cd isp-manager-api
npm install

# Migrations applied against the DB configured in DATABASE_URL
npx prisma migrate deploy

npm run start:dev   # development (:3000 by default, see PORT)
npm run build && npm run start   # compiled production -> dist/src/main.js
```

### Docker Image (`Dockerfile`)

The **`Dockerfile`** uses a fake **`DATABASE_URL`** only during the **`npm run build`** phase (Prisma generation). **At runtime**, the container needs real **`DATABASE_URL`** and **`JWT_ACCESS_SECRET`** values (and the rest of the variables) through **`--env-file`** or **`-e`**.

```bash
docker build -t isp-manager-api .
docker run --rm -p 8080:8080 --env-file .env isp-manager-api
```

The app listens on **`PORT`** (in the image, default **8080**, aligned with Cloud Run). Before the first startup against a new DB, apply migrations with the same **`DATABASE_URL`**, for example: **`npx prisma migrate deploy`** from your machine or a CI job.

With the API running locally (for example `npm run start:dev` on **`PORT`**, default **3000**), interactive documentation is available at **[http://localhost:3000/docs](http://localhost:3000/docs)** (Swagger UI).

---

## Google Cloud Platform (Cloud Run)

**Deployment (production):** [https://isp-manager-api-779076689957.southamerica-east1.run.app/](https://isp-manager-api-779076689957.southamerica-east1.run.app/) (from a browser, `GET /` returns a simple health check with `@nestjs/terminus`).

A host like `https://isp-manager-api-<hash>-rj.a.run.app` may also be exposed depending on the project; **`gcloud run services describe isp-manager-api --region=southamerica-east1 --format='value(status.url)'`** returns the current canonical URL.

| Resource              | Notes                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **API service**       | `gcloud run deploy isp-manager-api --source=.` (typical region: `southamerica-east1`). Image is defined by the **Dockerfile** in this repo (`npm install`, `DATABASE_URL` placeholder only during **build**, runtime uses service env vars).                                                                                                                                           |
| **Runtime variables** | `DATABASE_URL`, `JWT_ACCESS_SECRET` (>=32 chars), `FRONTEND_ORIGINS` (CSV of SPA origins for CORS/credentials), `NODE_ENV`, `COOKIE_*`, `JWT_*`, `CSRF_*`, `SENTRY_*`. Behind a proxy: **`TRUST_PROXY=true`**. SPA on another hostname: typically **`COOKIE_SAMESITE=none`** + **`COOKIE_SECURE=true`**; cookies may use **`Partitioned`** (CHIPS) in code when `sameSite === 'none'`. |
| **URLs**              | See the **Deployment** link above; Cloud Run may offer more than one host form for the same service.                                                                                                                                                                                                                                                                                   |

---

For production, **`FRONTEND_ORIGINS`** must include every real SPA host that will call the API with credentials. In the current deployment, use this when updating Cloud Run:

```bash
gcloud run services update isp-manager-api \
  --region=southamerica-east1 \
  --set-env-vars FRONTEND_ORIGINS=https://isp-manager-web-779076689957.southamerica-east1.run.app,https://isp-manager-web-eomue2kh4q-rj.a.run.app
```

> Note: updating environment variables in Cloud Run creates a new revision. Do not run this command if you want to avoid a deploy.

## Authentication and Authorization

### Tokens and Cookies

The **access token** is a **JWT** signed with **`JWT_ACCESS_SECRET`**. The payload contains application claims **`sub`** (user UUID), **`email`**, and **`role`**. The signature (through `JwtModule` options) adds **`iss`** (`JWT_ISSUER`, default `isp-manager-api`), **`aud`** (`JWT_AUDIENCE`, default `isp-manager-api`), **`exp`**, and **`iat`**. It is sent in the httpOnly **`ACCESS_COOKIE_NAME`** cookie (default `access_token`) with **`maxAge`** aligned with **`JWT_ACCESS_EXPIRES_IN`** (default **15 minutes**). **`Authorization: Bearer &lt;jwt&gt;`** is also accepted for clients that do not use cookies.

The **refresh token** is not a JWT: it is an **opaque token** (random bytes in base64url). Only the **SHA-256 hash** is stored in **`RefreshSession`**; the raw value is sent in the **`REFRESH_COOKIE_NAME`** cookie (default `refresh_token`) with a lifetime of **`REFRESH_TOKEN_EXPIRES_IN`** (default **7 days**). This allows session family **rotation**, **reuse** detection, and revocation in **`POST /auth/logout`**.

The **CSRF token** protects mutations when the browser authenticates with cookies. The client gets a token with **`GET /auth/csrf`**; the API sets a non-httpOnly **`CSRF_COOKIE_NAME`** cookie (default `csrf_token`) and returns the same value in `data.token` for cross-origin SPAs. Every mutating method (`POST`, `PUT`, `PATCH`, `DELETE`) must send **`CSRF_HEADER_NAME`** (default `X-CSRF-Token`) with that value. If the header is missing or does not match the cookie, the API responds with **403 `CSRF_INVALID`**.

### Flow Summary

1. **`GET /auth/csrf`** (public): issues a CSRF token so the SPA can send it in mutations.
2. **`POST /auth/login`** (public + CSRF): validates credentials, creates a **`RefreshSession`** row (new family), issues the access JWT and refresh cookie, and updates **`lastLoginAt`**.
3. Protected routes require a valid JWT (global **`JwtAuthGuard`**). The strategy looks up the current user in the DB: inactive users are rejected, and the role used by **`RolesGuard`** is the current DB role, not only the one in the JWT.
4. If access expires, the client can call **`POST /auth/refresh`** with the refresh cookie + CSRF: the DB session is validated, rotated atomically, and **new** access + refresh cookies are issued. If reuse is detected, the family is revoked.
5. **`POST /auth/logout`** (CSRF): invalidates sessions and clears cookies.

Cookie options (**`COOKIE_SAMESITE`**, **`COOKIE_SECURE`**, **`COOKIE_DOMAIN`**, etc.) are documented in `src/config/auth.config.ts` and Joi variables; when the frontend and API are on different HTTPS hosts, **`SameSite=None`** + **`Secure`** is usually required (see also **`FRONTEND_ORIGINS`**).

### Role-Based Authorization

After JWT validation, **`RolesGuard`** + **`@Roles(Role.ADMIN, ...)`** restrict endpoints by role (**ADMIN**, **SUPERVISOR**, **INSTALLER**). Public routes are marked with **`@Public()`** to skip JWT authentication.

---

## Error Handling and Validation

| Mechanism                            | Brief description                                                                                                                                                                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`CustomValidationPipe`**           | Wrapper around **`ValidationPipe`**: flattened errors in a structure with `success: false`, `errors[]` (`property`, `messages`), code `VALIDATION`.                                                                                                                                             |
| **class-validator**                  | DTOs in controllers (for example login, create user, create order).                                                                                                                                                                                                                             |
| **`HttpExceptionFilter`**            | Catches `HttpException`, `BadRequestException` (malformed JSON -> `INVALID_JSON`), **`AppException`** (stable business codes such as `AUTH_INVALID_CREDENTIALS`), and ORM unique violations where applicable (`unique-violation.map`). Sends **`SentryExceptionCaptured`** for captured errors. |
| **`AppException`** + **`ErrorCode`** | Stable `code` + `message` contract in the error JSON.                                                                                                                                                                                                                                           |

**Successful response example (interceptor wrapper):**

```json
{
  "success": true,
  "statusCode": 200,
  "statusText": "OK",
  "timestamp": "2026-05-03T15:03:35.850Z",
  "path": "/auth/login",
  "data": {
    "id": "4205f869-ae6a-4e32-9d59-8c70b770989f",
    "name": "Admin User",
    "email": "admin@example.com",
    "phone": "+54 11 1234-1178",
    "role": "ADMIN",
    "active": true,
    "lastLoginAt": "2026-05-03T14:18:50.466Z",
    "createdAt": "2026-05-02T13:57:25.931Z",
    "updatedAt": "2026-05-03T14:18:50.467Z"
  }
}
```

**Validation error example (400):**

```json
{
  "success": false,
  "statusCode": 400,
  "statusText": "Bad Request",
  "timestamp": "2026-05-03T15:05:37.397Z",
  "path": "/users",
  "message": "Validation error",
  "errors": [
    {
      "property": "name",
      "messages": ["name should not be empty"]
    },
    {
      "property": "email",
      "messages": ["email must be an email"]
    }
  ],
  "code": "VALIDATION_ERROR"
}
```

**Business / auth error example (401):**

```json
{
  "success": false,
  "statusCode": 401,
  "statusText": "Unauthorized",
  "timestamp": "2026-05-02T18:00:00.000Z",
  "path": "/auth/login",
  "message": "Invalid credentials",
  "code": "AUTH_INVALID_CREDENTIALS"
}
```

---

## Global Configuration and Rate Limiting

### Typed Config (`@nestjs/config`)

In **`app.module.ts`**, **`ConfigModule.forRoot`** is **global** (`isGlobal: true`) and loads three **`registerAs`** factories from `src/config/`:

- **`app`**: `app.config.ts` — port, `NODE_ENV`, CORS / origins, `LOG_LEVEL`, Swagger, etc.
- **`database`**: `database.config.ts` — `DATABASE_URL` for Prisma.
- **`auth`**: `auth.config.ts` — JWT, cookies, access/refresh duration, `SameSite` / `secure`.

At startup, **`validationSchema: envValidationSchema`** (Joi in **`env.validation.ts`**) validates **`process.env`**; with **`abortEarly: false`**, multiple errors are listed at once. Services inject blocks with **`@Inject(appConfig.KEY)`** (or another config key) and type them with **`ConfigType<typeof appConfig>`** for autocomplete and a stable contract.

### Request Limits (`@nestjs/throttler`)

- **`ThrottlerModule.forRoot`** defines a default throttler: **120** requests per **60 s window** (per key, usually IP).
- **`ThrottlerGuard`** is registered as **`APP_GUARD`**: it applies to **all** routes unless overridden (we do not use `SkipThrottle` broadly today).
- **`CsrfGuard`** is registered as **`APP_GUARD`**: it allows safe methods (`GET`, `HEAD`, `OPTIONS`) and requires CSRF cookie + header for mutations.
- In **`AuthController`**, sensitive public routes use **`@Throttle`** for **lower** limits in the same 60 s window:
  - **`POST /auth/signup`**: **5** / minute
  - **`POST /auth/login`**: **10** / minute
  - **`POST /auth/refresh`**: **30** / minute  
    All other endpoints inherit the global **120** / minute limit.

When the quota is exceeded, Nest returns **429 Too Many Requests** (standard package behavior).

---

## Observability

- **HTTP logs**: **nestjs-pino** + **`pino-http`** (options from `LOG_LEVEL` and environment).
- **Sentry**: Nest integration (`instrument.ts`, `SentryModule`). Enabled only with `SENTRY_ENABLED=true` and `SENTRY_DSN`; `SENTRY_SEND_DEFAULT_PII` is disabled unless explicitly configured.

---

## Main Libraries

Nest core, JWT + Passport JWT, bcryptjs, class-validator / class-transformer, Prisma (+ `pg` adapter), cookie-parser, Joi (`.env` validation), Swagger (`@nestjs/swagger`), Pino (`nestjs-pino`), Sentry Nest SDK, supertest (e2e).

---

## Tests

```bash
npm test           # unit (Jest, *.spec.ts under src/)
npm run test:e2e   # e2e (supertest), see test/*.e2e-spec.ts
```

Unit tests load **`src/testing/jest-setup.ts`** (global mocks, for example `bcryptjs`) and shared mocks such as **`src/testing/mock-execution-context.ts`**.

E2E tests start the app against **`DATABASE_URL`** with the schema applied (`npx prisma migrate deploy`). **`npm run db:seed`** is not required: tests register users with **`POST /auth/signup`** and validate **`/auth/login`**, CSRF, and JWT-protected routes.

| E2E file                | Main coverage                         |
| ----------------------- | ------------------------------------- |
| `test/auth.e2e-spec.ts` | signup, login, `/auth/me`, refresh, logout |

---

## Public Routes

All public routes are provided by **`AuthController`** under **`/auth`** (for example, `/auth/csrf` and `/auth/login`). See the local **`/docs`** documentation for the exact inventory.

---

## Note About Code Comments

Part of the code includes **review-oriented comments** (to explain decisions or logic during review). Those comments are **not intended for production**.
