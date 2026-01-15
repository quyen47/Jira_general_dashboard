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
  
  return new Version3Client({
    host,
    authentication: {
      basic: {
        email: credentials.email,
        apiToken: credentials.apiToken,
      },
    },
  });
}
