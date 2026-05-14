using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.API.Services;
using FinanceAI.Core.Entities;
using FinanceAI.Infrastructure.Data;
using System.Security.Claims;
using FinanceAI.ML.Services;

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

    public ImportController(CsvImportService csv, OpenAIClassificationService ai, FinanceAIDbContext db, AnomalyDetectionService anomaly)
    {
        _csv = csv;
        _ai = ai;
        _db = db;
        _anomaly = anomaly;
    }

    [HttpPost("csv")]
    public async Task<IActionResult> ImportCsv(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded");

        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        // 1. Parse CSV
        using var stream = file.OpenReadStream();
        var parsed = _csv.ParseSebCsv(stream);

        if (parsed.Count == 0)
            return BadRequest("No transactions found in file");

        // 2. Classify with OpenAI in batches of 50
        var allResults = new List<ClassificationResult>();
        var batchSize = 50;

        for (int i = 0; i < parsed.Count; i += batchSize)
        {
            var batch = parsed.Skip(i).Take(batchSize).ToList();
            var classified = await _ai.ClassifyAsync(batch);
            allResults.AddRange(classified);
        }

        // 3. Save to database
        var transactions = new List<Transaction>();
        for (int i = 0; i < parsed.Count; i++)
        {
            var p = parsed[i];
            var c = i < allResults.Count ? allResults[i] : new ClassificationResult();

            transactions.Add(new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Amount = p.Amount,
                Type = p.Type == "C" ? TransactionType.Income : TransactionType.Expense,
                Category = c.Category,
                Description = string.IsNullOrWhiteSpace(c.Description) ? p.Counterparty : c.Description,
                Merchant = p.Counterparty,
                TransactionDate = p.Date,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _db.Transactions.AddRange(transactions);
        await _anomaly.DetectAndMarkAnomalies(userId);
        await _db.SaveChangesAsync();
        
        return Ok(new
        {
            imported = transactions.Count,
            message = $"Successfully imported {transactions.Count} transactions"
        });
    }
}