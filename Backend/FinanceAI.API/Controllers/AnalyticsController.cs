using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.Core.DTOs;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public AnalyticsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<IActionResult> GetAnalytics([FromQuery] int months = 12)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var now = DateTime.UtcNow;

        // Start from beginning of the month N months ago
        var startDate = new DateTime(now.Year, now.Month, 1).AddMonths(-(months - 1));

        var transactions = await _unitOfWork.Transactions.FindAsync(t =>
            t.UserId == userId &&
            t.TransactionDate >= startDate);

        var txList = transactions.ToList();

        // Build list of months
        var monthList = Enumerable.Range(0, months)
            .Select(i => startDate.AddMonths(i))
            .ToList();

        var monthLabels = monthList
            .Select(m => m.ToString("MMM yyyy"))
            .ToList();

        // Build monthly data
        var monthlyData = monthList.Select(m =>
        {
            var monthTxs = txList.Where(t =>
                t.TransactionDate.Year == m.Year &&
                t.TransactionDate.Month == m.Month).ToList();

            var income = monthTxs
                .Where(t => t.Type == TransactionType.Income)
                .Sum(t => t.Amount);

            var expenses = monthTxs
                .Where(t => t.Type == TransactionType.Expense)
                .Sum(t => t.Amount);

            var net = income - expenses;
            var savingsRate = income > 0
                ? Math.Round((net / income) * 100, 1)
                : 0;

            return new MonthlyDataDto
            {
                Year = m.Year,
                Month = m.Month,
                MonthName = m.ToString("MMM yyyy"),
                Income = income,
                Expenses = expenses,
                NetBalance = net,
                SavingsRate = savingsRate,
            };
        }).ToList();

        // Category trends (expenses only, exclude anomalies)
        var expenseTxs = txList
            .Where(t => t.Type == TransactionType.Expense && !t.IsAnomaly)
            .ToList();

        var categoryTrends = expenseTxs
            .GroupBy(t => t.Category)
            .Select(g =>
            {
                var monthlyAmounts = monthList.Select(m =>
                    g.Where(t => t.TransactionDate.Year == m.Year &&
                                 t.TransactionDate.Month == m.Month)
                     .Sum(t => t.Amount)).ToList();

                var nonZeroMonths = monthlyAmounts.Count(a => a > 0);

                return new CategoryTrendDto
                {
                    Category = g.Key,
                    Total = g.Sum(t => t.Amount),
                    Average = nonZeroMonths > 0
                        ? Math.Round(g.Sum(t => t.Amount) / nonZeroMonths, 2)
                        : 0,
                    MonthlyAmounts = monthlyAmounts,
                };
            })
            .OrderByDescending(c => c.Total)
            .ToList();

        // Summary stats
        var totalIncome = monthlyData.Sum(m => m.Income);
        var totalExpenses = monthlyData.Sum(m => m.Expenses);
        var totalSaved = totalIncome - totalExpenses;
        var avgSavingsRate = monthlyData
            .Where(m => m.Income > 0)
            .Select(m => m.SavingsRate)
            .DefaultIfEmpty(0)
            .Average();

        var bestMonth = monthlyData
            .OrderByDescending(m => m.NetBalance)
            .FirstOrDefault()?.MonthName ?? "";

        var worstMonth = monthlyData
            .Where(m => m.Income > 0 || m.Expenses > 0)
            .OrderBy(m => m.NetBalance)
            .FirstOrDefault()?.MonthName ?? "";

        return Ok(new AnalyticsResponseDto
        {
            MonthlyData = monthlyData,
            MonthLabels = monthLabels,
            CategoryTrends = categoryTrends,
            TotalIncome = totalIncome,
            TotalExpenses = totalExpenses,
            TotalSaved = totalSaved,
            AverageSavingsRate = Math.Round(avgSavingsRate, 1),
            BestMonth = bestMonth,
            WorstMonth = worstMonth,
        });
    }
}