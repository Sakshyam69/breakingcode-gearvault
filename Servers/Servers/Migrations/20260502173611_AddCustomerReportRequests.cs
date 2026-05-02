using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerReportRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CustomerReportRequests",
                columns: table => new
                {
                    CustomerReportRequestId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    ReportType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StaffNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CompletedByStaffId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerReportRequests", x => x.CustomerReportRequestId);
                    table.ForeignKey(
                        name: "FK_CustomerReportRequests_Users_CompletedByStaffId",
                        column: x => x.CompletedByStaffId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_CustomerReportRequests_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReportRequests_CompletedByStaffId",
                table: "CustomerReportRequests",
                column: "CompletedByStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReportRequests_CreatedAt",
                table: "CustomerReportRequests",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReportRequests_CustomerId",
                table: "CustomerReportRequests",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReportRequests_ReportType",
                table: "CustomerReportRequests",
                column: "ReportType");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerReportRequests_Status",
                table: "CustomerReportRequests",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerReportRequests");
        }
    }
}
