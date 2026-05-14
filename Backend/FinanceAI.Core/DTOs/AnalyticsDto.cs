namespace FinanceAI.Core.DTOs;

public class MonthlyDataDto
{
    public int Year { get; set; }
    public int Month { get; set; }
    public string MonthName { get; set; } = "";
    public decimal Income { get; set; }
    public decimal Expenses { get; set; }
    public decimal NetBalance { get; set; }
    public decimal SavingsRate { get; set; } // % of income saved
}

public class CategoryTrendDto
{
    public string Category { get; set; } = "";
    public decimal Total { get; set; }
    public decimal Average { get; set; }
    public List<decimal> MonthlyAmounts { get; set; } = new(); // 12 values
}

public class AnalyticsResponseDto
{
    public List<MonthlyDataDto> MonthlyData { get; set; } = new();
    public List<string> MonthLabels { get; set; } = new();
    public List<CategoryTrendDto> CategoryTrends { get; set; } = new();
    public decimal TotalIncome { get; set; }
    public decimal TotalExpenses { get; set; }
    public decimal TotalSaved { get; set; }
    public decimal AverageSavingsRate { get; set; }
    public string BestMonth { get; set; } = "";
    public string WorstMonth { get; set; } = "";
}