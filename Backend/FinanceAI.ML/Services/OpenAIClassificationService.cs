using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace FinanceAI.API.Services;

public class ClassificationResult
{
    public string Category { get; set; } = "Other";
    public string Description { get; set; } = "";
}

public class OpenAIClassificationService
{
    private readonly HttpClient _http;
    private readonly string _apiKey;

    private static readonly string[] Categories =
        { "Food", "Transport", "Housing", "Entertainment",
          "Healthcare", "Shopping", "Education", "Utilities",
          "Income", "Transfer", "Other" };

    public OpenAIClassificationService(IHttpClientFactory httpFactory, IConfiguration config)
    {
        _http = httpFactory.CreateClient();
        _apiKey = config["OpenAI:ApiKey"] ?? throw new Exception("OpenAI API key not configured");
    }

    public async Task<List<ClassificationResult>> ClassifyAsync(List<ParsedTransaction> transactions)
    {
        // Build a numbered list for the prompt
        var sb = new StringBuilder();
        for (int i = 0; i < transactions.Count; i++)
        {
            var t = transactions[i];
            sb.AppendLine($"{i + 1}. Counterparty: \"{t.Counterparty}\" | Details: \"{t.Details}\" | Amount: {t.Amount} EUR | Type: {(t.Type == "D" ? "Debit/Expense" : "Credit/Income")}");
        }

        var prompt = $$"""
            You are a financial transaction classifier. Classify each transaction into exactly one category.
    
            Available categories: {{string.Join(", ", Categories)}}
    
            Rules:
            - IKI, MAXIMA, LIDL, RIMI and other supermarkets → Food
            - Bolt, Uber, Wolt → Transport (if ride) or Food (if food delivery)
            - Netflix, Spotify, Steam and other intertaiments → Entertainment
            - Stipendija, salary transfers and other incomes → Income
            - ATM deposits/withdrawals → Transfer
            - Person-to-person transfers → Transfer
            - Online shops (Temu, Amazon), varle and simmilars → Shopping
            - Rent, utilities, insurance and simmilars housing-related expenses → Housing
            - Healthcare expenses (pharmacy, doctor visits) → Healthcare
            - Tuition, courses, educational materials → Education
            - If you can not confidently classify a transaction → Other

    
            Also write a short clean description in English (2-4 words, e.g. "Grocery shopping", "Spotify subscription").
    
            Transactions:
            {{sb}}
    
            Respond ONLY with a JSON array, no markdown, no explanation. Example:
            [{"category":"Food","description":"Grocery shopping"},{"category":"Transport","description":"Bolt ride"}]
            """;


        var requestBody = new
        {
            model = "gpt-5.4-mini",
            max_completion_tokens = 10000,
            messages = new[]
            {
                new { role = "user", content = prompt }
            }
        };

        var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
        request.Headers.Add("Authorization", $"Bearer {_apiKey}");
        request.Content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var json = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new Exception($"OpenAI error: {json}");

        using var doc = JsonDocument.Parse(json);
        var content = doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "[]";

        // Strip markdown fences if present
        content = content.Replace("```json", "").Replace("```", "").Trim();

        var results = JsonSerializer.Deserialize<List<ClassificationResult>>(content,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        return results ?? transactions.Select(_ => new ClassificationResult()).ToList();
    }
}