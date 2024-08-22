import EventEmitter from 'events';
import {MxRecord, promises as dnsPromises} from 'dns';
import {Socket} from 'net';

export interface EmailParts {
  email: string;
  domain: string;
  user: string;
}
export default class EmailVerifier {

  static getEmailParts(email: string): EmailParts {
    const matches = email.match(/([^ ]*)@([^ ]*)/);

    return {
        email,
        user: matches ? matches[1] : '',
        domain: matches ? matches[2] : '',
    };
  }
  
  static async getMxRecords(domain: string): Promise<MxRecord[] | string> {
    try {
      return await dnsPromises.resolveMx(domain);
    } catch (err: unknown) { 
      const error = err as Error;
      return error.message;
    }
  }
  
  static async verify(email: string) {
    const {user, domain} = EmailVerifier.getEmailParts(email);

    if (!domain) return 'Could not find domain';

    try {
      const mxRecords = await EmailVerifier.getMxRecords(domain);

      if (!mxRecords) {
        console.warn('Error getting MX Records');
        return 'Error getting MX records';
      }

      const socket = new Socket();
      socket.on('connect', ()=> {
        console.info(`Connected to ${domain}`);
        socket.write(`HELO ${domain}\r\n`);
        socket.write(`MAIL FROM: <verifier@verify.me>\r\n`);
        socket.write(`RCPT TO: <${email}>\r\n`);
        socket.write('QUIT\r\n');
      });

      socket.on('error', (error) => {
        console.error(`SOCKET ERROR! ${error.message}`);
      });

      socket.on('data', (data) => {
        console.info(data.toString('utf-8'));
      });
      socket.connect(25, domain);
    } catch (err) {
      const error:Error = err as Error;
      console.error(error);
      return error.message;
    }
  }
}
