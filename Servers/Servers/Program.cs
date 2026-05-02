using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using Npgsql;
using Servers.Authentication;
using Servers.Configuration;
using Servers.Data;
using Servers.Models;
using Servers.Repositories;
using Servers.Services;

LoadDotEnv();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Autocare API",
        Version = "v1",
        Description = "Vehicle parts selling and inventory management backend API."
    });

    options.AddSecurityDefinition(AuthSchemes.Bearer, new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "AuthToken",
        In = ParameterLocation.Header,
        Description = "Paste only the token value returned by /api/auth/login."
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference(AuthSchemes.Bearer, document, null),
            []
        }
    });
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "http://localhost:5174",
                "http://localhost:5175",
                "https://localhost:5173",
                "https://localhost:5174",
                "https://localhost:5175")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.Configure<AuthTokenOptions>(builder.Configuration.GetSection(AuthTokenOptions.SectionName));
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection(CloudinaryOptions.SectionName));
builder.Services.Configure<BrevoEmailOptions>(builder.Configuration.GetSection(BrevoEmailOptions.SectionName));
builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseNpgsql(GetDatabaseConnectionString(builder.Configuration));
});
builder.Services.AddSingleton<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddSingleton<IAuthTokenService, HmacAuthTokenService>();
builder.Services.AddHttpClient<ICloudinaryService, CloudinaryService>();
builder.Services.AddScoped<IEmailService, BrevoEmailService>();
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IVendorService, VendorService>();
builder.Services.AddScoped<IPartService, PartService>();
builder.Services.AddScoped<IPurchaseInvoiceService, PurchaseInvoiceService>();
builder.Services.AddScoped<ICustomerVehicleService, CustomerVehicleService>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IPartRequestService, PartRequestService>();
builder.Services.AddScoped<ISalesInvoiceService, SalesInvoiceService>();
builder.Services.AddScoped<IServiceAppointmentService, ServiceAppointmentService>();
builder.Services.AddScoped<IBookingInvoiceService, BookingInvoiceService>();
builder.Services.AddScoped<ICustomerCreditService, CustomerCreditService>();
builder.Services.AddScoped<ICustomerReportService, CustomerReportService>();
builder.Services
    .AddAuthentication(AuthSchemes.Bearer)
    .AddScheme<AuthenticationSchemeOptions, HmacTokenAuthenticationHandler>(AuthSchemes.Bearer, options => { });
builder.Services.AddAuthorization();

var app = builder.Build();

