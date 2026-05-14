
namespace FinanceAI.Core.Entities;

public class Transaction : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public decimal Amount { get; set; }
    public TransactionType Type { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime TransactionDate { get; set; }
    public string? Merchant { get; set; }
    public bool IsRecurring { get; set; }
    public bool IsAnomaly { get; set; } = false;
    public double AnomalyScore { get; set; } = 0;
}

public enum TransactionType
{
    Income,
    Expense
}