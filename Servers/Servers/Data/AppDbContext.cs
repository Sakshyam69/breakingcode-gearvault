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
    }
}
