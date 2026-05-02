using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingInvoicesAndSeparateServiceBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SalesInvoices_ServiceAppointments_SourceServiceAppointmentId",
                table: "SalesInvoices");

            migrationBuilder.DropIndex(
                name: "IX_SalesInvoices_SourceServiceAppointmentId",
                table: "SalesInvoices");

            migrationBuilder.DropColumn(
                name: "SourceServiceAppointmentId",
                table: "SalesInvoices");

            migrationBuilder.CreateTable(
                name: "BookingInvoices",
                columns: table => new
                {
                    BookingInvoiceId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ServiceAppointmentId = table.Column<int>(type: "integer", nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    StaffId = table.Column<int>(type: "integer", nullable: false),
                    InvoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ServiceCharge = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    DiscountAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PaidAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    CreditAmount = table.Column<decimal>(type: "numeric(12,2)", precision: 12, scale: 2, nullable: false),
                    PaymentStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PaymentMethod = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    DueDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WorkSummary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    DiagnosisNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RecommendationNote = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    Notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    EmailSent = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    IsCancelled = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingInvoices", x => x.BookingInvoiceId);
                    table.ForeignKey(
                        name: "FK_BookingInvoices_ServiceAppointments_ServiceAppointmentId",
                        column: x => x.ServiceAppointmentId,
                        principalTable: "ServiceAppointments",
                        principalColumn: "ServiceAppointmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingInvoices_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BookingInvoices_Users_StaffId",
                        column: x => x.StaffId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_CustomerId",
                table: "BookingInvoices",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_InvoiceDate",
                table: "BookingInvoices",
                column: "InvoiceDate");

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_InvoiceNumber",
                table: "BookingInvoices",
                column: "InvoiceNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_IsCancelled",
                table: "BookingInvoices",
                column: "IsCancelled");

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_PaymentStatus",
                table: "BookingInvoices",
                column: "PaymentStatus");

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_ServiceAppointmentId",
                table: "BookingInvoices",
                column: "ServiceAppointmentId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BookingInvoices_StaffId",
                table: "BookingInvoices",
                column: "StaffId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BookingInvoices");

            migrationBuilder.AddColumn<int>(
                name: "SourceServiceAppointmentId",
                table: "SalesInvoices",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_SalesInvoices_SourceServiceAppointmentId",
                table: "SalesInvoices",
                column: "SourceServiceAppointmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_SalesInvoices_ServiceAppointments_SourceServiceAppointmentId",
                table: "SalesInvoices",
                column: "SourceServiceAppointmentId",
                principalTable: "ServiceAppointments",
                principalColumn: "ServiceAppointmentId",
                onDelete: ReferentialAction.SetNull);
        }
    }
}
