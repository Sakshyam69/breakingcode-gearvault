using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Servers.Migrations
{
    /// <inheritdoc />
    public partial class AddServiceAppointments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ServiceAppointments",
                columns: table => new
                {
                    ServiceAppointmentId = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AppointmentNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CustomerId = table.Column<int>(type: "integer", nullable: false),
                    VehicleId = table.Column<int>(type: "integer", nullable: false),
                    AssignedStaffId = table.Column<int>(type: "integer", nullable: true),
                    ServiceType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    CustomServiceType = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Urgency = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PreferredDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PreferredTimeSlot = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    ScheduledStartAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ScheduledEndAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    MileageAtBooking = table.Column<int>(type: "integer", nullable: true),
                    ProblemDescription = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    CustomerNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    StaffNote = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DiagnosisNote = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    CompletionNote = table.Column<string>(type: "character varying(800)", maxLength: 800, nullable: false),
                    CancelledByRole = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    CancellationReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ConfirmedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ServiceAppointments", x => x.ServiceAppointmentId);
                    table.ForeignKey(
                        name: "FK_ServiceAppointments_CustomerVehicles_VehicleId",
                        column: x => x.VehicleId,
                        principalTable: "CustomerVehicles",
                        principalColumn: "CustomerVehicleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ServiceAppointments_Users_AssignedStaffId",
                        column: x => x.AssignedStaffId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_ServiceAppointments_Users_CustomerId",
                        column: x => x.CustomerId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_AppointmentNumber",
                table: "ServiceAppointments",
                column: "AppointmentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_AssignedStaffId",
                table: "ServiceAppointments",
                column: "AssignedStaffId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_CreatedAt",
                table: "ServiceAppointments",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_CustomerId",
                table: "ServiceAppointments",
                column: "CustomerId");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_PreferredDate",
                table: "ServiceAppointments",
                column: "PreferredDate");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_Status",
                table: "ServiceAppointments",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_Urgency",
                table: "ServiceAppointments",
                column: "Urgency");

            migrationBuilder.CreateIndex(
                name: "IX_ServiceAppointments_VehicleId",
                table: "ServiceAppointments",
                column: "VehicleId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ServiceAppointments");
        }
    }
}
