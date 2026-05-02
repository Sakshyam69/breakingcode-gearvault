using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Servers.Migrations
{
    public partial class NormalizePartRequestInvoiceStatus : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "PartRequests"
                SET "Status" = 'Invoiced'
                WHERE "Status" = 'ConvertedToInvoice';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "PartRequests"
                SET "Status" = 'ConvertedToInvoice'
                WHERE "Status" = 'Invoiced';
                """);
        }
    }
}
