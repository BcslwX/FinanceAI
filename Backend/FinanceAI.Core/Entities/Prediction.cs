
namespace FinanceAI.Core.Entities;

public class Prediction : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public string Category { get; set; } = string.Empty;
    public decimal PredictedAmount { get; set; }
    public DateTime PredictionDate { get; set; }
    public string ModelUsed { get; set; } = string.Empty;
    public double Confidence { get; set; }
}
