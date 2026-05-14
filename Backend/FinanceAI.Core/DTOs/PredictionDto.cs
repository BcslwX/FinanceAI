namespace FinanceAI.Core.DTOs;

public class CategoryPredictionDto
{
    public string Category { get; set; } = "";
    public decimal PredictedAmount { get; set; }
    public decimal LastMonthAmount { get; set; }
    public decimal TwoMonthsAgoAmount { get; set; }
    public decimal ThreeMonthsAgoAmount { get; set; }
    public decimal ChangePercent { get; set; }   // vs last month
    public string Trend { get; set; } = "";       // "up", "down", "stable"
    public int DataPointsCount { get; set; }      // how many months of data
}

public class PredictionsResponseDto
{
    public decimal TotalPredictedExpenses { get; set; }
    public decimal TotalLastMonthExpenses { get; set; }
    public List<CategoryPredictionDto> Categories { get; set; } = new();
}