import { env } from '../config/env.js';

/**
 * Sends the login OTP. Returns true when a real SMS was dispatched,
 * false when running with the development console provider.
 */
export async function sendOtpSms(mobile: string, code: string): Promise<boolean> {
  if (env.SMS_PROVIDER === 'msg91') {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) throw new Error('MSG91 is not configured');
    const res = await fetch('https://control.msg91.com/api/v5/flow', {
      method: 'POST',
      headers: { authkey: env.MSG91_AUTH_KEY, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        template_id: env.MSG91_TEMPLATE_ID,
        short_url: '0',
        recipients: [{ mobiles: `91${mobile}`, [env.MSG91_OTP_VAR]: code }],
      }),
    });
    if (!res.ok) throw new Error(`MSG91 responded ${res.status}: ${await res.text()}`);
    return true;
  }

  if (env.SMS_PROVIDER === 'twilio') {
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) throw new Error('Twilio is not configured');
    const body = new URLSearchParams({
      To: `+91${mobile}`,
      From: env.TWILIO_FROM,
      Body: `${code} is your Prashant and Prashant Associates login code. It expires in 5 minutes.`,
    });
    const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) throw new Error(`Twilio responded ${res.status}: ${await res.text()}`);
    return true;
  }

  console.log(`\n[otp] ${code} for +91 ${mobile}  (SMS_PROVIDER=console — no SMS sent)\n`);
  return false;
}
