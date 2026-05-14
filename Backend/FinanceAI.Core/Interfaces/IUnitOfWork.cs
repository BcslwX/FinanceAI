
using FinanceAI.Core.Entities;

namespace FinanceAI.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IRepository<Transaction> Transactions { get; }
    IRepository<Budget> Budgets { get; }
    IRepository<Prediction> Predictions { get; }
    IRepository<User> Users { get; }

    Task<int> SaveChangesAsync();
}