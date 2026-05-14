# FinanceAI - Personal Finance Management System

Bachelor thesis project by Leonid Petrov.
A cloud-based personal finance management system with AI-driven
transaction classification, predictive analytics, and natural-language
financial insights.

## Tech stack
- Backend: ASP.NET Core 8, Entity Framework Core, SQL Server
- Frontend: React 18 + TypeScript + Tailwind CSS + Recharts
- AI: OpenAI GPT-4o-mini (transaction classification, insight generation)
- Auth: BCrypt password hashing, JWT bearer tokens

## Prerequisites
- .NET 8 SDK
- SQL Server (local or LocalDB)
- Node.js 18+ and npm (only if rebuilding the frontend)
- OpenAI API key

## Setup

1. Clone the repository.

2. Create `Backend/FinanceAI.API/appsettings.Development.json` with the
   following structure, filling in your real values:

```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=FinanceAI;TrustServerCertificate=True;..."
     },
     "OpenAI": {
       "ApiKey": "sk-..."
     },
     "Jwt": {
       "SecretKey": "your-secret-at-least-32-chars-long"
     }
   }
```

3. From `Backend/FinanceAI.API/`, run the database migration:\
   `dotnet ef database update`

4. Run the application:\
   `dotnet run`

5. Open http://localhost:5172 in your browser.

## Project structure

- `Backend/` — ASP.NET Core 8 solution following Clean Architecture
  - `FinanceAI.Core/` — domain entities, interfaces, and core DTOs
  - `FinanceAI.Infrastructure/` — EF Core DbContext, migrations, and repository implementations
  - `FinanceAI.Analytics/` — prediction algorithm, OpenAI integration, anomaly detection
  - `FinanceAI.API/` — REST controllers, application services, DTOs, JWT authentication, and serves the built frontend from `wwwroot/`
- `Frontend/` — React 18 + TypeScript + Tailwind CSS application
- `Frontend/dist/` is built and copied to `Backend/FinanceAI.API/wwwroot/` to be served by the backend.

## Rebuilding the frontend

If you modify frontend code:\
`cd Frontend`\
`npm install`\
`npm run build`

Then copy the contents of `Frontend/dist/` into `Backend/FinanceAI.API/wwwroot/` (overwriting existing files), and restart the backend.