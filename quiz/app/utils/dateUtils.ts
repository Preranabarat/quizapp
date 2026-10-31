/**
 * Formats a date string to a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const differenceInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (differenceInSeconds < 60) {
    return `${differenceInSeconds}s ago`;
  }
  
  const differenceInMinutes = Math.floor(differenceInSeconds / 60);
  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }
  
  const differenceInHours = Math.floor(differenceInMinutes / 60);
  if (differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }
  
  const differenceInDays = Math.floor(differenceInHours / 24);
  if (differenceInDays < 30) {
    return `${differenceInDays}d ago`;
  }
  
  const differenceInMonths = Math.floor(differenceInDays / 30);
  if (differenceInMonths < 12) {
    return `${differenceInMonths}mo ago`;
  }
  
  const differenceInYears = Math.floor(differenceInMonths / 12);
  return `${differenceInYears}y ago`;
} 