using FinanceAI.Core.DTOs;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;

namespace FinanceAI.ML.Services;

public class PredictionService
{
    private readonly IUnitOfWork _unitOfWork;

    public PredictionService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    // Simple version used by Dashboard — returns just predicted amounts
    public async Task<Dictionary<string, decimal>> PredictAllCategories(Guid userId)
    {
        var full = await GetDetailedPredictions(userId);
        return full.Categories.ToDictionary(c => c.Category, c => c.PredictedAmount);
    }

    // Full version used by Predictions page
    public async Task<PredictionsResponseDto> GetDetailedPredictions(Guid userId)
    {
        var threeMonthsAgo = new DateTime(
            DateTime.UtcNow.Year,
            DateTime.UtcNow.Month, 1).AddMonths(-3);

        var transactions = await _unitOfWork.Transactions.FindAsync(t =>
            t.UserId == userId &&
            t.Type == TransactionType.Expense &&
            t.TransactionDate >= threeMonthsAgo &&
            !t.IsAnomaly);
        var now = DateTime.UtcNow;

        // Get totals per category per month
        var grouped = transactions
            .GroupBy(t => t.Category)
            .Select(catGroup =>
            {
                var monthTotals = catGroup
                    .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
                    .ToDictionary(
                        g => g.Key,
                        g => g.Sum(t => t.Amount));

                decimal GetMonth(int offset)
                {
                    var date = now.AddMonths(offset);
                    return monthTotals.TryGetValue(
                        new { Year = date.Year, Month = date.Month }, out var v) ? v : 0;
                }

                var m1 = GetMonth(-1); // last month
                var m2 = GetMonth(-2); // 2 months ago
                var m3 = GetMonth(-3); // 3 months ago

                // Weighted average: last month = weight 3, -2 = weight 2, -3 = weight 1
                var dataPoints = new List<(decimal amount, decimal weight)>();
                if (m3 > 0) dataPoints.Add((m3, 1));
                if (m2 > 0) dataPoints.Add((m2, 2));
                if (m1 > 0) dataPoints.Add((m1, 3));

                decimal predicted = 0;
                if (dataPoints.Any())
                {
                    var totalWeight = dataPoints.Sum(d => d.weight);
                    predicted = Math.Round(
                        dataPoints.Sum(d => d.amount * d.weight) / totalWeight, 2);
                }

                var changePercent = m1 > 0
                    ? Math.Round((predicted - m1) / m1 * 100, 1)
                    : 0;

                var trend = changePercent > 5 ? "up"
                    : changePercent < -5 ? "down"
                    : "stable";

                return new CategoryPredictionDto
                {
                    Category = catGroup.Key,
                    PredictedAmount = predicted,
                    LastMonthAmount = m1,
                    TwoMonthsAgoAmount = m2,
                    ThreeMonthsAgoAmount = m3,
                    ChangePercent = changePercent,
                    Trend = trend,
                    DataPointsCount = dataPoints.Count,
                };
            })
            .Where(c => c.PredictedAmount > 0)
            .OrderByDescending(c => c.PredictedAmount)
            .ToList();

        return new PredictionsResponseDto
        {
            TotalPredictedExpenses = grouped.Sum(c => c.PredictedAmount),
            TotalLastMonthExpenses = grouped.Sum(c => c.LastMonthAmount),
            Categories = grouped,
        };
    }
}