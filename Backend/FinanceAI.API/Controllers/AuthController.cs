
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using FinanceAI.API.DTOs;
using FinanceAI.Core.Entities;
using FinanceAI.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IConfiguration _configuration;

    public AuthController(IUnitOfWork unitOfWork, IConfiguration configuration)
    {
        _unitOfWork = unitOfWork;
        _configuration = configuration;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        var existing = await _unitOfWork.Users.FindAsync(u => u.Email == dto.Email);
        if (existing.Any())
            return BadRequest(new { message = "Email already registered" });

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            MonthlyIncome = dto.MonthlyIncome
        };

        await _unitOfWork.Users.AddAsync(user);
        var token = GenerateJwtToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var users = await _unitOfWork.Users.FindAsync(u => u.Email == dto.Email);
        var user = users.FirstOrDefault();

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        var token = GenerateJwtToken(user);

        return Ok(new AuthResponseDto
        {
            Token = token,
            UserId = user.Id,
            Email = user.Email,
            FirstName = user.FirstName,
            LastName = user.LastName
        });
    }
    
    [HttpPut("profile")]
[Authorize]
public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
{
    var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    var users = await _unitOfWork.Users.FindAsync(u => u.Id == userId);
    var user = users.FirstOrDefault();
    if (user == null) return NotFound();

    // Check email not taken by someone else
    if (user.Email != dto.Email)
    {
        var existing = await _unitOfWork.Users.FindAsync(u => u.Email == dto.Email);
        if (existing.Any()) return BadRequest(new { message = "Email already in use" });
    }

    user.Email = dto.Email;
    user.FirstName = dto.FirstName;
    user.LastName = dto.LastName;
    user.MonthlyIncome = dto.MonthlyIncome;
    user.UpdatedAt = DateTime.UtcNow;

    await _unitOfWork.Users.UpdateAsync(user);
    await _unitOfWork.SaveChangesAsync();

    return Ok(new {
        message = "Profile updated successfully",
        firstName = user.FirstName,
        email = user.Email,
    });
}

[HttpPut("password")]
[Authorize]
public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDto dto)
{
    var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    var users = await _unitOfWork.Users.FindAsync(u => u.Id == userId);
    var user = users.FirstOrDefault();
    if (user == null) return NotFound();

    // Verify current password
    if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        return BadRequest(new { message = "Current password is incorrect" });

    if (dto.NewPassword.Length < 6)
        return BadRequest(new { message = "New password must be at least 6 characters" });

    user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
    user.UpdatedAt = DateTime.UtcNow;

    await _unitOfWork.Users.UpdateAsync(user);
    await _unitOfWork.SaveChangesAsync();

    return Ok(new { message = "Password updated successfully" });
}

[HttpGet("profile")]
[Authorize]
public async Task<IActionResult> GetProfile()
{
    var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    var users = await _unitOfWork.Users.FindAsync(u => u.Id == userId);
    var user = users.FirstOrDefault();
    if (user == null) return NotFound();

    return Ok(new {
        firstName = user.FirstName,
        lastName = user.LastName,
        email = user.Email,
        monthlyIncome = user.MonthlyIncome,
        createdAt = user.CreatedAt,
    });
}
    
    private string GenerateJwtToken(User user)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}")
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.Now.AddDays(7),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}