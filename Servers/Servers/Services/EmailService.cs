using System.Net;
using System.Net.Mail;
using System.Net.Mime;
using System.Text;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using Servers.Configuration;

namespace Servers.Services;

public interface IEmailService
{
    Task SendAsync(EmailMessage message, CancellationToken cancellationToken);

    Task SendBrandedAsync(BrandedEmailMessage message, CancellationToken cancellationToken);
}

public sealed record EmailMessage(
    string ToEmail,
    string Subject,
    string HtmlBody,
    string? TextBody = null,
    string? ToName = null);

public sealed record BrandedEmailMessage(
    string ToEmail,
    string Subject,
    string PreviewText,
    string Heading,
    string BodyHtml,
    string? ActionText = null,
    string? ActionUrl = null,
    string? TextBody = null,
    string? ToName = null);

public sealed class BrevoEmailService : IEmailService
{
    private readonly BrevoEmailOptions _options;
    private readonly ILogger<BrevoEmailService> _logger;

    public BrevoEmailService(
        IOptions<BrevoEmailOptions> options,
        ILogger<BrevoEmailService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task SendBrandedAsync(BrandedEmailMessage message, CancellationToken cancellationToken)
    {
        var html = BuildBrandedHtml(message);
        var text = message.TextBody ?? BuildPlainText(message);

        return SendAsync(
            new EmailMessage(
                message.ToEmail,
                message.Subject,
                html,
                text,
                message.ToName),
            cancellationToken);
    }

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        ValidateOptions();
        ValidateMessage(message);

        using var mailMessage = new MailMessage
        {
            From = new MailAddress(_options.FromEmail.Trim(), _options.FromName.Trim()),
            Subject = message.Subject.Trim(),
            SubjectEncoding = Encoding.UTF8,
            BodyEncoding = Encoding.UTF8,
            Body = message.HtmlBody,
            IsBodyHtml = true
        };

        mailMessage.To.Add(new MailAddress(message.ToEmail.Trim(), message.ToName));
        mailMessage.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            message.TextBody ?? StripHtml(message.HtmlBody),
            Encoding.UTF8,
            MediaTypeNames.Text.Plain));
        mailMessage.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(
            message.HtmlBody,
            Encoding.UTF8,
            MediaTypeNames.Text.Html));

        using var smtp = new SmtpClient(_options.SMTPServer.Trim(), _options.SMTPPort)
        {
            EnableSsl = true,
            DeliveryMethod = SmtpDeliveryMethod.Network,
            Credentials = new NetworkCredential(_options.SMTPUsername.Trim(), _options.SMTPKey)
        };

        _logger.LogInformation("Sending email '{Subject}' to {Recipient}.", message.Subject, message.ToEmail);
        await smtp.SendMailAsync(mailMessage, cancellationToken);
    }

    private string BuildBrandedHtml(BrandedEmailMessage message)
    {
        var brandName = HtmlEncoder.Default.Encode(_options.FromName);
        var preview = HtmlEncoder.Default.Encode(message.PreviewText);
        var heading = HtmlEncoder.Default.Encode(message.Heading);
        var headingHtml = heading.Replace(
            brandName,
            $"<span style=\"color:#ef1f2d;\">{brandName}</span>",
            StringComparison.OrdinalIgnoreCase);
        var logo = string.IsNullOrWhiteSpace(_options.BrandLogoUrl)
            ? string.Empty
            : $"""
              <img src="{HtmlEncoder.Default.Encode(_options.BrandLogoUrl)}" width="56" height="56" alt="{brandName}" style="display:block;border:0;object-fit:contain;">
              """;
        var heroBackground = string.IsNullOrWhiteSpace(_options.BrandHeroImageUrl)
            ? "#090909"
            : $"#090909 url('{HtmlEncoder.Default.Encode(_options.BrandHeroImageUrl)}') center/cover no-repeat";
        var action = string.IsNullOrWhiteSpace(message.ActionText) || string.IsNullOrWhiteSpace(message.ActionUrl)
            ? string.Empty
            : $"""
              <tr>
                <td style="padding:0 46px 34px;">
                  <a href="{HtmlEncoder.Default.Encode(message.ActionUrl)}" style="display:inline-block;background:#ef1f2d;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;line-height:20px;padding:13px 22px;border-radius:8px;">{HtmlEncoder.Default.Encode(message.ActionText)}</a>
                </td>
              </tr>
              """;

        return $"""
               <!doctype html>
               <html lang="en">
               <head>
                 <meta charset="utf-8">
                 <meta name="viewport" content="width=device-width, initial-scale=1">
                 <title>{HtmlEncoder.Default.Encode(message.Subject)}</title>
               </head>
               <body style="margin:0;padding:0;background:#f2f2f2;color:#111827;font-family:Arial,Helvetica,sans-serif;">
                 <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">{preview}</div>
                 <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f2f2f2;padding:14px;">
                   <tr>
                     <td align="center">
                       <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:700px;background:#ffffff;border:1px solid #dedede;border-radius:12px;overflow:hidden;box-shadow:0 16px 40px rgba(0,0,0,.16);">
                         <tr>
                           <td style="padding:0;background:{heroBackground};">
                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:linear-gradient(90deg,rgba(0,0,0,.96),rgba(0,0,0,.78),rgba(0,0,0,.42));">
                               <tr>
                                 <td style="padding:32px 46px 28px;">
                                   <table role="presentation" cellspacing="0" cellpadding="0">
                                     <tr>
                                       <td style="width:4px;background:#ef1f2d;border-radius:4px;"></td>
                                       <td style="padding-left:18px;">
                                         <table role="presentation" cellspacing="0" cellpadding="0">
                                           <tr>
                                             <td style="vertical-align:middle;">{logo}</td>
                                             <td style="vertical-align:middle;padding-left:12px;">
                                               <div style="color:#ffffff;font-size:26px;line-height:26px;font-weight:900;">Auto<span style="color:#ef1f2d;">Care</span></div>
                                               <div style="margin-top:4px;color:#c7c7c7;font-size:11px;line-height:14px;font-weight:700;">Parts &amp; Service Management</div>
                                             </td>
                                           </tr>
                                         </table>
                                       </td>
                                     </tr>
                                   </table>
                                   <h1 style="margin:36px 0 0;color:#ffffff;font-size:30px;line-height:38px;font-weight:900;">{headingHtml}</h1>
                                   <p style="margin:8px 0 0;color:#d1d5db;font-size:16px;line-height:24px;">{preview}</p>
                                 </td>
                               </tr>
                             </table>
                           </td>
                         </tr>
                         <tr>
                           <td style="height:6px;background:#ef1f2d;line-height:6px;font-size:0;">&nbsp;</td>
                         </tr>
                         <tr>
                           <td style="padding:34px 46px 12px;color:#1f2937;font-size:15px;line-height:24px;">
                             {message.BodyHtml}
                           </td>
                         </tr>
                         {action}
                         <tr>
                           <td style="padding:24px 46px;background:#fbfbfb;border-top:1px solid #e5e7eb;">
                             <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                               <tr>
                                 <td width="64" style="vertical-align:top;">
                                   <div style="width:54px;height:54px;border-radius:50%;background:#fff1f2;border:1px solid #fecdd3;color:#ef1f2d;text-align:center;font-size:28px;line-height:54px;font-weight:900;">!</div>
                                 </td>
                                 <td style="vertical-align:top;color:#4b5563;font-size:12px;line-height:18px;">
                                   <div style="color:#ef1f2d;font-size:13px;font-weight:900;margin-bottom:4px;">Security Note:</div>
                                   This message was sent by {brandName}. Please ignore it if you were not expecting this email.
                                 </td>
                               </tr>
                             </table>
                           </td>
                         </tr>
                         <tr>
                           <td style="padding:18px 46px 22px;background:#111111;border-top:4px solid #ef1f2d;text-align:center;color:#9ca3af;font-size:12px;line-height:20px;">
                             <div style="margin-bottom:8px;">
                               <span style="display:inline-block;width:24px;height:24px;border:1px solid #ef1f2d;border-radius:50%;color:#ef1f2d;line-height:24px;font-size:12px;font-weight:800;margin:0 5px;">f</span>
                               <span style="display:inline-block;width:24px;height:24px;border:1px solid #ef1f2d;border-radius:50%;color:#ef1f2d;line-height:24px;font-size:12px;font-weight:800;margin:0 5px;">ig</span>
                               <span style="display:inline-block;width:24px;height:24px;border:1px solid #ef1f2d;border-radius:50%;color:#ef1f2d;line-height:24px;font-size:12px;font-weight:800;margin:0 5px;">w</span>
                             </div>
                             &copy; 2026 <span style="color:#ef1f2d;">{brandName}</span>. All rights reserved.
                           </td>
                         </tr>
                       </table>
                     </td>
                   </tr>
                 </table>
               </body>
               </html>
               """;
    }

    private static string BuildPlainText(BrandedEmailMessage message)
    {
        var builder = new StringBuilder();
        builder.AppendLine(message.Heading);
        builder.AppendLine();
        builder.AppendLine(StripHtml(message.BodyHtml));

        if (!string.IsNullOrWhiteSpace(message.ActionText) && !string.IsNullOrWhiteSpace(message.ActionUrl))
        {
            builder.AppendLine();
            builder.AppendLine($"{message.ActionText}: {message.ActionUrl}");
        }

        return builder.ToString();
    }

    private void ValidateOptions()
    {
        if (string.IsNullOrWhiteSpace(_options.SMTPServer))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Brevo_SMTPServer in Servers/Servers/.env.");
        }

        if (_options.SMTPPort <= 0)
        {
            throw new InvalidOperationException("Brevo_SMTPPort must be a valid SMTP port.");
        }

        if (string.IsNullOrWhiteSpace(_options.SMTPUsername))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Brevo_SMTPUsername in Servers/Servers/.env.");
        }

        if (string.IsNullOrWhiteSpace(_options.SMTPKey))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Brevo_SMTPKey in Servers/Servers/.env.");
        }

        if (string.IsNullOrWhiteSpace(_options.FromEmail))
        {
            throw new InvalidOperationException("Brevo email is not configured. Set Brevo_From_Email in Servers/Servers/.env.");
        }
    }

    private static void ValidateMessage(EmailMessage message)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(message.ToEmail);
        ArgumentException.ThrowIfNullOrWhiteSpace(message.Subject);
        ArgumentException.ThrowIfNullOrWhiteSpace(message.HtmlBody);
    }

    private static string StripHtml(string html)
    {
        var builder = new StringBuilder(html.Length);
        var insideTag = false;

        foreach (var character in html)
        {
            if (character == '<')
            {
                insideTag = true;
                continue;
            }

            if (character == '>')
            {
                insideTag = false;
                builder.Append(' ');
                continue;
            }

            if (!insideTag)
            {
                builder.Append(character);
            }
        }

        return WebUtility.HtmlDecode(builder.ToString()).Trim();
    }
}
