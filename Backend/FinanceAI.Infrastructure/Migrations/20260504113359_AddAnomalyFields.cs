using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAnomalyFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<double>(
                name: "AnomalyScore",
                table: "Transactions",
                type: "float",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<bool>(
                name: "IsAnomaly",
                table: "Transactions",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnomalyScore",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "IsAnomaly",
                table: "Transactions");
        }
    }
}
