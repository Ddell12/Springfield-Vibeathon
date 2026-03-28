export function calculateAge(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function formatAge(dateOfBirth: string): string {
  const age = calculateAge(dateOfBirth);
  if (age < 2) {
    const dob = new Date(dateOfBirth);
    const months = (new Date().getFullYear() - dob.getFullYear()) * 12 +
      (new Date().getMonth() - dob.getMonth());
    return `${months}mo`;
  }
  return `${age}y`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function formatFullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
