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
    }
}
