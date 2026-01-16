import { cookies } from 'next/headers';

const COOKIE_NAME = 'jira_credentials';

export interface JiraCredentials {
  domain: string;
  email: string;
  apiToken: string;
}

export async function getJiraCredentials(): Promise<JiraCredentials | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie) {
    return null;
  }

  try {
    return JSON.parse(cookie.value) as JiraCredentials;
  } catch (e) {
    return null;
  }
}

export async function setJiraCredentials(credentials: JiraCredentials) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(credentials), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearJiraCredentials() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
