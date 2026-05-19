using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddVehicleHealthPredictionsAndAiIntegration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "VehicleHealthPredictions",
                columns: table => new
                {
                    VehicleHealthPredictionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerVehicleId = table.Column<int>(type: "integer", nullable: false),
                    RiskLevel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PredictedFailuresJson = table.Column<string>(type: "text", nullable: false),
                    RecommendedPartsJson = table.Column<string>(type: "text", nullable: false),
                    Urgency = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Why = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    NextCheckMileage = table.Column<int>(type: "integer", nullable: true),
                    NextCheckDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Disclaimer = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ModelUsed = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    GeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VehicleHealthPredictions", x => x.VehicleHealthPredictionId);
                    table.ForeignKey(
                        name: "FK_VehicleHealthPredictions_CustomerVehicles_CustomerVehicleId",
                        column: x => x.CustomerVehicleId,
                        principalTable: "CustomerVehicles",
                        principalColumn: "CustomerVehicleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_VehicleHealthPredictions_CustomerVehicleId",
                table: "VehicleHealthPredictions",
                column: "CustomerVehicleId");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleHealthPredictions_GeneratedAt",
                table: "VehicleHealthPredictions",
                column: "GeneratedAt");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleHealthPredictions_RiskLevel",
                table: "VehicleHealthPredictions",
                column: "RiskLevel");

            migrationBuilder.CreateIndex(
                name: "IX_VehicleHealthPredictions_Urgency",
                table: "VehicleHealthPredictions",
                column: "Urgency");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "VehicleHealthPredictions");
        }
    }
}
