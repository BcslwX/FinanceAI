using System.Globalization;

namespace FinanceAI.Analytics.Services;

public class ParsedTransaction
{
    public DateTime Date { get; set; }
    public decimal Amount { get; set; }
    public string Counterparty { get; set; } = "";
    public string Details { get; set; } = "";
    public string Type { get; set; } = ""; // "D" or "C"
}

public class CsvImportService
{
    public List<ParsedTransaction> ParseSebCsv(Stream fileStream)
    {
        var results = new List<ParsedTransaction>();

        using var reader = new StreamReader(fileStream, System.Text.Encoding.UTF8);

        // Skip first line (account info)
        reader.ReadLine();
        // Skip second line (headers)
        reader.ReadLine();

        string? line;
        while ((line = reader.ReadLine()) != null)
        {
            if (string.IsNullOrWhiteSpace(line)) continue;

            var cols = SplitSebCsvLine(line);
            if (cols.Count < 15) continue;

            // Columns: 0=InstructionId, 1=Date, 2=Currency, 3=Amount,
            // 4=Counterparty, 9=Details, 14=DebitCredit
            if (!DateTime.TryParse(cols[1].Trim('"'), out var date)) continue;

            var amountStr = cols[3].Trim('"').Replace(",", ".");
            if (!decimal.TryParse(amountStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var amount)) continue;

            results.Add(new ParsedTransaction
            {
                Date = date,
                Amount = amount,
                Counterparty = cols[4].Trim('"'),
                Details = cols[9].Trim('"'),
                Type = cols[14].Trim('"'), // "D" or "C"
            });
        }

        return results;
    }

    private List<string> SplitSebCsvLine(string line)
    {
        // SEB uses semicolons, values wrapped in quotes
        var result = new List<string>();
        var current = "";
        var inQuotes = false;

        foreach (var ch in line)
        {
            if (ch == '"') { inQuotes = !inQuotes; current += ch; }
            else if (ch == ';' && !inQuotes) { result.Add(current); current = ""; }
            else current += ch;
        }

        result.Add(current);
        return result;
    }
}