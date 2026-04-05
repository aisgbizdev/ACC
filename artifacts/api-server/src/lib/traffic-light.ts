import type { Finding } from "@workspace/db";

export type TrafficLightStatus = "green" | "yellow" | "red";

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function computeTrafficLight(
  lastActivityDate: string | null,
  findings: Finding[],
  today: string
): TrafficLightStatus {
  const weekend = isWeekend(today);
  const updatedToday = weekend ? true : lastActivityDate === today;

  const openFindings = findings.filter((f) => f.status !== "completed");

  const hasOverdue = openFindings.some((f) => {
    const daysDiff = Math.floor(
      (new Date(today).getTime() - new Date(f.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDiff > 3;
  });

  if (!updatedToday || hasOverdue) {
    return "red";
  }

  if (openFindings.length > 0) {
    return "yellow";
  }

  return "green";
}
