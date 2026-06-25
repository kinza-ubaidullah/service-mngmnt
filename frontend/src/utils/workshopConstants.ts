export const WORKSHOP_STATUS_LABELS: Record<string, string> = {
  WaitingForApproval: 'Pending Gate-In Approval',
  Received: 'Received in Workshop',
  WorkStarted: 'Repair in Progress',
  WaitingForParts: 'Waiting for Parts',
  Ready: 'Ready to Deliver',
  Delivered: 'Delivered to Customer',
  Cancelled: 'Cancelled',
};

export const TECHNICIAN_WORKSHOP_FILTERS = [
  { id: 'all', label: 'All My Jobs' },
  { id: 'Received', label: 'Received' },
  { id: 'WorkStarted', label: 'Work Started' },
  { id: 'WaitingForParts', label: 'Delayed' },
  { id: 'Ready', label: 'Ready' },
  { id: 'delivery', label: 'Ready for Delivery', scope: 'delivery' as const },
  { id: 'Delivered', label: 'Completed' },
] as const;

export const WORKSHOP_STATUS_FILTERS = [
  { id: 'all', label: 'All Jobs' },
  { id: 'WaitingForApproval', label: 'Pending Approval' },
  { id: 'Received', label: 'Received' },
  { id: 'WorkStarted', label: 'In Repair' },
  { id: 'WaitingForParts', label: 'Waiting Parts' },
  { id: 'Ready', label: 'Ready to Deliver' },
  { id: 'Delivered', label: 'Delivered' },
] as const;

export const WORKSHOP_NEXT_STATUSES: Record<string, { value: string; label: string; color: string }[]> = {
  Received: [
    { value: 'WorkStarted', label: 'Start Repair', color: 'blue' },
    { value: 'WaitingForParts', label: 'Waiting for Parts', color: 'rose' },
  ],
  WorkStarted: [
    { value: 'WaitingForParts', label: 'Hold — Waiting for Parts', color: 'rose' },
    { value: 'Ready', label: 'Mark Ready to Deliver', color: 'emerald' },
  ],
  WaitingForParts: [
    { value: 'WorkStarted', label: 'Resume Repair', color: 'blue' },
    { value: 'Ready', label: 'Mark Ready to Deliver', color: 'emerald' },
  ],
  Ready: [
    { value: 'Delivered', label: 'Mark Delivered', color: 'purple' },
  ],
};

export const getWorkshopStatusLabel = (status: string) =>
  WORKSHOP_STATUS_LABELS[status] || status;
