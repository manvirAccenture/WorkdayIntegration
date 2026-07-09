const axios = require('axios');
const fs = require('fs');

const config = {
  tenantName: "Dpt3",
  apiEndpoint: "https://wd2-impl-services1.workday.com/ccx/service/accenture_dpt3/Integrations/v47.0",
  clientId: "NWFjOWYzMTctOTIwZC00YjBmLWE0Y2ItMTcyNGY3YWE3N2Fk",
  clientSecret: "dtauicvpphesvwbpe3f8d8dfzi64mv65c4djyg63c128kfu9ce36r334iqynim9m37l9qea9upxcwy3cedk9sjz6m45jttnq3of",
  refreshToken: "chsny1kr1rhcnbrv49r8l2h8oqjxqwo7xqaugo7t0yrjwsni47l4u9wgi1qd148zeb96lcuk0on8pujhzknuc2ikrldfd0r6k23"
};

function getOAuthTokenUrl(config) {
  try {
    const url = new URL(config.apiEndpoint);
    const host = url.origin;
    const match = url.pathname.match(/\/ccx\/service\/([^\/]+)/);
    const tenant = match ? match[1] : config.tenantName;
    return `${host}/ccx/oauth2/${tenant}/token`;
  } catch {
    return `${config.apiEndpoint}/oauth2/v1/token`;
  }
}

async function getAccessToken(config) {
  const tokenUrl = getOAuthTokenUrl(config);
  const response = await axios.post(
    tokenUrl,
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
    }).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );
  return response.data.access_token;
}

function getSoapUrl(config) {
  if (config.apiEndpoint.includes('/ccx/service/')) {
    return config.apiEndpoint;
  }
  return `${config.apiEndpoint}/ccx/service/${config.tenantName}/Integrations/v43.0`;
}

async function main() {
  try {
    const token = await getAccessToken(config);
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:Get_Integration_Systems_Request bsvc:version="v43.0">
               <bsvc:Request_References>
                  <bsvc:Integration_System_Reference>
                     <bsvc:ID bsvc:type="Integration_System_ID">CloudCommuteforWorker</bsvc:ID>
                  </bsvc:Integration_System_Reference>
               </bsvc:Request_References>
            </bsvc:Get_Integration_Systems_Request>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    const soapUrl = getSoapUrl(config);
    const response = await axios.post(soapUrl, soapEnvelope, {
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        Authorization: `Bearer ${token}`,
      },
    });

    const xml = response.data;
    // Let's find matches of Custom_Launch_Parameter_Data
    const blocks = xml.split(/<(?:[a-zA-Z0-9_]+:)?Custom_Launch_Parameter_Data/);
    blocks.shift();
    
    console.log("Blocks found:", blocks.length);
    for (let i = 0; i < blocks.length; i++) {
      console.log(`Block ${i} opening tag and start:`);
      console.log(blocks[i].substring(0, 500));
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
}

main();
