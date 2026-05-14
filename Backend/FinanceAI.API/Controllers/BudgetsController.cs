using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

public class BudgetDto
{
    public Guid Id { get; set; }
    public string Category { get; set; } = "";
    public decimal AllocatedAmount { get; set; }
    public decimal SpentAmount { get; set; }
    public decimal AlertThreshold { get; set; }
    public bool AlertEnabled { get; set; }
    public decimal PercentUsed { get; set; }
    public string Status { get; set; } = ""; // "ok", "warning", "exceeded"
}

public class CreateBudgetDto
{
    public string Category { get; set; } = "";
    public decimal AllocatedAmount { get; set; }
    public decimal AlertThreshold { get; set; } = 0.8m;
    public bool AlertEnabled { get; set; } = true;
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class BudgetsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public BudgetsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet]
    public async Task<IActionResult> GetBudgets()
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);
        var monthEnd = monthStart.AddMonths(1);

        var budgets = await _unitOfWork.Budgets
            .FindAsync(b => b.UserId == userId);

        var transactions = await _unitOfWork.Transactions
            .FindAsync(t => t.UserId == userId &&
                           t.Type == TransactionType.Expense &&
                           t.TransactionDate >= monthStart &&
                           t.TransactionDate < monthEnd);

        var spentByCategory = transactions
            .GroupBy(t => t.Category)
            .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount));

        var result = budgets.Select(b =>
        {
            var spent = spentByCategory.GetValueOrDefault(b.Category, 0);
            var percentUsed = b.AllocatedAmount > 0
                ? Math.Round(spent / b.AllocatedAmount * 100, 1)
                : 0;

            var status = percentUsed >= 100 ? "exceeded"
                : percentUsed >= b.AlertThreshold * 100 ? "warning"
                : "ok";

            return new BudgetDto
            {
                Id = b.Id,
                Category = b.Category,
                AllocatedAmount = b.AllocatedAmount,
                SpentAmount = spent,
                AlertThreshold = b.AlertThreshold,
                AlertEnabled = b.AlertEnabled,
                PercentUsed = percentUsed,
                Status = status,
            };
        }).OrderBy(b => b.Category).ToList();

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> CreateBudget([FromBody] CreateBudgetDto dto)
    {
        var userId = GetUserId();
        var now = DateTime.UtcNow;

        // Check if budget for this category already exists
        var existing = await _unitOfWork.Budgets
            .FindAsync(b => b.UserId == userId && b.Category == dto.Category);

        if (existing.Any())
            return BadRequest(new { message = $"A budget for {dto.Category} already exists" });

        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Category = dto.Category,
            AllocatedAmount = dto.AllocatedAmount,
            AlertThreshold = dto.AlertThreshold,
            AlertEnabled = dto.AlertEnabled,
            StartDate = new DateTime(now.Year, now.Month, 1),
            EndDate = new DateTime(now.Year, now.Month, 1).AddMonths(1),
            CreatedAt = DateTime.UtcNow,
        };

        await _unitOfWork.Budgets.AddAsync(budget);
        await _unitOfWork.SaveChangesAsync();
        return Ok(budget);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBudget(Guid id, [FromBody] CreateBudgetDto dto)
    {
        var userId = GetUserId();
        var budgets = await _unitOfWork.Budgets
            .FindAsync(b => b.Id == id && b.UserId == userId);
        var budget = budgets.FirstOrDefault();
        if (budget == null) return NotFound();

        budget.AllocatedAmount = dto.AllocatedAmount;
        budget.AlertThreshold = dto.AlertThreshold;
        budget.AlertEnabled = dto.AlertEnabled;
        budget.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Budgets.UpdateAsync(budget);
        await _unitOfWork.SaveChangesAsync();
        return Ok(budget);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBudget(Guid id)
    {
        var userId = GetUserId();
        var budgets = await _unitOfWork.Budgets
            .FindAsync(b => b.Id == id && b.UserId == userId);
        var budget = budgets.FirstOrDefault();
        if (budget == null) return NotFound();

        await _unitOfWork.Budgets.DeleteAsync(budget);
        await _unitOfWork.SaveChangesAsync();
        return Ok();
    }
}