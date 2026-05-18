/**
 * Get the appropriate dashboard path based on user role/type
 */
export function getDashboardPathByUserType(
  userType: string | undefined
): string {
  if (!userType) return "/";

  const type = userType.toLowerCase();

  switch (type) {
    case "doctor":
      return "/doctorDash";
    case "admin":
    case "staff":
      return "/doctorDash";
    case "patient":
    case "clinic":
    default:
      return "/";
  }
}
