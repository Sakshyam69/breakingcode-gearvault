using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddCustomerVehicleImageUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "CustomerVehicles",
                type: "character varying(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "CustomerVehicles");
        }
    }
}
