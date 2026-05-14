using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FinanceAI.ML.Services;
using System.Security.Claims;

namespace FinanceAI.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PredictionsController : ControllerBase
{
    private readonly PredictionService _predictionService;

    public PredictionsController(PredictionService predictionService)
    {
        _predictionService = predictionService;
    }

    [HttpGet]
    public async Task<IActionResult> GetPredictions()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _predictionService.GetDetailedPredictions(userId);
        return Ok(result);
    }
}