using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using FinanceAI.API.Services;
using FinanceAI.Core.Entities;
using FinanceAI.Infrastructure.Data;
using System.Security.Claims;
using FinanceAI.Analytics.Services;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ImportController : ControllerBase
{
    private readonly CsvImportService _csv;
    private readonly OpenAIClassificationService _ai;
    private readonly FinanceAIDbContext _db;
    private readonly AnomalyDetectionService _anomaly;
    private readonly ILogger<ImportController> _logger;

    public ImportController(
        CsvImportService csv,
        OpenAIClassificationService ai,
        FinanceAIDbContext db,
        AnomalyDetectionService anomaly,
        ILogger<ImportController> logger)
    {
        _csv = csv;
        _ai = ai;
        _db = db;
        _anomaly = anomaly;
        _logger = logger;
    }

    [HttpPost("csv")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "No file uploaded" });

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // 1. Parse CSV
        List<ParsedTransaction> parsed;
        try
        {
            using var stream = file.OpenReadStream();
            parsed = _csv.ParseSebCsv(stream);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "CSV parsing failed for user {UserId}", userId);
            return BadRequest(new { message = "The uploaded file could not be parsed. Please ensure it is a valid SEB bank CSV export." });
        }

        if (parsed.Count == 0)
            return BadRequest(new { message = "No transactions found in file" });

        // 2. Classify with OpenAI in batches of 50 
        var allResults = new List<ClassificationResult>();
        bool aiFailed = false;
        const int batchSize = 50;

        for (int i = 0; i < parsed.Count; i += batchSize)
        {
            var batch = parsed.Skip(i).Take(batchSize).ToList();
            try
            {
                var classified = await _ai.ClassifyAsync(batch);
                allResults.AddRange(classified);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AI classification failed for batch starting at index {Index}. Falling back to default category.", i);
                aiFailed = true;
                allResults.AddRange(batch.Select(_ => new ClassificationResult
                {
                    Category = "Uncategorized",
                    Description = string.Empty
                }));
            }
        }

        // 3. Save to database
        var transactions = new List<Transaction>();
        for (int i = 0; i < parsed.Count; i++)
        {
            var p = parsed[i];
            var c = i < allResults.Count ? allResults[i] : new ClassificationResult { Category = "Uncategorized" };

            transactions.Add(new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = p.Amount,
                Type = p.Type == "C" ? TransactionType.Income : TransactionType.Expense,
                Category = string.IsNullOrWhiteSpace(c.Category) ? "Uncategorized" : c.Category,
                Description = string.IsNullOrWhiteSpace(c.Description) ? p.Counterparty : c.Description,
                Merchant = p.Counterparty,
                TransactionDate = p.Date,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _db.Transactions.AddRange(transactions);
        await _anomaly.DetectAndMarkAnomalies(userId);
        await _db.SaveChangesAsync();

        var message = aiFailed
            ? $"Imported {transactions.Count} transactions. AI classification was unavailable; transactions were saved with default category."
            : $"Successfully imported {transactions.Count} transactions";

        return Ok(new
        {
            imported = transactions.Count,
            aiAvailable = !aiFailed,
            message
        });
    }
}