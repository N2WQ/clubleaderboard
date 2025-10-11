import { getUncachableGmailClient } from './gmail-client';

export interface EmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  try {
    const gmail = await getUncachableGmailClient();
    
    const message = [
      `To: ${options.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${options.subject}`,
      '',
      options.htmlContent
    ].join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log(`Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

export function createSubmissionConfirmationEmail(
  operatorCallsign: string,
  stationCallsign: string,
  contestKey: string,
  seasonYear: number,
  claimedScore: number,
  status: string,
  rejectReason?: string
): string {
  const isAccepted = status === 'accepted';
  const displayCallsign = operatorCallsign === stationCallsign 
    ? operatorCallsign 
    : `${operatorCallsign} (${stationCallsign})`;

  if (isAccepted) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8fafc; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          .success { color: #16a34a; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YCCC Awards Program</h1>
          </div>
          <div class="content">
            <h2 class="success">Log Submission Accepted</h2>
            <p>Dear ${operatorCallsign},</p>
            <p>Your contest log submission has been successfully accepted and scored!</p>
            <div class="details">
              <strong>Submission Details:</strong><br/>
              Operator: ${displayCallsign}<br/>
              Contest: ${contestKey}<br/>
              Year: ${seasonYear}<br/>
              Claimed Score: ${claimedScore.toLocaleString()} points<br/>
              Status: <span class="success">Accepted</span>
            </div>
            <p>Your YCCC Points have been calculated and added to the leaderboard. View your results at the YCCC Awards Program dashboard.</p>
          </div>
          <div class="footer">
            <p>73 de YCCC Awards Program<br/>
            This is an automated message from the Yankee Clipper Contest Club Awards System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  } else {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f8fafc; }
          .details { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .footer { text-align: center; padding: 20px; color: #64748b; font-size: 14px; }
          .warning { color: #dc2626; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>YCCC Awards Program</h1>
          </div>
          <div class="content">
            <h2 class="warning">Log Submission Issue</h2>
            <p>Dear ${operatorCallsign},</p>
            <p>Your contest log submission was received but could not be accepted for scoring.</p>
            <div class="details">
              <strong>Submission Details:</strong><br/>
              Operator: ${displayCallsign}<br/>
              Contest: ${contestKey}<br/>
              Year: ${seasonYear}<br/>
              Claimed Score: ${claimedScore.toLocaleString()} points<br/>
              Status: <span class="warning">Rejected</span><br/>
              ${rejectReason ? `<br/><strong>Reason:</strong> ${rejectReason}` : ''}
            </div>
            <p>Please review the rejection reason above. If you believe this is an error, please contact the YCCC Awards Program administrator.</p>
          </div>
          <div class="footer">
            <p>73 de YCCC Awards Program<br/>
            This is an automated message from the Yankee Clipper Contest Club Awards System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
