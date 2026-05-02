using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerCreditsAndInvoiceOverpayments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "CustomerCreditAddedAmount",
                table: "SalesInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerCreditAppliedAmount",
                table: "SalesInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReturnAmount",
                table: "SalesInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerCreditAddedAmount",
                table: "BookingInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "CustomerCreditAppliedAmount",
                table: "BookingInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ReturnAmount",
                table: "BookingInvoices",
                type: "numeric(12,2)",
                precision: 12,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "CustomerCreditAccounts",
                columns: table => new
                {
                    CustomerCreditAccountId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    Balance = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false, defaultValue: 0m),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerCreditAccounts", x => x.CustomerCreditAccountId);
                    table.ForeignKey(
                        name: "FK_CustomerCreditAccounts_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "CustomerCreditTransactions",
                columns: table => new
                {
                    CustomerCreditTransactionId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CustomerCreditAccountId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Amount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    SourceType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SourceId = table.Column<int>(type: "integer", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CustomerCreditTransactions", x => x.CustomerCreditTransactionId);
                    table.ForeignKey(
                        name: "FK_CustomerCreditTransactions_CustomerCreditAccounts_CustomerC~",
                        column: x => x.CustomerCreditAccountId,
                        principalTable: "CustomerCreditAccounts",
                        principalColumn: "CustomerCreditAccountId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CustomerCreditTransactions_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditAccounts_CustomerId",
                table: "CustomerCreditAccounts",
                column: "CustomerId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditTransactions_CreatedAt",
                table: "CustomerCreditTransactions",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditTransactions_CustomerCreditAccountId",
                table: "CustomerCreditTransactions",
                column: "CustomerCreditAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditTransactions_CustomerId",
                table: "CustomerCreditTransactions",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditTransactions_SourceId",
                table: "CustomerCreditTransactions",
                column: "SourceId");

            migrationBuilder.CreateIndex(
                name: "IX_CustomerCreditTransactions_SourceType",
                table: "CustomerCreditTransactions",
                column: "SourceType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CustomerCreditTransactions");

            migrationBuilder.DropTable(
                name: "CustomerCreditAccounts");

            migrationBuilder.DropColumn(
                name: "CustomerCreditAddedAmount",
                table: "SalesInvoices");

            migrationBuilder.DropColumn(
                name: "CustomerCreditAppliedAmount",
                table: "SalesInvoices");

            migrationBuilder.DropColumn(
                name: "ReturnAmount",
                table: "SalesInvoices");

            migrationBuilder.DropColumn(
                name: "CustomerCreditAddedAmount",
                table: "BookingInvoices");

            migrationBuilder.DropColumn(
                name: "CustomerCreditAppliedAmount",
                table: "BookingInvoices");

            migrationBuilder.DropColumn(
                name: "ReturnAmount",
                table: "BookingInvoices");
        }
    }
}
