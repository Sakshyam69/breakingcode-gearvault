using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerVehicleManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerVehicles",
                columns: table => new
                {
                    CustomerVehicleId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    VehicleNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    Make = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Model = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Year = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Color = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    FuelType = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    EngineNumber = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ChassisNumber = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Mileage = table.Column<int>(type: "integer", nullable: true),
                    IsPrimary = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerVehicles", x => x.CustomerVehicleId);
                    table.ForeignKey(
                        name: "FK_CustomerVehicles_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CustomerVehicles_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CustomerVehicles_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_CreatedByUserId",
                table: "CustomerVehicles",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_CustomerId",
                table: "CustomerVehicles",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_IsActive",
                table: "CustomerVehicles",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_IsPrimary",
                table: "CustomerVehicles",
                column: "IsPrimary");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_Make",
                table: "CustomerVehicles",
                column: "Make");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_Model",
                table: "CustomerVehicles",
                column: "Model");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_UpdatedByUserId",
                table: "CustomerVehicles",
                column: "UpdatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerVehicles_VehicleNumber",
                table: "CustomerVehicles",
                column: "VehicleNumber",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerVehicles");
        }
    }
}
