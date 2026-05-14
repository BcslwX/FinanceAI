
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.API.DTOs;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using FinanceAI.Analytics.Services;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly PredictionService _predictionService;

    public DashboardController(IUnitOfWork unitOfWork, PredictionService predictionService)
    {
        _unitOfWork = unitOfWork;
        _predictionService = predictionService;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

[HttpGet]
public async Task<ActionResult<DashboardDto>> GetDashboard(
    [FromQuery] int? year,
    [FromQuery] int? month)
{
    var userId = GetUserId();

    // Default to current month if no params provided
    var effectiveYear = year ?? DateTime.UtcNow.Year;
    var effectiveMonth = month ?? DateTime.UtcNow.Month;

    var transactions = await _unitOfWork.Transactions.FindAsync(t =>
        t.UserId == userId &&
        t.TransactionDate.Year == effectiveYear &&
        (month == null || t.TransactionDate.Month == effectiveMonth));

    var transList = transactions.ToList();

    var dashboard = new DashboardDto
    {
        TotalIncome = transList.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount),
        TotalExpenses = transList.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
        NetBalance = transList.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
                  - transList.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
        ExpensesByCategory = transList
            .Where(t => t.Type == TransactionType.Expense)
            .GroupBy(t => t.Category)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount)),
        RecentTransactions = transList
            .OrderByDescending(t => t.TransactionDate)
            .Take(10)
            .Select(t => new TransactionDto
            {
                Id = t.Id,
                Amount = t.Amount,
                Type = t.Type.ToString(),
                Category = t.Category,
                Description = t.Description,
                TransactionDate = t.TransactionDate,
                Merchant = t.Merchant
            }).ToList()
    };

    try
    {
        dashboard.Predictions = await _predictionService.PredictAllCategories(userId);
    }
    catch
    {
        dashboard.Predictions = new Dictionary<string, decimal>();
    }

    return Ok(dashboard);
    }

    [HttpGet("available-years")]
    public async Task<ActionResult<List<int>>> GetAvailableYears()
    {
        var userId = GetUserId();
        var transactions = await _unitOfWork.Transactions.FindAsync(t => t.UserId == userId);
        var years = transactions
            .Select(t => t.TransactionDate.Year)
            .Distinct()
            .OrderByDescending(y => y)
            .ToList();
        return Ok(years);
    }
}