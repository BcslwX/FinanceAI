
using Microsoft.ML.Data;

namespace FinanceAI.ML.Models;

public class TransactionData
{
    [LoadColumn(0)] public float Amount { get; set; }
    [LoadColumn(1)] public float DayOfWeek { get; set; }
    [LoadColumn(2)] public float DayOfMonth { get; set; }
    [LoadColumn(3)] public float Month { get; set; }
}

public class SpendingPrediction
{
    [ColumnName("Score")] public float PredictedAmount { get; set; }
}

