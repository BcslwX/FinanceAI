
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using FinanceAI.Infrastructure.Data;

namespace FinanceAI.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly FinanceAIDbContext _context;

    public IRepository<Transaction> Transactions { get; }
    public IRepository<Budget> Budgets { get; }
    public IRepository<Prediction> Predictions { get; }
    public IRepository<User> Users { get; }

    public UnitOfWork(FinanceAIDbContext context)
    {
        _context = context;
        Transactions = new Repository<Transaction>(_context);
        Budgets = new Repository<Budget>(_context);
        Predictions = new Repository<Prediction>(_context);
        Users = new Repository<User>(_context);
    }

    public async Task<int> SaveChangesAsync() => await _context.SaveChangesAsync();

    public void Dispose() => _context.Dispose();
}