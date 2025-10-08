# Email Notification System

This directory contains email templates and rendering utilities for the Campus Collaboration platform's notification system.

## Overview

The email notification system provides HTML email templates for moderator alerts and summaries. Templates use inline CSS for maximum email client compatibility.

## Architecture

```
src/lib/server/notifications/
├── email.js              # Email rendering and sending utilities
└── templates/            # HTML email templates
    ├── message-flagged.html           # Alert when message is flagged
    ├── moderation-escalated.html      # SLA breach escalation alert
    └── moderation-daily-summary.html  # Daily stats summary
```

## Email Templates

### 1. Message Flagged (`message-flagged.html`)

**Trigger**: When a user flags a message for moderation  
**Priority**: HIGH  
**Sent to**: All moderators (users with `is_admin = true`)

**Variables**:
- `caseId`: Moderation case identifier
- `threadTitle`: Name/title of the conversation thread
- `reporterName`: Name of user who flagged the message
- `reason`: Reason provided for flagging
- `flagCount`: Current flag count (threshold is 3)
- `timestamp`: When the flag was created
- `moderationUrl`: Direct link to review the flagged content
- `dashboardUrl`: Link to moderation dashboard
- `guidelinesUrl`: Link to community guidelines
- `settingsUrl`: Link to notification settings

**Features**:
- Red header with warning icon for high priority
- Case information box with key details
- Highlighted reason section
- Prominent CTA button to review immediately
- SLA reminder (15-minute response time)

### 2. Moderation Escalated (`moderation-escalated.html`)

**Trigger**: When a moderation case exceeds 15-minute SLA  
**Priority**: CRITICAL  
**Sent to**: All moderators

**Variables**:
- `caseId`: Moderation case identifier
- `sourceType`: Type of content (message, post, comment)
- `ageMinutes`: How long the case has been open
- `overdueMinutes`: How many minutes past the SLA deadline
- `originalTimestamp`: When the case was originally created
- `caseUrl`: Direct link to the case
- `dashboardUrl`: Link to moderation dashboard
- `slaReportUrl`: Link to SLA compliance report

**Features**:
- Dark red/orange header for critical urgency
- Large timer display showing case age
- SLA breach warning box
- Impact assessment bullet points
- Compliance reminder about incident reporting

### 3. Moderation Daily Summary (`moderation-daily-summary.html`)

**Trigger**: Cron job at 9:00 AM daily  
**Priority**: INFO  
**Sent to**: All moderators

**Variables**:
- `date`: Summary date
- `newCases`: Number of new cases opened
- `resolvedCases`: Number of cases resolved
- `openCases`: Number of cases still open
- `escalatedCases`: Number of escalated cases
- `messageFlags`: Count of flagged messages
- `postReports`: Count of reported posts
- `commentFlags`: Count of flagged comments
- `avgResolutionTime`: Average time to resolve cases
- `slaCompliance`: SLA compliance percentage
- `avgResponseTime`: Average first response time
- `trend`: Comparison to previous day
- Status classes dynamically applied based on metrics

**Features**:
- Blue header for informational summary
- 2x2 grid of key metrics
- Performance metrics with color-coded status
- Content breakdown section
- Trend analysis
- Warning box if open cases need attention

## Usage

### Rendering Templates

```javascript
import {
	renderMessageFlaggedEmail,
	renderModerationEscalatedEmail,
	renderModerationDailySummaryEmail,
	sendEmail
} from '$lib/server/notifications/email.js';

// Message flagged email
const flaggedHtml = renderMessageFlaggedEmail({
	caseId: 'case123',
	threadId: 'thread456',
	threadTitle: 'General Discussion',
	reporterName: 'John Doe',
	reason: 'This message contains inappropriate content...',
	flagCount: 2,
	baseUrl: 'https://campus.example.com'
});

// Send the email
await sendEmail({
	to: 'moderator@example.com',
	subject: '⚠️ Message Flagged - Moderation Required',
	html: flaggedHtml
});

// Escalation email
const escalatedHtml = renderModerationEscalatedEmail({
	caseId: 'case123',
	sourceType: 'message',
	ageMinutes: 22,
	originalTimestamp: '2025-10-08T10:00:00Z',
	baseUrl: 'https://campus.example.com'
});

await sendEmail({
	to: 'moderator@example.com',
	subject: '🚨 ESCALATED: SLA Breach Alert',
	html: escalatedHtml
});

// Daily summary email
const summaryHtml = renderModerationDailySummaryEmail({
	newCases: 15,
	resolvedCases: 12,
	openCases: 3,
	escalatedCases: 1,
	messageFlags: 8,
	postReports: 5,
	commentFlags: 2,
	avgResolutionTime: '12 minutes',
	slaCompliance: 96,
	avgResponseTime: '5 minutes',
	trend: '+3 cases',
	baseUrl: 'https://campus.example.com'
});

await sendEmail({
	to: 'moderator@example.com',
	subject: '📊 Daily Moderation Summary - ' + new Date().toLocaleDateString(),
	html: summaryHtml
});
```

### Integration with PocketBase Hooks

```javascript
// In pb_hooks/messaging.js
import { renderMessageFlaggedEmail, sendEmail } from '$lib/server/notifications/email.js';

onRecordAfterCreateSuccess((e) => {
	// ... existing flag handling logic ...

	// Send email notifications to moderators
	const moderators = getModerators();
	const emailHtml = renderMessageFlaggedEmail({
		caseId: moderationCase.id,
		threadId: message.thread,
		threadTitle: thread.name || 'Direct Message',
		reporterName: reporter.name,
		reason: e.record.get('reason'),
		flagCount: message.flagCount,
		baseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5173'
	});

	for (const moderator of moderators) {
		if (moderator.email) {
			sendEmail({
				to: moderator.email,
				subject: '⚠️ Message Flagged - Moderation Required',
				html: emailHtml
			});
		}
	}
}, 'message_flags');
```

