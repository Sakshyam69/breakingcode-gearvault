using Microsoft.EntityFrameworkCore;
using Servers.Models;

namespace Servers.Data;

public sealed class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<UserProfile> UserProfiles => Set<UserProfile>();

    public DbSet<Vendor> Vendors => Set<Vendor>();

    public DbSet<VendorDetails> VendorDetails => Set<VendorDetails>();

    public DbSet<Part> Parts => Set<Part>();

    public DbSet<PartDetails> PartDetails => Set<PartDetails>();

    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();

    public DbSet<PurchaseInvoiceItem> PurchaseInvoiceItems => Set<PurchaseInvoiceItem>();

    public DbSet<CustomerVehicle> CustomerVehicles => Set<CustomerVehicle>();

    public DbSet<PartRequest> PartRequests => Set<PartRequest>();

    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();

    public DbSet<SalesInvoiceItem> SalesInvoiceItems => Set<SalesInvoiceItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(user => user.Id);

            entity.Property(user => user.FullName)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(user => user.Email)
                .HasMaxLength(180)
                .IsRequired();

            entity.HasIndex(user => user.Email).IsUnique();

            entity.Property(user => user.PasswordHash).IsRequired();

            entity.Property(user => user.Phone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(user => user.Role)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.HasIndex(user => user.Role);

            entity.Property(user => user.AccountSetupStatus)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(user => user.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();
        });

        modelBuilder.Entity<UserProfile>(entity =>
        {
            entity.ToTable("UserProfiles");
            entity.HasKey(profile => profile.Id);

            entity.Property(profile => profile.Address)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(profile => profile.City)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(profile => profile.Gender)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(profile => profile.ProfileImageUrl)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(profile => profile.EmergencyContactPhone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(profile => profile.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasOne(profile => profile.User)
                .WithOne(user => user.Profile)
                .HasForeignKey<UserProfile>(profile => profile.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(profile => profile.UserId).IsUnique();
        });

        modelBuilder.Entity<Vendor>(entity =>
        {
            entity.ToTable("Vendors");
            entity.HasKey(vendor => vendor.VendorId);

            entity.Property(vendor => vendor.Name)
                .HasMaxLength(160)
                .IsRequired();

            entity.Property(vendor => vendor.Email)
                .HasMaxLength(180)
                .IsRequired();

            entity.Property(vendor => vendor.Phone)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(vendor => vendor.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(vendor => vendor.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasIndex(vendor => vendor.Name);
            entity.HasIndex(vendor => vendor.Phone);
            entity.HasIndex(vendor => vendor.IsActive);

            entity.HasOne(vendor => vendor.CreatedByUser)
                .WithMany()
                .HasForeignKey(vendor => vendor.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(vendor => vendor.UpdatedByUser)
                .WithMany()
                .HasForeignKey(vendor => vendor.UpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<VendorDetails>(entity =>
        {
            entity.ToTable("VendorDetails");
            entity.HasKey(details => details.VendorDetailsId);

            entity.Property(details => details.ContactPerson)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.Address)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(details => details.City)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.Country)
                .HasMaxLength(80)
                .HasDefaultValue("Nepal")
                .IsRequired();

            entity.Property(details => details.TaxNumber)
                .HasMaxLength(80)
                .IsRequired();

            entity.Property(details => details.PaymentTerms)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.BankName)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.BankAccountNumber)
                .HasMaxLength(80)
                .IsRequired();

            entity.Property(details => details.Notes)
                .HasMaxLength(500)
                .IsRequired();

            entity.HasOne(details => details.Vendor)
                .WithOne(vendor => vendor.Details)
                .HasForeignKey<VendorDetails>(details => details.VendorId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(details => details.VendorId).IsUnique();
        });

        modelBuilder.Entity<Part>(entity =>
        {
            entity.ToTable("Parts");
            entity.HasKey(part => part.PartId);

            entity.Property(part => part.Name)
                .HasMaxLength(160)
                .IsRequired();

            entity.Property(part => part.PartNumber)
                .HasMaxLength(80)
                .IsRequired();

            entity.HasIndex(part => part.PartNumber).IsUnique();

            entity.Property(part => part.Brand)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(part => part.Category)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(part => part.SellingPrice)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(part => part.QuantityInStock)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(part => part.ReorderLevel)
                .HasDefaultValue(10)
                .IsRequired();

            entity.Property(part => part.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(part => part.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasIndex(part => part.Name);
            entity.HasIndex(part => part.Brand);
            entity.HasIndex(part => part.Category);
            entity.HasIndex(part => part.IsActive);
            entity.HasIndex(part => part.QuantityInStock);

            entity.HasOne(part => part.CreatedByUser)
                .WithMany()
                .HasForeignKey(part => part.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(part => part.UpdatedByUser)
                .WithMany()
                .HasForeignKey(part => part.UpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PartDetails>(entity =>
        {
            entity.ToTable("PartDetails");
            entity.HasKey(details => details.PartDetailsId);

            entity.Property(details => details.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(details => details.VehicleMake)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.VehicleModel)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.VehicleYear)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(details => details.CompatibleEngine)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.ShelfLocation)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(details => details.WarrantyPeriod)
                .HasMaxLength(80)
                .IsRequired();

            entity.Property(details => details.Notes)
                .HasMaxLength(500)
                .IsRequired();

            entity.HasOne(details => details.Part)
                .WithOne(part => part.Details)
                .HasForeignKey<PartDetails>(details => details.PartId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(details => details.PartId).IsUnique();
        });

        modelBuilder.Entity<PurchaseInvoice>(entity =>
        {
            entity.ToTable("PurchaseInvoices");
            entity.HasKey(invoice => invoice.PurchaseInvoiceId);

            entity.Property(invoice => invoice.InvoiceNumber)
                .HasMaxLength(80)
                .IsRequired();

            entity.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();

            entity.Property(invoice => invoice.PurchaseDate)
                .IsRequired();

            entity.Property(invoice => invoice.PaymentStatus)
                .HasConversion<string>()
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(invoice => invoice.Subtotal)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(invoice => invoice.DiscountAmount)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(invoice => invoice.TaxAmount)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(invoice => invoice.TotalAmount)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(invoice => invoice.Notes)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(invoice => invoice.IsCancelled)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(invoice => invoice.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasIndex(invoice => invoice.VendorId);
            entity.HasIndex(invoice => invoice.PurchaseDate);
            entity.HasIndex(invoice => invoice.PaymentStatus);
            entity.HasIndex(invoice => invoice.IsCancelled);

            entity.HasOne(invoice => invoice.Vendor)
                .WithMany()
                .HasForeignKey(invoice => invoice.VendorId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(invoice => invoice.CreatedByUser)
                .WithMany()
                .HasForeignKey(invoice => invoice.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(invoice => invoice.UpdatedByUser)
                .WithMany()
                .HasForeignKey(invoice => invoice.UpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<PurchaseInvoiceItem>(entity =>
        {
            entity.ToTable("PurchaseInvoiceItems");
            entity.HasKey(item => item.PurchaseInvoiceItemId);

            entity.Property(item => item.Quantity)
                .IsRequired();

            entity.Property(item => item.UnitCost)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.Property(item => item.LineTotal)
                .HasPrecision(12, 2)
                .HasDefaultValue(0)
                .IsRequired();

            entity.HasOne(item => item.PurchaseInvoice)
                .WithMany(invoice => invoice.Items)
                .HasForeignKey(item => item.PurchaseInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Part)
                .WithMany()
                .HasForeignKey(item => item.PartId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(item => item.PurchaseInvoiceId);
            entity.HasIndex(item => item.PartId);
        });

        modelBuilder.Entity<CustomerVehicle>(entity =>
        {
            entity.ToTable("CustomerVehicles");
            entity.HasKey(vehicle => vehicle.CustomerVehicleId);

            entity.Property(vehicle => vehicle.VehicleNumber)
                .HasMaxLength(40)
                .IsRequired();

            entity.HasIndex(vehicle => vehicle.VehicleNumber).IsUnique();

            entity.Property(vehicle => vehicle.Make)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(vehicle => vehicle.Model)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(vehicle => vehicle.Year)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(vehicle => vehicle.Color)
                .HasMaxLength(60)
                .IsRequired();

            entity.Property(vehicle => vehicle.FuelType)
                .HasMaxLength(60)
                .IsRequired();

            entity.Property(vehicle => vehicle.EngineNumber)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(vehicle => vehicle.ChassisNumber)
                .HasMaxLength(120)
                .IsRequired();

            entity.Property(vehicle => vehicle.Notes)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(vehicle => vehicle.IsPrimary)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(vehicle => vehicle.IsActive)
                .HasDefaultValue(true)
                .IsRequired();

            entity.Property(vehicle => vehicle.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasOne(vehicle => vehicle.Customer)
                .WithMany()
                .HasForeignKey(vehicle => vehicle.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(vehicle => vehicle.CreatedByUser)
                .WithMany()
                .HasForeignKey(vehicle => vehicle.CreatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(vehicle => vehicle.UpdatedByUser)
                .WithMany()
                .HasForeignKey(vehicle => vehicle.UpdatedByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(vehicle => vehicle.CustomerId);
            entity.HasIndex(vehicle => vehicle.IsActive);
            entity.HasIndex(vehicle => vehicle.IsPrimary);
            entity.HasIndex(vehicle => vehicle.Make);
            entity.HasIndex(vehicle => vehicle.Model);
        });

        modelBuilder.Entity<PartRequest>(entity =>
        {
            entity.ToTable("PartRequests");
            entity.HasKey(request => request.PartRequestId);

            entity.Property(request => request.PartName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(request => request.PartNumber)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(request => request.Description)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(request => request.Quantity)
                .IsRequired();

            entity.Property(request => request.Urgency)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(request => request.Status)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(request => request.StaffNote)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(request => request.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasOne(request => request.Customer)
                .WithMany()
                .HasForeignKey(request => request.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(request => request.Vehicle)
                .WithMany()
                .HasForeignKey(request => request.VehicleId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(request => request.RequestedPart)
                .WithMany()
                .HasForeignKey(request => request.RequestedPartId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(request => request.CustomerId);
            entity.HasIndex(request => request.VehicleId);
            entity.HasIndex(request => request.RequestedPartId);
            entity.HasIndex(request => request.Status);
            entity.HasIndex(request => request.Urgency);
            entity.HasIndex(request => request.CreatedAt);
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.ToTable("Notifications");
            entity.HasKey(notification => notification.NotificationId);

            entity.Property(notification => notification.RoleTarget)
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(notification => notification.Type)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(notification => notification.Title)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(notification => notification.Message)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(notification => notification.LinkUrl)
                .HasMaxLength(250)
                .IsRequired();

            entity.Property(notification => notification.RelatedEntityType)
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(notification => notification.IsRead)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(notification => notification.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasOne(notification => notification.User)
                .WithMany()
                .HasForeignKey(notification => notification.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(notification => notification.UserId);
            entity.HasIndex(notification => notification.RoleTarget);
            entity.HasIndex(notification => notification.Type);
            entity.HasIndex(notification => notification.IsRead);
            entity.HasIndex(notification => notification.CreatedAt);
        });

        modelBuilder.Entity<SalesInvoice>(entity =>
        {
            entity.ToTable("SalesInvoices");
            entity.HasKey(invoice => invoice.SalesInvoiceId);

            entity.Property(invoice => invoice.InvoiceNumber)
                .HasMaxLength(50)
                .IsRequired();

            entity.HasIndex(invoice => invoice.InvoiceNumber).IsUnique();

            entity.Property(invoice => invoice.InvoiceDate)
                .IsRequired();

            entity.Property(invoice => invoice.Subtotal)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.DiscountAmount)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.DiscountReason)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(invoice => invoice.TaxAmount)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.TotalAmount)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.PaidAmount)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.CreditAmount)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(invoice => invoice.PaymentStatus)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(invoice => invoice.PaymentMethod)
                .HasConversion<string>()
                .HasMaxLength(30)
                .IsRequired();

            entity.Property(invoice => invoice.Notes)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(invoice => invoice.EmailSent)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(invoice => invoice.IsCancelled)
                .HasDefaultValue(false)
                .IsRequired();

            entity.Property(invoice => invoice.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();

            entity.HasOne(invoice => invoice.Customer)
                .WithMany()
                .HasForeignKey(invoice => invoice.CustomerId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(invoice => invoice.Staff)
                .WithMany()
                .HasForeignKey(invoice => invoice.StaffId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(invoice => invoice.SourcePartRequest)
                .WithMany()
                .HasForeignKey(invoice => invoice.SourcePartRequestId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(invoice => invoice.CustomerId);
            entity.HasIndex(invoice => invoice.StaffId);
            entity.HasIndex(invoice => invoice.SourcePartRequestId);
            entity.HasIndex(invoice => invoice.InvoiceDate);
            entity.HasIndex(invoice => invoice.PaymentStatus);
            entity.HasIndex(invoice => invoice.IsCancelled);
        });

        modelBuilder.Entity<SalesInvoiceItem>(entity =>
        {
            entity.ToTable("SalesInvoiceItems");
            entity.HasKey(item => item.SalesInvoiceItemId);

            entity.Property(item => item.PartName)
                .HasMaxLength(150)
                .IsRequired();

            entity.Property(item => item.PartNumber)
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(item => item.UnitPrice)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.Property(item => item.Quantity)
                .IsRequired();

            entity.Property(item => item.LineTotal)
                .HasPrecision(12, 2)
                .IsRequired();

            entity.HasOne(item => item.SalesInvoice)
                .WithMany(invoice => invoice.Items)
                .HasForeignKey(item => item.SalesInvoiceId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(item => item.Part)
                .WithMany()
                .HasForeignKey(item => item.PartId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(item => item.SalesInvoiceId);
            entity.HasIndex(item => item.PartId);
        });
    }
}
