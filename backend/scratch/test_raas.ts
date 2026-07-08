import axios from 'axios';
import { env } from '../src/config/env';

// Simulate RaaS token generation and call
async function testRaaS() {
  console.log('--- TEST RAAS START ---');
  
  // 1. Get Access Token
  const tokenUrl = `https://wd2-impl-services1.workday.com/ccx/oauth2/accenture_dpt3/token`;
  console.log(`Requesting access token from: ${tokenUrl}`);
  
  const tokenResponse = await axios.post(
    tokenUrl,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: env.WORKDAY_CLIENT_ID,
      client_secret: env.WORKDAY_CLIENT_SECRET,
      refresh_token: env.WORKDAY_REFRESH_TOKEN,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  
  const accessToken = tokenResponse.data.access_token;
  console.log('Access token retrieved successfully.');

  // 2. Fetch Custom Report
  // Calculating PDT date for "1 day ago"
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const offsetMs = -7 * 60 * 60 * 1000;
  const pdtTime = new Date(since.getTime() + offsetMs);
  
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  
  const yyyy = pdtTime.getUTCFullYear();
  const mm = pad(pdtTime.getUTCMonth() + 1);
  const dd = pad(pdtTime.getUTCDate());
  const hh = pad(pdtTime.getUTCHours());
  const min = pad(pdtTime.getUTCMinutes());
  const ss = pad(pdtTime.getUTCSeconds());
  const ms = pad(pdtTime.getUTCMilliseconds(), 3);
  
  const pdtSince = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}-07:00`;
  
  // Using accenture_dpt3 as the tenant
  const requestUrl = `https://wd2-impl-services1.workday.com/ccx/service/customreport2/accenture_dpt3/int_manvir.b.singh/RAAS_WorkdayProcessMonitor_Report_-_Copy?Actual_Completed_Date_and_Time=${encodeURIComponent(pdtSince)}&format=json`;
  console.log(`Sending request to RaaS URL: ${requestUrl}`);
  
  try {
    const response = await axios.get(requestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    console.log('RaaS Request Succeeded! Status Code:', response.status);
    console.log('Entries Count:', response.data.Report_Entry?.length);
    console.log('Sample entry:', response.data.Report_Entry?.[0]);
  } catch (err: any) {
    console.error('RaaS Request Failed! Message:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

testRaaS();
