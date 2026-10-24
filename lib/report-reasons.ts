export const REPORT_REASONS = [
  {value: 'harassment', label: 'Harassment or abuse'},
  {value: 'threats', label: 'Threats or safety concern'},
  {value: 'impersonation', label: 'Impersonation or fake account'},
  {value: 'spam', label: 'Spam'},
  {value: 'other', label: 'Other'},
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export const REPORT_REASON_VALUES = REPORT_REASONS.map((item) => item.value) as [ReportReason, ...ReportReason[]];
