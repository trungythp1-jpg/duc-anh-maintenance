function calculateTheoreticalVisits(
  startDate,
  endDate,
  intervalMonths = 1
) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const interval = Number(intervalMonths);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end < start ||
    !Number.isInteger(interval) ||
    interval < 1
  ) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start);

  /*
   * Safety limit:
   * Không cho phép một agreement tạo ra
   * số lượt lý thuyết vô hạn.
   */
  while (
    cursor <= end &&
    count < 240
  ) {
    count++;

    cursor.setMonth(
      cursor.getMonth() + interval
    );
  }

  return count;
}

function remainingVisits(
  totalVisits,
  completedVisits
) {
  const total = Math.max(
    0,
    Number(totalVisits || 0)
  );

  const completed = Math.max(
    0,
    Number(completedVisits || 0)
  );

  return Math.max(
    0,
    total - completed
  );
}

module.exports = {
  calculateTheoreticalVisits,
  remainingVisits
};