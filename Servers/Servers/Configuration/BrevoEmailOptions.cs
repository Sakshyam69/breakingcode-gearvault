namespace Servers.Configuration;

public sealed class BrevoEmailOptions
{
    public const string SectionName = "Brevo";

    public string SMTPServer { get; set; } = string.Empty;

    public int SMTPPort { get; set; } = 587;

    public string SMTPUsername { get; set; } = string.Empty;

    public string SMTPKey { get; set; } = string.Empty;

    public string FromEmail { get; set; } = string.Empty;

    public string FromName { get; set; } = "AutoCare";

    public string BrandLogoUrl { get; set; } = string.Empty;

    public string BrandHeroImageUrl { get; set; } = string.Empty;

    public string AppBaseUrl { get; set; } = string.Empty;
}
