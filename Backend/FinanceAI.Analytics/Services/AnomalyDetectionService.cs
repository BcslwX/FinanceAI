using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;

namespace FinanceAI.Analytics.Services;

public class AnomalyDetectionService
{
    private readonly IUnitOfWork _unitOfWork;
    private const double AnomalyMultiplier = 2.5;

    public AnomalyDetectionService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task DetectAndMarkAnomalies(Guid userId)
    {
        var transactions = (await _unitOfWork.Transactions
                .FindAsync(t => t.UserId == userId && t.Type == TransactionType.Expense))
            .ToList();

        var grouped = transactions.GroupBy(t => t.Category);

        foreach (var group in grouped)
        {
            var amounts = group.Select(t => (double)t.Amount).ToList();
            if (amounts.Count < 3) continue;

            var avg = amounts.Average();
            var threshold = avg * AnomalyMultiplier;

            foreach (var tx in group)
            {
                tx.IsAnomaly = (double)tx.Amount > threshold;
                tx.AnomalyScore = tx.IsAnomaly
                    ? Math.Round((double)tx.Amount / avg, 2)
                    : 0;
            }
        }

        // Save all changes in one call
        await _unitOfWork.SaveChangesAsync();
    }

    // Run on a single new transaction without re-scanning everything
    public async Task EvaluateTransaction(Transaction tx, Guid userId)
    {
        var categoryTxs = await _unitOfWork.Transactions.FindAsync(t =>
            t.UserId == userId &&
            t.Type == TransactionType.Expense &&
            t.Category == tx.Category &&
            t.Id != tx.Id);

        var amounts = categoryTxs.Select(t => (double)t.Amount).ToList();
        if (amounts.Count < 3) return;

        var avg = amounts.Average();
        var threshold = avg * AnomalyMultiplier;

        tx.IsAnomaly = (double)tx.Amount > threshold;
        tx.AnomalyScore = tx.IsAnomaly ? Math.Round((double)tx.Amount / avg, 2) : 0;
    }
}