## Email Service Configuration

The `sendEmail` function in `email.js` is currently a stub. To enable actual email sending, configure one of these services:

### Option 1: SendGrid

```bash
npm install @sendgrid/mail
```

```javascript
// In email.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail({ to, subject, html, text }) {
	await sgMail.send({
		to,
		from: process.env.FROM_EMAIL,
		subject,
		text: text || stripHtml(html),
		html
	});
}
```

### Option 2: AWS SES

```bash
npm install @aws-sdk/client-ses
```

```javascript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: process.env.AWS_REGION });

export async function sendEmail({ to, subject, html, text }) {
	const command = new SendEmailCommand({
		Source: process.env.FROM_EMAIL,
		Destination: { ToAddresses: [to] },
		Message: {
			Subject: { Data: subject },
			Body: {
				Html: { Data: html },
				Text: { Data: text || stripHtml(html) }
			}
		}
	});

	await sesClient.send(command);
}
```

### Option 3: PocketBase Built-in Email

If PocketBase is configured with SMTP settings:

```javascript
// Use PocketBase's internal email API
// Note: This requires server-side PocketBase SDK access
// which may not be directly available from SvelteKit
```

## Environment Variables

Add these to your `.env` file:

```bash
# Email service provider
EMAIL_SERVICE=sendgrid  # or 'ses', 'mailgun', 'postmark', 'pocketbase'

# SendGrid
SENDGRID_API_KEY=SG.xxxxx

# AWS SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx

# Common settings
FROM_EMAIL=notifications@campus.example.com
FROM_NAME=Campus Collaboration
PUBLIC_BASE_URL=https://campus.example.com
```

## Template Customization

### Styling

All templates use inline CSS for maximum compatibility with email clients. Key styling conventions:

- **Colors**:
  - Primary: `#1e40af` (blue)
  - Danger: `#dc2626` (red)
  - Warning: `#ea580c` (orange)
  - Success: `#059669` (green)
- **Typography**: System font stack for broad support
- **Layout**: Max-width 600px for mobile compatibility
- **Responsive**: Media queries for mobile devices

### Adding Variables

To add new template variables:

1. Add `{{variableName}}` in the HTML template
2. Pass the variable in the render function call
3. Update the JSDoc comments in `email.js`

### Conditional Content

Use `{{#if variable}}...{{/if}}` blocks for conditional rendering:

```html
{{#if openCases}}
<p>You have {{openCases}} open cases.</p>
{{/if}}
```

## Testing

### Test Template Rendering

```javascript
import { renderMessageFlaggedEmail } from '$lib/server/notifications/email.js';
import { writeFileSync } from 'fs';

const html = renderMessageFlaggedEmail({
	caseId: 'TEST-123',
	threadId: 'test-thread',
	threadTitle: 'Test Thread',
	reporterName: 'Test Reporter',
	reason: 'This is a test reason for flagging.',
	flagCount: 2,
	baseUrl: 'http://localhost:5173'
});

// Save to file for preview
writeFileSync('test-email.html', html);
console.log('Test email saved to test-email.html');
```

### Preview in Browser

1. Run the test script above
2. Open `test-email.html` in a browser
3. Test on different screen sizes
4. Verify all variables are replaced

### Email Client Testing

For production, test on:
- Gmail (web, iOS, Android)
- Outlook (web, desktop)
- Apple Mail (macOS, iOS)
- Thunderbird
- Yahoo Mail

Use services like Litmus or Email on Acid for comprehensive testing.

## Performance Considerations

- **Template caching**: Consider caching rendered templates if sending to multiple recipients
- **Batch sending**: Use email service batch APIs when sending to multiple moderators
- **Rate limiting**: Respect email service rate limits
- **Queue processing**: For high volume, consider a job queue (Bull, BullMQ)

## Accessibility

Email templates follow these accessibility practices:

- Semantic HTML structure
- Sufficient color contrast (WCAG AA)
- Alt text for images (when images are added)
- Proper heading hierarchy
- Clear link text (no "click here")
- Plain text fallback option

## Monitoring

Track these email metrics:

- Delivery rate
- Open rate
- Click-through rate (on CTA buttons)
- Bounce rate
- Spam complaints

Use your email service's analytics or integrate with:
- Google Analytics (UTM parameters in links)
- Custom analytics events
- Email service webhooks

## Future Enhancements

1. **MJML Integration**: Convert templates to MJML for easier maintenance
2. **Localization**: Multi-language support
3. **Personalization**: Dynamic content based on moderator preferences
4. **Digest Options**: Allow moderators to configure email frequency
5. **Rich Content**: Add charts/graphs to daily summary
6. **Mobile App Deep Links**: Link directly to app if installed
7. **Dark Mode**: Prefers-color-scheme support
8. **Email Preferences**: Per-user notification settings

## Troubleshooting

### Templates not rendering

- Check file paths in `email.js`
- Verify template syntax (no syntax errors in HTML)
- Check console for error messages

### Variables not replacing

- Ensure variable names match exactly (case-sensitive)
- Check for typos in template: `{{variableName}}`
- Verify all required variables are passed

### Emails not sending

- Check email service credentials
- Verify FROM_EMAIL is authorized
- Check rate limits and quotas
- Review email service logs
- Test with a simple email first

## Support

For issues or questions:
- Check email service documentation
- Review PocketBase email configuration
- See `docs/realtime-notifications.md` for notification system overview