await InitializeDatabaseAsync(app.Services);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/swagger/v1/swagger.json", "Autocare API v1");
        options.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseCors("Frontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static void LoadDotEnv()
{
    var currentDirectory = Directory.GetCurrentDirectory();
    var candidatePaths = new[]
    {
        Path.Combine(currentDirectory, ".env"),
        Path.Combine(currentDirectory, "Servers", "Servers", ".env"),
        Path.Combine(AppContext.BaseDirectory, ".env")
    };

    var envPath = candidatePaths.FirstOrDefault(File.Exists);
    if (envPath is null)
    {
        return;
    }

    foreach (var rawLine in File.ReadAllLines(envPath))
    {
        var line = rawLine.Trim();
        if (line.Length == 0 || line.StartsWith('#'))
        {
            continue;
        }

        var separatorIndex = line.IndexOf('=');
        if (separatorIndex <= 0)
        {
            continue;
        }

        var key = NormalizeEnvKey(line[..separatorIndex].Trim());
        var value = line[(separatorIndex + 1)..].Trim();
        if (value.Length >= 2
            && ((value[0] == '"' && value[^1] == '"')
                || (value[0] == '\'' && value[^1] == '\'')))
        {
            value = value[1..^1];
        }

        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}

static string NormalizeEnvKey(string key)
{
    const string authTokenPrefix = "AuthToken_";
    const string cloudinaryPrefix = "Cloudinary_";
    const string brevoPrefix = "Brevo_";

    if (key.StartsWith(authTokenPrefix, StringComparison.Ordinal))
    {
        return $"AuthToken__{key[authTokenPrefix.Length..]}";
    }

    if (key.StartsWith(cloudinaryPrefix, StringComparison.Ordinal))
    {
        return $"Cloudinary__{key[cloudinaryPrefix.Length..]}";
    }

    if (key.StartsWith(brevoPrefix, StringComparison.Ordinal))
    {
        return $"Brevo__{NormalizeBrevoKey(key[brevoPrefix.Length..])}";
    }

    if (key is "BrandLogoUrl" or "BrandHeroImageUrl")
    {
        return $"Brevo__{key}";
    }

    return key;
}

static string NormalizeBrevoKey(string key)
{
    return key switch
    {
        "From_Email" => "FromEmail",
        "From_Name" => "FromName",
        "Brand_Logo_Url" => "BrandLogoUrl",
        "BrandLogo_Url" => "BrandLogoUrl",
        "Brand_Hero_Image_Url" => "BrandHeroImageUrl",
        "BrandHeroImage_Url" => "BrandHeroImageUrl",
        "SMPTPKEY" => "SMTPKey",
        _ => key
    };
}

static string GetDatabaseConnectionString(IConfiguration configuration)
{
    var connectionString = configuration.GetConnectionString("DefaultConnection");
    if (!string.IsNullOrWhiteSpace(connectionString))
    {
        return connectionString;
    }

    var databaseUrl = configuration["DatabaseUrl"];
    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        databaseUrl = Environment.GetEnvironmentVariable("DATABASE_URL");
    }

    if (string.IsNullOrWhiteSpace(databaseUrl))
    {
        throw new InvalidOperationException("Configure ConnectionStrings:DefaultConnection, DatabaseUrl, or DATABASE_URL.");
    }

    var uri = new Uri(databaseUrl);
    if (IsPlaceholderDatabaseUrl(uri))
    {
        throw new InvalidOperationException("DATABASE_URL still contains placeholder values. Put your real Neon/Postgres connection string in Servers/Servers/.env.");
    }

    var userInfo = uri.UserInfo.Split(':', 2);
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = uri.AbsolutePath.TrimStart('/'),
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
        SslMode = SslMode.Require,
        ChannelBinding = ChannelBinding.Require
    };

    return builder.ConnectionString;
}

static bool IsPlaceholderDatabaseUrl(Uri uri)
{
    var userInfo = uri.UserInfo.Split(':', 2);
    var username = userInfo.Length > 0 ? Uri.UnescapeDataString(userInfo[0]) : string.Empty;
    var password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty;
    var database = uri.AbsolutePath.TrimStart('/');

    return uri.Host.Equals("HOST", StringComparison.OrdinalIgnoreCase)
        || username.Equals("USER", StringComparison.OrdinalIgnoreCase)
        || password.Equals("PASSWORD", StringComparison.OrdinalIgnoreCase)
        || database.Equals("DATABASE", StringComparison.OrdinalIgnoreCase);
}

static async Task InitializeDatabaseAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

    await db.Database.MigrateAsync();

    if (await db.Users.AnyAsync())
    {
        return;
    }

    db.Users.AddRange(
        CreateSeedUser(passwordHasher, "System Admin", "admin@autocare.local", "9800000000", UserRole.Admin, "Admin@12345"),
        CreateSeedUser(passwordHasher, "Demo Staff", "staff@autocare.local", "9800000001", UserRole.Staff, "Staff@12345"),
        CreateSeedUser(passwordHasher, "Demo Customer", "customer@autocare.local", "9800000002", UserRole.Customer, "Customer@12345"));

    await db.SaveChangesAsync();
}

static User CreateSeedUser(
    IPasswordHasher passwordHasher,
    string fullName,
    string email,
    string phone,
    UserRole role,
    string password)
{
    return new User
    {
        FullName = fullName,
        Email = email,
        Phone = phone,
        Role = role,
        PasswordHash = passwordHasher.Hash(password),
        CreatedAt = DateTime.UtcNow
    };
}
