export function groupSchedules(schedules) {
  const undated = schedules.filter((s) => s.date == null)
  const dated = schedules
    .filter((s) => s.date != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  return { undated, dated }
}

export function isPastSchedule(schedule, today) {
  return schedule.date != null && schedule.date < today
}
