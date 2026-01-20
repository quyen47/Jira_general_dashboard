'use server';

import { setJiraCredentials, clearJiraCredentials, JiraCredentials } from '@/lib/auth';
import { Version3Client } from 'jira.js';
import { redirect } from 'next/navigation';
import { updateDomainTimezone } from './timezone';

export async function login(formData: FormData) {
  const domain = formData.get('domain') as string;
  const email = formData.get('email') as string;
  const apiToken = formData.get('apiToken') as string;

  if (!domain || !email || !apiToken) {
    return { error: 'All fields are required' };
  }

  // Validate credentials by making a lightweight request
  try {
    let host = domain;
    if (!host.startsWith('http')) {
      host = `https://${host}`;
    }

    const client = new Version3Client({
      host,
      authentication: {
        basic: {
          email,
          apiToken,
        },
      },
    });

    // Try to get current user to verify token
    await client.myself.getCurrentUser();

    // internal implementation details
    await setJiraCredentials({ domain, email, apiToken });
    
    // Create domain config for settings page
    try {
      const hostname = new URL(host).hostname;
      await updateDomainTimezone(hostname, 'Asia/Bangkok'); // Creates if doesn't exist
    } catch (error) {
      console.error('Error creating domain config:', error);
      // Don't fail login if domain config creation fails
    }
  } catch (e: any) {
    console.error('Login failed:', e);
    return { error: 'Invalid credentials or cannot connect to Jira' };
  }

  redirect('/');
}

export async function logout() {
  await clearJiraCredentials();
  redirect('/login');
}
