/**
 * Battery servicing reminder emails.
 * Edit the text here; keep the line breaks as they should appear in the email.
 */
export const REMINDER = {
  /** Months between reminders, counted from the purchase date. */
  everyMonths: 6,
  /** Product categories that get reminders (two-wheeler batteries do not). */
  categories: ['FOUR_WHEELER', 'THREE_WHEELER', 'COMMERCIAL', 'TRACTOR', 'INVERTER'] as string[],
  /** Keep reminding only while the warranty is active. */
  onlyWhileUnderWarranty: true,
  /** Emails are only sent between these hours, India time (24h clock). */
  sendFromHour: 9,
  sendUntilHour: 20,

  subject: 'Half-yearly battery servicing reminder',
  body: `Hello,
This is half-yearly reminder that your battery needs a half yearly servicing. For further information, please contact Prashant and Prashant Associates.
Regards,
Prashant and Prashant Associates
+91 0000000000`,
};
