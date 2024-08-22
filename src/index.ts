import { Socket } from 'net';
import { promises as dnsPromise } from 'dns';
import axios from 'axios';
const [proc, script, email] = process.argv;

interface EmailParts {
  email: string;
  user: string;
  domain: string;
}

const getIP = async (): Promise<string> => {
  try {
    const apiEndpoints = ['icanhazip.com', 'ifconfig.me/ip', 'api.ipify.org', 'ipinfo.io/ip', 'ipecho.net/plain'];
    const selectedAPI = apiEndpoints[Math.floor(Math.random() * apiEndpoints.length)];
    const ip = await axios.get(`https://${selectedAPI}`);
    console.log('>> Getting IP address from %s', selectedAPI);
    return ip.data;
  } catch (err) {
    const error = err as Error;
    return Promise.reject(error.message);
  }
}

const extractEmailParts = (address: string): EmailParts => {
  const matches = address.match(/([^ ]*)@([^ ]*)/);
  console.log('>> Extracting from %s', address);

  if (matches) {
    const emailParts: EmailParts = {
      email: address,
      user: matches[1],
      domain: matches[2]
    };
    return emailParts;
  }
  return { email: address, user: '', domain: '' }
}

const getMXRecords = async (domain: string) => {
  try {
    const records = await dnsPromise.resolveMx(domain);
    return records[0].exchange;
  } catch (err) {
    const error: Error = err as Error;
    return error.message;
  }
};

const verifyEmail = async (domain: string, email: string) => {
  try {
    const client = new Socket();
    console.info(`>> Connecting to ${domain}...`);

    const ip = await getIP();
    console.info('>> IP: %s', ip);

    client.on('connect', () => {
      console.info('>> Connected! Verifying...');
      client.write(`HELO ${ip}\r\n`);
      client.write('MAIL FROM: <verifier@verify.me>\r\n');
      client.write(`RCPT TO: <${email}>\r\n`);
      client.write(`VRFY <${email}>\r\n`);
      client.write(`QUIT\r\n`);
    });

    client.on('error', (error) => {
      console.error(`[X] Socket Error ${error}`);
      client.end();
    });

    client.on('close', () => {
      console.info('[*] Socket closed');
    });
    client.on('data', (data) => {
      console.info(`<- Receive: ${data.toString('utf-8')}`);
    });

    client.connect(25, domain);
  } catch (error) {
    console.error(`[x] Error!: ${error}`);
  }
}

console.info('>> Checking email: %s', email);

const { domain } = extractEmailParts(email);
if (!domain) {
  console.error('[x] Could not get domain');
  process.exit(-1);
}

console.info('>> Domain: %s', domain);
const mxResults = getMXRecords(domain);

mxResults.then(async (data) => {
  console.info('>> MX Records:', data);
  verifyEmail(data, email);
}).catch((err) => {
  console.error('[x] ERROR! %s', err.message);
});

