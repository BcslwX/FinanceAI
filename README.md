# FinanceAI — Personal Finance Management System

Bachelor thesis project by Leonid Petrov.
A cloud-based personal finance management system with AI-driven
transaction classification, predictive analytics, and natural-language
financial insights.

## Tech stack
- Backend: ASP.NET Core 8, Entity Framework Core, SQL Server
- Frontend: React 18 + TypeScript + Tailwind CSS + Recharts
- AI: OpenAI GPT-4o-mini (transaction classification, insights generation)
- Auth: BCrypt password hashing, JWT bearer tokens

## Prerequisites
- .NET 8 SDK
- SQL Server (local or LocalDB)
- Node.js 18+ and npm (only if rebuilding the frontend)
- OpenAI API key

## Setup
1. Clone the repository
2. Create `Backend/FinanceAI.API/appsettings.Development.json` with the
   following structure, filling in your real values:

```json
   {
     "ConnectionStrings": {
       "DefaultConnection": "Server=localhost;Database=FinanceAI;..."
     },
     "OpenAI": {
       "ApiKey": "sk-..."
     },
     "Jwt": {
       "SecretKey": "your-secret-at-least-32-chars-long"
     }
   }
```

3. From `Backend/FinanceAI.API/`, run the database migration:
`dotnet ef database update`
4. Run the application:
  `dotnet run`
5. Open http://localhost:5172 in your browser.

## Project structure
- `Backend/` — ASP.NET Core 8 solution
    - `FinanceAI.API/` — domain entities and business rules
    - `FinanceAI.Core/` — services, DTOs, validation
    - `FinanceAI.Infrastructure/` — EF Core, repositories
    - `FinanceAI.Analytics/` — predictions, OpenAI integration, anomaly detection
    - `FinanceAI.API/` — controllers, JWT auth, serves the built frontend
- `Frontend/` — React 18 application
- `Frontend/dist/` is built and copied to `Backend/FinanceAI.API/wwwroot/`