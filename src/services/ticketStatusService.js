const statusTransitions = {
  open: [
    "in_progress",
  ],

  in_progress: [
    "waiting_user",
    "resolved",
  ],

  waiting_user: [
    "in_progress",
    "resolved",
  ],

  resolved: [
    "in_progress",
    "closed",
  ],

  closed: [],
};

function canTransitionStatus(currentStatus, newStatus) {
  const allowedTransitions = statusTransitions[currentStatus];

  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.includes(newStatus);
}

module.exports = {
  canTransitionStatus,
};