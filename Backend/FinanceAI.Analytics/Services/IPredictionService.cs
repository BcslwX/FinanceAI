
namespace FinanceAI.Analytics.Services;

public interface IPredictionService
{
    Task<decimal> PredictNextMonthSpending(Guid userId, string category);
    Task<Dictionary<string, decimal>> PredictAllCategories(Guid userId);
}