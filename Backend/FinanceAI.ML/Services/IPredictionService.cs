
namespace FinanceAI.ML.Services;

public interface IPredictionService
{
    Task<decimal> PredictNextMonthSpending(Guid userId, string category);
    Task<Dictionary<string, decimal>> PredictAllCategories(Guid userId);
}