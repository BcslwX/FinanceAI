
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.API.DTOs;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TransactionsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public TransactionsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<TransactionDto>>> GetTransactions()
    {
        var userId = GetUserId();
        var transactions = await _unitOfWork.Transactions.FindAsync(t => t.UserId == userId);

        var dtos = transactions.OrderByDescending(t => t.TransactionDate).Select(t => new TransactionDto
        {
            Id = t.Id,
            Amount = t.Amount,
            Type = t.Type.ToString(),
            Category = t.Category,
            Description = t.Description,
            TransactionDate = t.TransactionDate,
            Merchant = t.Merchant
        });

        return Ok(dtos);
    }
    
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransaction(Guid id, [FromBody] CreateTransactionDto dto)
    {
        var userId = GetUserId();
        var transactions = await _unitOfWork.Transactions.FindAsync(t => t.Id == id && t.UserId == userId);
        var tx = transactions.FirstOrDefault();

        if (tx == null) return NotFound();

        tx.Amount = dto.Amount;
        tx.Type = Enum.Parse<TransactionType>(dto.Type);
        tx.Category = dto.Category;
        tx.Description = dto.Description;
        tx.Merchant = dto.Merchant;
        tx.TransactionDate = dto.TransactionDate;
        tx.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Transactions.UpdateAsync(tx);
        await _unitOfWork.SaveChangesAsync();
        return Ok(tx);
    }
    
    [HttpPost]
    public async Task<ActionResult<TransactionDto>> CreateTransaction(CreateTransactionDto dto)
    {
        var userId = GetUserId();

        var transaction = new Transaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Amount = dto.Amount,
            Type = Enum.Parse<TransactionType>(dto.Type),
            Category = dto.Category,
            Description = dto.Description,
            TransactionDate = dto.TransactionDate,
            Merchant = dto.Merchant
        };

        await _unitOfWork.Transactions.AddAsync(transaction);

        return CreatedAtAction(nameof(GetTransactions), new TransactionDto
        {
            Id = transaction.Id,
            Amount = transaction.Amount,
            Type = transaction.Type.ToString(),
            Category = transaction.Category,
            Description = transaction.Description,
            TransactionDate = transaction.TransactionDate,
            Merchant = transaction.Merchant
        });
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(Guid id)
    {
        var transaction = await _unitOfWork.Transactions.GetByIdAsync(id);
        if (transaction == null) return NotFound();

        await _unitOfWork.Transactions.DeleteAsync(transaction);
        return NoContent();
    }
}