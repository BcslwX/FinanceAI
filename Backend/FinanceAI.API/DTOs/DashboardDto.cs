
namespace FinanceAI.API.DTOs;

public class DashboardDto
{
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal NetBalance { get; set; }
    public Dictionary<string, decimal> ExpensesByCategory { get; set; } = new();
    public List<TransactionDto> RecentTransactions { get; set; } = new();
    public Dictionary<string, decimal> Predictions { get; set; } = new();
}
