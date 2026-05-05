using System.ComponentModel.DataAnnotations;
using Servers.Models;

namespace Servers.DTOs.Auth;

public sealed class UpdateUserRoleRequest
{
    [Required]
    public UserRole Role { get; set; }
}

public sealed class UpdateUserActiveRequest
{
    [Required]
    public bool IsActive { get; set; }
}

