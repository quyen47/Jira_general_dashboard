import { Version3Client } from 'jira.js';
import { getJiraCredentials } from './auth';

export async function getJiraClient() {
  const credentials = await getJiraCredentials();

  if (!credentials) {
    throw new Error('Unauthorized: No Jira credentials found');
  }

  // Ensure domain doesn't have trailing slash and includes protocol
  let host = credentials.domain;
  if (!host.startsWith('http')) {
    host = `https://${host}`;
  }
  
  const client = new Version3Client({
    host,
    authentication: {
      basic: {
        email: credentials.email,
        apiToken: credentials.apiToken,
      },
    },
  });

  // Logging Proxy Wrapper
  const handler = {
    get(target: any, prop: string | symbol, receiver: any): any {
        const value = target[prop as keyof typeof target];
        
        // Skip symbol properties and common non-API props to avoid noise/issues
        if (typeof prop !== 'string' || prop === 'then' || prop === 'catch' || prop === 'toJSON') {
            return value;
        }

        // If it's a function, return a wrapped version
        if (typeof value === 'function') {
            return async function (this: any, ...args: any[]) {
                const apiName = (target.constructor?.name || 'API') + '.' + prop;
                console.log(`[Jira API] -> Call: ${apiName}`);
                // console.log(`[Jira API] Args:`, JSON.stringify(args)); 

                try {
                    const result = await value.apply(target, args); // Bind to original target to avoid internal proxy issues
                    console.log(`[Jira API] <- Success: ${apiName}`);
                    return result;
                } catch (error: any) {
                    console.error(`[Jira API] <- Failed: ${apiName}`, error.message);
                    throw error;
                }
            };
        }

        // If it's an object (API namespace like jira.projects), wrap it too
        if (typeof value === 'object' && value !== null) {
            return new Proxy(value, handler); // Recursive proxy
        }

        return value;
    }
  };

  return new Proxy(client, handler);
}
