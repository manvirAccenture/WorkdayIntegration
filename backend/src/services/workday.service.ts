import axios from 'axios';
import { WorkdayConfig } from '@prisma/client';

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

  async launchIntegration(config: WorkdayConfig, workdaySystemId: string): Promise<string> {
    if (this.isPlaceholder(config)) {
      throw new Error('Workday credentials are not fully configured. Please replace placeholders in your .env file.');
    }

    const accessToken = await this.getAccessToken(config);

    // Determine the type of launch operation based on the integration system ID name
    const isEib = workdaySystemId.toUpperCase().includes('EIB');
    const rootElement = isEib ? 'Launch_EIB_Request' : 'Launch_Integration_Event_Request';

    // Construct Launch integration SOAP request for Workday API v47.0
    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:bsvc="urn:com.workday/bsvc">
         <soapenv:Header/>
         <soapenv:Body>
            <bsvc:${rootElement}>
               <bsvc:Integration_System_Reference>
                  <bsvc:ID bsvc:type="Integration_System_ID">${workdaySystemId}</bsvc:ID>
               </bsvc:Integration_System_Reference>
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

      // 2. Match the Descriptor attribute of the system (the readable name) - case insensitive
      const descriptorMatch = refContent.match(/Descriptor=["']([^"']+)["']/i);
      const name = descriptorMatch ? descriptorMatch[1] : 'Unknown Integration';

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

    // Split XML by events (Background_Process_Instance or similar)
    const eventBlocks = xml.split(/<(?:[a-zA-Z0-9_]+:)?Integration_Event_Data>/);
    eventBlocks.shift(); // Remove content before first block

    for (const block of eventBlocks) {
      const idMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Background_Process_Instance_ID>([^<]+)<\//);
      const statusMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Status>([^<]+)<\//);
      const runByMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Initiating_User>([^<]+)<\//);
      const startedMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Initiated_Date_Time>([^<]+)<\//);
      const completedMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Completed_Date_Time>([^<]+)<\//);
      const errorMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Error_Message>([^<]+)<\//);
      const logsMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?System_Log>([^<]+)<\//);

      // Extract integration system ID for this event
      const systemIdMatch = block.match(/(?:[a-zA-Z0-9_]+:)?type=["']Integration_System_ID["'][^>]*?>([^<]+)<\//)
        || block.match(/(?:[a-zA-Z0-9_]+:)?type=["']WID["'][^>]*?>([^<]+)<\//)
        || block.match(/<(?:[a-zA-Z0-9_]+:)?ID[^>]*?(?:Integration_System_ID)[^>]*?>([^<]+)<\//);
      const systemId = systemIdMatch ? systemIdMatch[1] : null;

      // Extract integration name descriptor if present
      const systemDescriptorMatch = block.match(/<(?:[a-zA-Z0-9_]+:)?Integration_System_Reference[^>]*?Descriptor=["']([^"']+)["']/i);
      const systemName = systemDescriptorMatch ? systemDescriptorMatch[1] : (systemId || 'Unknown Integration');

      if (idMatch && statusMatch && startedMatch) {
        events.push({
          id: idMatch[1],
          status: statusMatch[1],
          runBy: runByMatch ? runByMatch[1] : 'System',
          startedAt: new Date(startedMatch[1]),
          completedAt: completedMatch ? new Date(completedMatch[1]) : null,
          logs: logsMatch ? logsMatch[1] : 'No logs attached.',
          errorMessage: errorMatch ? errorMatch[1] : null,
          workdaySystemId: systemId,
          workdaySystemName: systemName,
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
}
