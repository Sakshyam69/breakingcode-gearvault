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

            entity.Property(user => user.CreatedAt)
                .HasDefaultValueSql("NOW()")
                .IsRequired();
        });
    }
}
