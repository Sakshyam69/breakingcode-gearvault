using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AllowCustomSalesInvoiceItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseInvoiceItems_Parts_PartId",
                table: "PurchaseInvoiceItems");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesInvoiceItems_Parts_PartId",
                table: "SalesInvoiceItems");

            migrationBuilder.AlterColumn<int>(
                name: "PartId",
                table: "SalesInvoiceItems",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseInvoiceItems_Parts_PartId",
                table: "PurchaseInvoiceItems",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "PartId",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesInvoiceItems_Parts_PartId",
                table: "SalesInvoiceItems",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "PartId",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseInvoiceItems_Parts_PartId",
                table: "PurchaseInvoiceItems");

            migrationBuilder.DropForeignKey(
                name: "FK_SalesInvoiceItems_Parts_PartId",
                table: "SalesInvoiceItems");

            migrationBuilder.AlterColumn<int>(
                name: "PartId",
                table: "SalesInvoiceItems",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseInvoiceItems_Parts_PartId",
                table: "PurchaseInvoiceItems",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "PartId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_SalesInvoiceItems_Parts_PartId",
                table: "SalesInvoiceItems",
                column: "PartId",
                principalTable: "Parts",
                principalColumn: "PartId",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
