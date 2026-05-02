using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class LinkServiceAppointmentsToSalesInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
