import axios from 'axios';
import { WorkdayConfig } from '../config/workdayConfig';

export interface WorkdayEvent {
  id: string;
  status: string;
  runBy: string;
  startedAt: Date;
  completedAt: Date | null;
  logs: string;
  errorMessage: string | null;
  workdaySystemId?: string | null;
  workdaySystemName?: string | null;
  errorsWarningsCount?: number;
  launchParameters?: { name: string; value: string }[];
}

export class WorkdayService {
  private isPlaceholder(config: WorkdayConfig): boolean {
    const checks = {
      clientIdEmpty: !config.clientId,
      clientIdPlaceholder: !!config.clientId?.includes('YOUR_'),
      clientSecretEmpty: !config.clientSecret,
      clientSecretPlaceholder: !!config.clientSecret?.includes('YOUR_'),
      refreshTokenEmpty: !config.refreshToken,
      refreshTokenPlaceholder: !!config.refreshToken?.includes('YOUR_'),
    };

    if (Object.values(checks).some((v) => v)) {
      console.warn('[WorkdayService] Placeholder validation failed checks:', checks);
      console.warn('[WorkdayService] Current database configuration values:', {
        clientId: config.clientId,
        clientSecret: config.clientSecret ? `*** (length: ${config.clientSecret.length})` : '(empty)',
        refreshToken: config.refreshToken ? `*** (length: ${config.refreshToken.length})` : '(empty)',
      });
      return true;
    }
    return false;
  }

  private getOAuthTokenUrl(config: WorkdayConfig): string {
    try {
      const url = new URL(config.apiEndpoint);
      const host = url.origin; // e.g., "https://wd2-impl-services1.workday.com"
      const match = url.pathname.match(/\/ccx\/service\/([^\/]+)/);
      const tenant = match ? match[1] : config.tenantName;
      return `${host}/ccx/oauth2/${tenant}/token`;
    } catch {
      return `${config.apiEndpoint}/oauth2/v1/token`;
    }
  }

