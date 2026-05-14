using System.Text;
using System.Text.Json;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;

namespace FinanceAI.API.Services;

public class InsightItem
{
    public string Type { get; set; } = "";      // "positive", "warning", "info", "anomaly"
    public string Title { get; set; } = "";
    public string Message { get; set; } = "";
}

public class InsightsResponse
{
    public List<InsightItem> Insights { get; set; } = new();
    public string Summary { get; set; } = "";
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class OpenAIInsightsService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;
    private readonly IUnitOfWork _unitOfWork;

    public OpenAIInsightsService(
        IHttpClientFactory httpFactory,
        IConfiguration config,
        IUnitOfWork unitOfWork)
    {
        _http = httpFactory.CreateClient();
        _apiKey = config["OpenAI:ApiKey"] ?? throw new Exception("OpenAI API key missing");
        _unitOfWork = unitOfWork;
    }

public async Task<InsightsResponse> GenerateInsights(Guid userId, int months = 1)
{
    var now = DateTime.UtcNow;
    var thisMonthStart = new DateTime(now.Year, now.Month, 1);

    // Calculate start date based on period
    var periodStart = months == 1
        ? thisMonthStart
        : thisMonthStart.AddMonths(-(months - 1));

    var threeMonthsAgo = thisMonthStart.AddMonths(-3);
    var fetchFrom = months > 3 ? periodStart : threeMonthsAgo;

    var allTxs = await _unitOfWork.Transactions
        .FindAsync(t => t.UserId == userId && t.TransactionDate >= fetchFrom);

    var txList = allTxs.ToList();

    // Period transactions
    var periodTxs = txList.Where(t => t.TransactionDate >= periodStart).ToList();

    // Previous period for comparison
    var prevPeriodStart = periodStart.AddMonths(-months);
    var prevPeriodTxs = txList
        .Where(t => t.TransactionDate >= prevPeriodStart && t.TransactionDate < periodStart)
        .ToList();

    var anomalies = txList.Where(t => t.IsAnomaly).ToList();

    var periodExpenses = periodTxs.Where(t => t.Type == TransactionType.Expense);
    var prevExpenses = prevPeriodTxs.Where(t => t.Type == TransactionType.Expense);

    var thisByCategory = periodExpenses
        .GroupBy(t => t.Category)
        .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount));

    var prevByCategory = prevExpenses
        .GroupBy(t => t.Category)
        .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount));

    var totalExpenses = periodExpenses.Sum(t => t.Amount);
    var prevTotalExpenses = prevExpenses.Sum(t => t.Amount);
    var totalIncome = periodTxs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);
    var prevIncome = prevPeriodTxs.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount);

    // Period label for prompt
    var periodLabel = months == 1
        ? $"{thisMonthStart:MMMM yyyy} (partial, up to {now:MMM dd})"
        : months == 3 ? "last 3 months"
        : months == 6 ? "last 6 months"
        : "last 12 months";

    var sb = new StringBuilder();
    sb.AppendLine($"Today's date: {now:MMMM dd, yyyy}");
    sb.AppendLine($"Analysis period: {periodLabel}");
    sb.AppendLine();
    sb.AppendLine($"Period total expenses: €{totalExpenses:F2}");
    sb.AppendLine($"Previous period total expenses: €{prevTotalExpenses:F2}");
    sb.AppendLine($"Period total income: €{totalIncome:F2}");
    sb.AppendLine($"Previous period total income: €{prevIncome:F2}");
    sb.AppendLine($"Net balance: €{(totalIncome - totalExpenses):F2}");
    sb.AppendLine();
    sb.AppendLine("Expenses by category (this period vs previous):");
    foreach (var (cat, amt) in thisByCategory.OrderByDescending(x => x.Value))
    {
        var prev = prevByCategory.GetValueOrDefault(cat, 0);
        var change = prev > 0
            ? $" (prev period: €{prev:F2}, change: {((amt - prev) / prev * 100):+0.#;-0.#}%)"
            : " (no data for previous period)";
        sb.AppendLine($"  {cat}: €{amt:F2}{change}");
    }

    if (anomalies.Any())
    {
        sb.AppendLine();
        sb.AppendLine("Anomalous transactions detected (excluded from predictions):");
        foreach (var a in anomalies.Take(5))
            sb.AppendLine($"  {a.Description} — €{a.Amount:F2} ({a.Category}, {a.TransactionDate:MMM dd yyyy}, {a.AnomalyScore:F1}× average)");
    }

    // rest of method stays the same (prompt + OpenAI call)

        var prompt = $@"
        You are a personal finance advisor AI. Based on the following financial data,
        generate 4-6 concise, actionable insights for the user. Consider the current day of the month, as now it might be only the beginning of the month and comparing this data to the whole previous month's data would be inaccurate. 

        Financial data:
        {sb}

        Return ONLY a JSON object in this exact format, no markdown:
        {{
          ""summary"": ""One sentence overview of the user's financial situation this month."",
          ""insights"": [
            {{
              ""type"": ""positive|warning|info|anomaly"",
              ""title"": ""Short title (4-6 words)"",
              ""message"": ""Specific actionable insight (1-2 sentences, use actual numbers from the data)""
            }}
          ]
        }}

        Rules:
        - type ""positive"": good news, savings, improvements
        - type ""warning"": overspending, high bills, concerning trends
        - type ""info"": neutral observations, comparisons
        - type ""anomaly"": unusual transactions detected
        - Always reference specific euro amounts
        - Be direct and specific, not generic
        - If income > expenses, mention the surplus
        - If any category increased >120%, flag it as warning
        ";

        var requestBody = new
        {
            model = "gpt-5.4-mini",
            max_completion_tokens = 20000,
            messages = new[] { new { role = "user", content = prompt } }
        };

        var request = new HttpRequestMessage(HttpMethod.Post,
            "https://api.openai.com/v1/chat/completions");
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");
        request.Content = new StringContent(
            JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception($"OpenAI error: {json}");

        using var doc = JsonDocument.Parse(json);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "{}";

        content = content.Replace("```json", "").Replace("```", "").Trim();

        using var resultDoc = JsonDocument.Parse(content);
        var root = resultDoc.RootElement;

        var result = new InsightsResponse
        {
            Summary = root.GetProperty("summary").GetString() ?? "",
            Insights = root.GetProperty("insights").EnumerateArray().Select(i =>
                new InsightItem
                {
                    Type = i.GetProperty("type").GetString() ?? "info",
                    Title = i.GetProperty("title").GetString() ?? "",
                    Message = i.GetProperty("message").GetString() ?? "",
                }).ToList()
        };

        return result;
    }
}