# Late Bus Notifier
A Cloudflare worker to notify in the event of a late bus in the Hopkins, MN school district.

## Reference (for future me)

* [SendGrid settings](https://app.sendgrid.com/account/details)
* [Cloudflare Worker Settings](https://dash.cloudflare.com/c3b373ae8a90a6494e520f962bdf462b/workers/services/view/bus-delay-notifier/production/settings)

## Environment Variables (defined in [Cloudflare Worker Settings](https://dash.cloudflare.com/c3b373ae8a90a6494e520f962bdf462b/workers/services/view/bus-delay-notifier/production/settings))

* `TO_EMAIL_ADDRESSES`: A comma separated list of email addresses to send to
* `FROM_EMAIL_ADDRESS`: An email address to send from
* `SENDGRID_API_KEY`: A SendGrid API key
* `BUS_NUMBER`: The number of the bus to check for delays


## Prompt

```
Can you create a script for running a Cloudflare worker and supporting files (package.json, wrangler.toml, etc) that:

* Checks to see if the Cloudflare KV store has a value for LAST_EMAIL_SENT_DATE.  If it does, and that value equals today's date, exit 0
* If not, loads the specified Google Sheets document.  It is a table that contains several columns, timestamp, bus number, school, school (if other) and minutes late.
* Filter the rows down to rows whose timestamp matches today's day and bus number matches BUS_NUMBER

In the event that the filtered rows contains a row and we have not yet sent an email, send a single email using Sendgrird to the email addresses specified in EMAIL_ADDRESSES (they are comma-separated) notifying the recipients that the bus is running late & provide:
* The bus number
* minutes late

After successfully sending the email, persist today's date in LAST_EMAIL_SENT_DATE in Cloudflare's KV store and exit 0

The npm library @sendgrid/mail makes use of `fs` and `path` which Cloudflare workers do not support.  Is there another way we can interact w/ the API?
```