  async getAccessToken(config: WorkdayConfig): Promise<string> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    try {
      const tokenUrl = this.getOAuthTokenUrl(config);
      console.log(`[WorkdayService] Requesting access token from: ${tokenUrl}`);
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
    } catch (error: any) {
      console.error('[WorkdayService] OAuth Token Refresh Error:', error.message);
      throw new Error(`Failed to refresh Workday Access Token: ${error.message}`);
    }
  }

  private getSoapUrl(config: WorkdayConfig, serviceName: string = 'Integrations'): string {
    if (config.apiEndpoint.includes('/ccx/service/')) {
      return config.apiEndpoint;
    }
    return `${config.apiEndpoint}/ccx/service/${config.tenantName}/${serviceName}/v43.0`;
  }

  async fetchIntegrationEvents(
    config: WorkdayConfig,
    workdaySystemId: string | undefined | null,
    since: Date
  ): Promise<WorkdayEvent[]> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    // Construct SOAP Payload (omitting system reference filter if workdaySystemId is empty to query all)
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header>
            <bsvc:Workday_Common_Header>
               <!-- OAuth Token Header -->
            </bsvc:Workday_Common_Header>
         </soapenv:Header>
         <soapenv:Body>
            <bsvc:Get_Integration_Events_Request>
               <bsvc:Request_Criteria>
                  ${
                    workdaySystemId
                      ? `
                  <bsvc:Integration_System_Reference>
                     <bsvc:ID bsvc:type="Integration_System_ID">${workdaySystemId}</bsvc:ID>
                  </bsvc:Integration_System_Reference>
                  `
                      : ''
                  }
                  <bsvc:Sent_After>${since.toISOString()}</bsvc:Sent_After>
               </bsvc:Request_Criteria>
               <bsvc:Response_Filter>
                  <bsvc:Count>20</bsvc:Count>
               </bsvc:Response_Filter>
            </bsvc:Get_Integration_Events_Request>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    try {
      const soapUrl = this.getSoapUrl(config);
      console.log(`[WorkdayService] Sending Get_Integration_Events SOAP request to: ${soapUrl}`);
      const response = await axios.post(
        soapUrl,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return this.parseSoapResponse(response.data);
    } catch (error: any) {
      if (error.response?.data) {
        console.error('[WorkdayService] SOAP Request failed with response:', error.response.data);
      } else {
        console.error('[WorkdayService] SOAP Request failed:', error.message);
      }
      throw new Error(`SOAP Get_Integration_Events request failed: ${this.extractSoapErrorMessage(error)}`);
    }
  }

  async fetchIntegrationEventById(
    config: WorkdayConfig,
    runId: string
  ): Promise<WorkdayEvent | null> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header>
            <bsvc:Workday_Common_Header/>
         </soapenv:Header>
         <soapenv:Body>
            <bsvc:Get_Integration_Events_Request>
               <bsvc:Request_References>
                  <bsvc:Integration_Event_Reference>
                     <bsvc:ID bsvc:type="Background_Process_Instance_ID">${runId}</bsvc:ID>
                  </bsvc:Integration_Event_Reference>
               </bsvc:Request_References>
            </bsvc:Get_Integration_Events_Request>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    try {
      const soapUrl = this.getSoapUrl(config);
      console.log(`[WorkdayService] Sending Get_Integration_Events for single ID SOAP request to: ${soapUrl}`);
      const response = await axios.post(
        soapUrl,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const events = this.parseSoapResponse(response.data);
      return events.length > 0 ? events[0] : null;
    } catch (error: any) {
      if (error.response?.data) {
        console.error('[WorkdayService] SOAP Request for event ID failed with response:', error.response.data);
      } else {
        console.error('[WorkdayService] SOAP Request for event ID failed:', error.message);
      }
      throw new Error(`SOAP Get_Integration_Events request failed: ${this.extractSoapErrorMessage(error)}`);
    }
  }

  async launchIntegration(
    config: WorkdayConfig, 
    workdaySystemId: string,
    launchParams?: { name: string; value: string }[]
  ): Promise<string> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    // Determine the type of launch operation based on the integration system ID name
    const isEib = workdaySystemId.toUpperCase().includes('EIB');
    const rootElement = isEib ? 'Launch_EIB_Request' : 'Launch_Integration_Event_Request';

    // Construct Launch parameters XML if present
    let launchParamsXml = '';
    if (launchParams && launchParams.length > 0) {
      launchParamsXml = `
         <bsvc:Integration_Launch_Parameters_Data>
            ${launchParams.map(param => `
            <bsvc:Integration_Launch_Parameter_Data>
               <bsvc:Integration_Launch_Parameter_Reference>
                  <bsvc:ID bsvc:type="Integration_Launch_Parameter_ID">${param.name}</bsvc:ID>
               </bsvc:Integration_Launch_Parameter_Reference>
               <bsvc:Integration_Launch_Parameter_Value_Data>
                  <bsvc:Value>${param.value}</bsvc:Value>
               </bsvc:Integration_Launch_Parameter_Value_Data>
            </bsvc:Integration_Launch_Parameter_Data>
            `).join('\n')}
         </bsvc:Integration_Launch_Parameters_Data>
      `;
    }

    // Construct Launch integration SOAP request for Workday API v47.0
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:${rootElement}>
               <bsvc:Integration_System_Reference>
                  <bsvc:ID bsvc:type="Integration_System_ID">${workdaySystemId}</bsvc:ID>
               </bsvc:Integration_System_Reference>
               ${launchParamsXml}
            </bsvc:${rootElement}>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    try {
      const soapUrl = this.getSoapUrl(config);
      console.log(`[WorkdayService] Sending ${rootElement} SOAP request to: ${soapUrl}`);
      const response = await axios.post(
        soapUrl,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Parse the resulting background process instance ID (handles both bsvc: and wd: namespaces)
      const xmlStr = response.data;
      const match = xmlStr.match(/<[^:]*:Background_Process_Instance_Reference[^>]*>[\s\S]*?<[^:]*:ID [^:]*:type="Background_Process_Instance_ID">([^<]+)<\/[^:]*:ID>/);
      if (match && match[1]) {
        return match[1];
      }

      // Fallback regex if namespace prefixes are completely omitted
      const fallbackMatch = xmlStr.match(/<Background_Process_Instance_Reference[^>]*>[\s\S]*?<ID type="Background_Process_Instance_ID">([^<]+)<\/ID>/);
      if (fallbackMatch && fallbackMatch[1]) {
        return fallbackMatch[1];
      }

      throw new Error('Could not parse Background_Process_Instance_ID from SOAP response');
    } catch (error: any) {
      if (error.response?.data) {
        console.error('[WorkdayService] Launch Integration failed with response:', error.response.data);
      } else {
        console.error('[WorkdayService] Launch Integration failed:', error.message);
      }
      throw new Error(`Launch Integration failed: ${this.extractSoapErrorMessage(error)}`);
    }
  }

  async discoverIntegrations(config: WorkdayConfig): Promise<any[]> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:Get_Integration_Systems_Request bsvc:version="v43.0"/>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    try {
      const soapUrl = this.getSoapUrl(config);
      console.log(`[WorkdayService] Sending Get_Integration_Systems SOAP request to: ${soapUrl}`);
      const response = await axios.post(
        soapUrl,
        soapEnvelope,
        {
          headers: {
            'Content-Type': 'text/xml;charset=UTF-8',
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return this.parseDiscoverySoapResponse(response.data);
    } catch (error: any) {
      console.error('[WorkdayService] SOAP Get_Integration_Systems failed:', error.message);
      throw new Error(`SOAP Get_Integration_Systems failed: ${error.message}`);
    }
  }

  private parseDiscoverySoapResponse(xml: string): any[] {
    console.log('[WorkdayService] Raw SOAP Discovery Response Length:', xml.length);
    console.log('[WorkdayService] Raw SOAP Discovery Response:', xml); // Print raw XML to console for inspection

    const integrations: any[] = [];
    // Split on <Integration_System> tag with or without namespace prefix (e.g. bsvc: or wd: or none)
    const blocks = xml.split(/<(?:[a-zA-Z0-9_]+:)?Integration_System>/);
    blocks.shift();

    for (const block of blocks) {
      // 1. Extract the Integration_System_Reference block (which contains the ID and Descriptor)
      const refMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Integration_System_Reference[\s\S]*?<\/(?:[a-zA-Z0-9_]+:)?Integration_System_Reference>/);
      if (!refMatch) continue;

      const refContent = refMatch[0];

      // 2. Match the Integration_System_Name or fallback to Descriptor attribute of the system
      const nameMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Integration_System_Name>([^<]+)<\//);
      let name = nameMatch ? nameMatch[1] : 'Unknown Integration';
      if (name === 'Unknown Integration') {
        const descriptorMatch = refContent.match(/Descriptor=["']([^"']+)["']/i);
        if (descriptorMatch) name = descriptorMatch[1];
      }

      // 3. Match the ID with type="Integration_System_ID" or fallback to WID
      const idMatch = refContent.match(/(?:[a-zA-Z0-9_]+:)?type=["']Integration_System_ID["'][^>]*?>([^<]+)<\//)
        || refContent.match(/(?:[a-zA-Z0-9_]+:)?type=["']WID["'][^>]*?>([^<]+)<\//);

      if (idMatch) {
        integrations.push({
          workdaySystemId: idMatch[1],
          name: name,
          description: `Workday integration system retrieved from tenant.`,
          category: 'Integrations',
          isActive: true,
          autoLaunch: false,
          pollingInterval: '10m',
        });
      }
    }

    console.log(`[WorkdayService] Parsed ${integrations.length} integrations from SOAP response.`);
    return integrations;
  }

  private parseSoapResponse(xml: string): WorkdayEvent[] {
    const events: WorkdayEvent[] = [];

    // Split XML by individual events
    const eventBlocks = xml.split(/<(?:[a-zA-Z0-9_]+:)?Integration_Event>/);
    eventBlocks.shift(); // Remove content before first block

    for (const block of eventBlocks) {
      // 1. Extract Background Process Instance ID
      const idMatch = block.match(/(?:[a-zA-Z0-9_]+:)?type=["']Background_Process_Instance_ID["'][^>]*?>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?Background_Process_Instance_ID>([^<]+)<\//);

      // 2. Extract Status
      const statusMatch = block.match(/(?:[a-zA-Z0-9_]+:)?type=["']Background_Process_Instance_Status_ID["'][^>]*?>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?Status>([^<]+)<\//);

      // 3. Extract Initiated DateTime
      const startedMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Initiated_DateTime>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?Initiated_Date_Time>([^<]+)<\//);

      // 4. Extract Completed DateTime
      const completedMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Completed_DateTime>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?Completed_Date_Time>([^<]+)<\//);

      // 5. Extract Initiator (Run By)
      const runByMatch = block.match(/(?:[a-zA-Z0-9_]+:)?type=["'](?:System_User_ID|WorkdayUserName)["'][^>]*?>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?Initiating_User>([^<]+)<\//);

      // 6. Extract System ID
      const systemIdMatch = block.match(/(?:[a-zA-Z0-9_]+:)?type=["']Integration_System_ID["'][^>]*?>([^<]+)<\//)
        || block.match(/(?:[a-zA-Z0-9_]+:)?type=["']WID["'][^>]*?>([^<]+)<\//);
      const systemId = systemIdMatch ? systemIdMatch[1] : null;

      // 7. Extract System Name from Process_Description
      const systemDescMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Process_Description>([^<]+)<\//);
      const systemName = systemDescMatch ? systemDescMatch[1] : (systemId || 'Unknown Integration');

      // 8. Parse execution log messages and details
      const msgBlocks = block.split(/<(?:[a-zA-Z0-9_]+:)?Background_Process_Message_Data>/);
      msgBlocks.shift();

      const parsedLogs: string[] = [];
      let capturedError: string | null = null;
      let errorCount = 0;
      let warningCount = 0;

      for (const msgBlock of msgBlocks) {
        const timestampMatch = msgBlock.match(/<(?:[a-zA-Z0-9_]+:)?Timestamp>([^<]+)<\//);
        const severityMatch = msgBlock.match(/(?:[a-zA-Z0-9_]+:)?type=["']Message_Severity_Level["'][^>]*?>([^<]+)<\//)
          || msgBlock.match(/<(?:[a-zA-Z0-9_]+:)?Severity>([^<]+)<\//);
        const summaryMatch = msgBlock.match(/<(?:[a-zA-Z0-9_]+:)?Message_Summary>([^<]+)<\//);
        const detailMatch = msgBlock.match(/<(?:[a-zA-Z0-9_]+:)?Message_Detail>([^<]+)<\//);

        if (summaryMatch) {
          const timestamp = timestampMatch ? timestampMatch[1] : '';
          const severity = severityMatch ? severityMatch[1] : 'INFO';
          const severityUpper = severity.toUpperCase();
          const summary = summaryMatch[1];
          const detail = detailMatch ? `: ${detailMatch[1]}` : '';

          parsedLogs.push(`[${timestamp}] [${severity}] ${summary}${detail}`);

          if (severityUpper === 'ERROR' || severityUpper === 'CRITICAL') {
            errorCount++;
            if (!capturedError) {
              capturedError = `${summary}${detail}`;
            }
          } else if (severityUpper === 'WARNING' || severityUpper === 'WARN') {
            warningCount++;
          }
        }
      }

      // If we don't have an error from messages but status is not Completed, get response message
      let finalError = capturedError;
      if (!finalError && statusMatch && statusMatch[1] !== 'Completed') {
        const responseMsgMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Integration_Response_Message>([^<]+)<\//);
        if (responseMsgMatch) {
          finalError = responseMsgMatch[1];
        } else {
          finalError = `Integration completed with status: ${statusMatch[1]}`;
        }
      }

      if (idMatch && statusMatch && startedMatch) {
        // 9. Extract Launch Parameters
        const paramBlocks = block.split(/<(?:[a-zA-Z0-9_]+:)?Integration_Launch_Parameter_Data>/);
        paramBlocks.shift();
        const launchParameters: { name: string; value: string }[] = [];
        for (const pBlock of paramBlocks) {
          const pIdMatch = pBlock.match(/(?:[a-zA-Z0-9_]+:)?type=["']Integration_Launch_Parameter_ID["'][^>]*?>([^<]+)<\//)
            || pBlock.match(/<(?:[a-zA-Z0-9_]+:)?ID [^>]*?>([^<]+)<\//);
          const valMatch = pBlock.match(/<(?:[a-zA-Z0-9_]+:)?Value>([^<]+)<\//);
          if (pIdMatch && valMatch) {
            launchParameters.push({
              name: pIdMatch[1],
              value: valMatch[1]
            });
          }
        }

        events.push({
          id: idMatch[1],
          status: statusMatch[1],
          runBy: runByMatch ? runByMatch[1] : 'System',
          startedAt: new Date(startedMatch[1]),
          completedAt: completedMatch ? new Date(completedMatch[1]) : null,
          logs: parsedLogs.length > 0 ? parsedLogs.join('\n') : 'No logs attached.',
          errorMessage: finalError,
          workdaySystemId: systemId,
          workdaySystemName: systemName,
          errorsWarningsCount: errorCount + warningCount,
          launchParameters: launchParameters,
        });
      }
    }

    return events;
  }

  private generateMockEvents(workdaySystemId: string): WorkdayEvent[] {
    const timestamp = new Date();
    // Deterministic mock generation based on name
    if (workdaySystemId.includes('REVENUE')) {
      return [
        {
          id: `Event_${Date.now()}_9941a`,
          status: 'Failed',
          runBy: 'wd_admin_sync',
          startedAt: new Date(timestamp.getTime() - 1000 * 60 * 10), // 10 mins ago
          completedAt: new Date(timestamp.getTime() - 1000 * 60 * 8), // 8 mins ago
          logs: '[DEBUG] Initiating SOAP Handshake...\n[INFO] Connecting to https://api.shopify.com/v1/orders...\n[DEBUG] Parsing orders payload...\n[ERROR] Request XML validation failed: element \'Account_Code\' must have length >= 4.\n[ERROR] Integration runtime aborted.',
          errorMessage: 'Request XML validation failed: element \'Account_Code\' must have length >= 4',
        },
      ];
    } else {
      return [
        {
          id: `Event_${Date.now()}_abc77`,
          status: 'Completed',
          runBy: 'system_poller',
          startedAt: new Date(timestamp.getTime() - 1000 * 60 * 30),
          completedAt: new Date(timestamp.getTime() - 1000 * 60 * 25),
          logs: '[INFO] Started processing...\n[INFO] Synced 25 employee profiles.\n[INFO] Success.',
          errorMessage: null,
        },
      ];
    }
  }

  async getRawIntegrationSystems(config: WorkdayConfig): Promise<string> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:Get_Integration_Systems_Request bsvc:version="v43.0"/>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    const soapUrl = this.getSoapUrl(config);
    const response = await axios.post(
      soapUrl,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  }

  async getRawIntegrationEvents(config: WorkdayConfig, since: Date, workdaySystemId?: string | null): Promise<string> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:Get_Integration_Events_Request>
               <bsvc:Request_Criteria>
                  ${
                    workdaySystemId
                      ? `
                  <bsvc:Integration_System_Reference>
                     <bsvc:ID bsvc:type="Integration_System_ID">${workdaySystemId}</bsvc:ID>
                  </bsvc:Integration_System_Reference>
                  `
                      : ''
                  }
                  <bsvc:Sent_After>${since.toISOString()}</bsvc:Sent_After>
               </bsvc:Request_Criteria>
               <bsvc:Response_Filter>
                  <bsvc:Count>20</bsvc:Count>
               </bsvc:Response_Filter>
            </bsvc:Get_Integration_Events_Request>
         </soapenv:Body>
      </soapenv:Envelope>
    `;

    const soapUrl = this.getSoapUrl(config);
    const response = await axios.post(
      soapUrl,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return response.data;
  }

  private extractSoapErrorMessage(error: any): string {
    if (error.response?.data) {
      const xmlStr = error.response.data;
      const faultMatch = xmlStr.match(/<faultstring>([^<]+)<\/faultstring>/);
      if (faultMatch && faultMatch[1]) {
        return faultMatch[1];
      }
      const msgMatch = xmlStr.match(/<[^:]*:Message>([^<]+)<\/[^:]*:Message>/);
      if (msgMatch && msgMatch[1]) {
        return msgMatch[1];
      }
    }
    return error.message;
  }

  private getRaaSUrl(config: WorkdayConfig, reportOwner: string, reportName: string): string {
    let host = 'https://wd2-impl-services1.workday.com';
    let tenant = config.tenantName;
    try {
      const url = new URL(config.apiEndpoint);
      host = url.origin;
      const match = url.pathname.match(/\/ccx\/service\/([^\/]+)/);
      if (match) {
        tenant = match[1];
      }
    } catch {
      // Fallback
    }
    return `${host}/ccx/service/customreport2/${tenant}/${reportOwner}/${reportName}`;
  }

  private formatPDTDate(date: Date): string {
    // PDT is UTC-7
    const offsetMs = -7 * 60 * 60 * 1000;
    const pdtTime = new Date(date.getTime() + offsetMs);
    
    const pad = (n: number, width = 2) => String(n).padStart(width, '0');
    
    const yyyy = pdtTime.getUTCFullYear();
    const mm = pad(pdtTime.getUTCMonth() + 1);
    const dd = pad(pdtTime.getUTCDate());
    const hh = pad(pdtTime.getUTCHours());
    const min = pad(pdtTime.getUTCMinutes());
    const ss = pad(pdtTime.getUTCSeconds());
    const ms = pad(pdtTime.getUTCMilliseconds(), 3);
    
    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}.${ms}-07:00`;
  }

  async fetchIntegrationRunsFromRaaS(
    config: WorkdayConfig,
    since: Date
  ): Promise<any[]> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);
    const pdtSince = this.formatPDTDate(since);
    
    // Construct the custom report URL
    const reportOwner = 'int_manvir.b.singh';
    const reportName = 'RAAS_WorkdayProcessMonitor_Report_-_Copy';
    const raasUrl = this.getRaaSUrl(config, reportOwner, reportName);
    
    const requestUrl = `${raasUrl}?Actual_Completed_Date_and_Time=${encodeURIComponent(pdtSince)}&format=json`;
    console.log(`[WorkdayService] Fetching RaaS Report from: ${requestUrl}`);
    
    try {
      const response = await axios.get(requestUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      
      const data = response.data;
      if (data && data.Report_Entry) {
        console.log(`[WorkdayService] RaaS Report returned ${data.Report_Entry.length} entries.`);
        return data.Report_Entry;
      }
      return [];
    } catch (error: any) {
      console.error('[WorkdayService] RaaS Request failed:', error.message);
      if (error.response?.data) {
        console.error('[WorkdayService] RaaS error response:', error.response.data);
      }
      throw new Error(`Failed to fetch RaaS Process Monitor report: ${error.message}`);
    }
  }
}
