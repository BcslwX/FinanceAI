using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.API.Services;
using FinanceAI.ML.Services;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InsightsController : ControllerBase
{
    private readonly OpenAIInsightsService _insights;
    private readonly AnomalyDetectionService _anomaly;

    public InsightsController(
        OpenAIInsightsService insights,
        AnomalyDetectionService anomaly)
    {
        _insights = insights;
        _anomaly = anomaly;
    }
    
    [HttpGet]
    public async Task<IActionResult> GetInsights([FromQuery] int months = 1)
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        await _anomaly.DetectAndMarkAnomalies(userId);
        var result = await _insights.GenerateInsights(userId, months);
        return Ok(result);
    }
}