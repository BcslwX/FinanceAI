namespace FinanceAI.Core.Entities;

public class Budget : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Category { get; set; } = string.Empty;
    public decimal AllocatedAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public decimal AlertThreshold { get; set; } = 0.8m; // 80% by default
    public bool AlertEnabled { get; set; } = true;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}