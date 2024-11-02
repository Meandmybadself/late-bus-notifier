import { parse } from 'date-fns';

const GOOGLE_SHEETS_DOC_URL = 'https://docs.google.com/spreadsheets/u/0/d/1fjfYhwB9YThz2_O0ZTQzKqZDJdwXMjD8m3MjyfuFHNw/pub?single=true&gid=0&range=a1:e100&output=csv';

export default {
  fetch: async function(request, env) {
    const url = new URL(request.url);
    // const authToken = url.searchParams.get('auth_token') || request.headers.get('X-Auth-Token');

    // if (authToken !== env.AUTH_TOKEN) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    await processData(env);
    return new Response('Processing triggered successfully', { status: 200 });
  },

  async scheduled(event, env) {
    await processData(env);
  }
};

async function processData(env) {
  console.log('Processing data');
  const BUS_NUMBER = env.BUS_NUMBER;
  const TO_EMAIL_ADDRESSES = env.TO_EMAIL_ADDRESSES.split(',');
  const FROM_EMAIL_ADDRESS = env.FROM_EMAIL_ADDRESS;
  const SENDGRID_API_KEY = env.SENDGRID_API_KEY;

  // Ensure all variables are set
  if (!BUS_NUMBER || !TO_EMAIL_ADDRESSES || !FROM_EMAIL_ADDRESS || !SENDGRID_API_KEY) {
    throw new Error('Missing environment variables');
  }

  const today = new Date().toISOString().split('T')[0];
  let lastEmailSentDate;

  // Check if KV namespace is available
  if (env.KV) {
    try {
      lastEmailSentDate = await env.KV.get('LAST_EMAIL_SENT_DATE');
    } catch (error) {
      console.error('Error accessing KV:', error);
    }
  } else {
    console.warn('KV namespace not available. Proceeding without checking last email sent date.');
  }

  if (lastEmailSentDate === today) {
    console.log('Email already sent today');
    return;
  }

  console.log('Fetching bus data');
  const busData = await fetchBusData();
  console.log('Filtering bus data');
  const relevantData = filterBusData(busData, today, BUS_NUMBER);
  console.log('Checking if relevant data exists');
  console.log(relevantData.length);

  if (relevantData.length > 0) {
    console.log('Email not sent today, sending email');
    await sendEmail(relevantData[0], env, BUS_NUMBER, TO_EMAIL_ADDRESSES, FROM_EMAIL_ADDRESS, SENDGRID_API_KEY);
    
    // Only attempt to update KV if it's available
    if (env.KV) {
      try {
        await env.KV.put('LAST_EMAIL_SENT_DATE', today);
      } catch (error) {
        console.error('Error updating KV:', error);
      }
    }
  }
}

async function fetchBusData() {
  const response = await fetch(GOOGLE_SHEETS_DOC_URL);
  const csvText = await response.text();
  return csvText.split('\n').map(row => row.split(','));
}

function filterBusData(data, today, BUS_NUMBER) {
  const [_, ...rows] = data;
  return rows.filter(row => {
    const [timestamp, busNumber] = row;
    const rowDate = parse(timestamp, 'M/d/yyyy H:mm:ss', new Date()).toISOString().split('T')[0];
    return rowDate === today && busNumber === BUS_NUMBER;
  });
} 

async function sendEmail(busInfo, env, BUS_NUMBER, TO_EMAIL_ADDRESSES, FROM_EMAIL_ADDRESS, SENDGRID_API_KEY) {
  const [_, __, ___, ____, minutesLate] = busInfo;

  const msg = {
    personalizations: [{ to: TO_EMAIL_ADDRESSES.map(email => ({ email })) }],
    from: { email: FROM_EMAIL_ADDRESS },
    subject: `Bus ${BUS_NUMBER} is running late`,
    content: [
      {
        type: 'text/plain',
        value: `Bus ${BUS_NUMBER} is running ${minutesLate} minutes late today.`
      },
      {
        type: 'text/html',
        value: `<p>Bus ${BUS_NUMBER} is running <strong>${minutesLate} minutes late</strong> today.</p>`
      }
    ]
  };

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(msg)
    });

    if (!response.ok) {
      throw new Error(`SendGrid API responded with status ${response.status}`);
    }

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
