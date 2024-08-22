import axios from 'axios';
import {MxRecord, promises as dnsPromises} from 'dns';
import {Socket} from 'net';

export interface EmailParts {
  email: string;
  domain: string;
  user: string;
}
export default class EmailVerifier {
  static async getIP(): Promise<string> {
    try {
      const apiEndpoints = [
        'icanhazip.com',
        'ifconfig.me/ip',
        'api.ipify.org',
        'ipinfo.io/ip',
        'ipecho.net/plain',
      ];
      const selectedAPI =
          apiEndpoints[Math.floor(Math.random() * apiEndpoints.length)];
      const pageResponse = await axios.get(`https://${selectedAPI}`);
      console.info('>> Getting IP address from %s', selectedAPI);
      const {data} = pageResponse
      return Promise.resolve(data.trim());
    } catch (err) {
      const error = err as Error;
      return Promise.reject(`error getting ip: ${error.message}`);
    }
  };

  static getEmailParts(email: string): EmailParts {
    const matches = email.match(/([^ ]*)@([^ ]*)/);

    return {
      email,
      user: matches ? matches[1] : '',
      domain: matches ? matches[2] : '',
    };
  }

  static async getMxRecords(domain: string): Promise<MxRecord[]|string> {
    try {
      const records = await dnsPromises.resolveMx(domain);
      return Promise.resolve(records);
    } catch (err: unknown) {
      const error = err as Error;
      return Promise.reject(error.message);
    }
  }

  static async verify(email: string) {
    let {user, domain} = EmailVerifier.getEmailParts(email);

    if (!domain) return 'Could not find domain';

    try {
      const mxRecords = await EmailVerifier.getMxRecords(domain);

      if (typeof mxRecords === 'string') {
        console.warn('[X] Error getting MX Records');
        return 'Error getting MX records';
      }


      const ip = await EmailVerifier.getIP();
      console.info(`>> IP Address: ${ip}`);

      const client = new Socket();
      client.on('connect', () => {
        console.info(`Connected to ${domain}, checking if ${user} is valid...`);
        client.write(`HELO ${ip}\r\n`);
        client.write(`MAIL FROM: <verifier@verify.me>\r\n`);
        client.write(`RCPT TO: <${email}>\r\n`);
        client.write('QUIT\r\n');
      });

      client.on('error', (error) => {
        console.error(`SOCKET ERROR! ${error.message}`);
      });

      client.on('data', (data) => {
        console.info(data.toString('utf-8'));
      });
      client.connect(25, mxRecords[0].exchange);
    } catch (err) {
      const error: Error = err as Error;
      console.error(error);
      return error.message;
    }
  }
}
