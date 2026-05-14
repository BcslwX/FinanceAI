using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FinanceAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBudgetAlertColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AlertEnabled",
                table: "Budgets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "AlertThreshold",
                table: "Budgets",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlertEnabled",
                table: "Budgets");

            migrationBuilder.DropColumn(
                name: "AlertThreshold",
                table: "Budgets");
        }
    }
}
