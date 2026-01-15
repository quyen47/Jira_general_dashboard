'use client';

import { login } from '@/actions/login';
import { useActionState } from 'react';

const initialState = {
  error: '',
};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(async (prev: any, formData: FormData) => {
      const result = await login(formData);
      if (result?.error) {
          return { error: result.error };
      }
      return { error: '' };
  }, initialState);

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Jira Dashboard</h1>
        <p>Enter your credentials to connect</p>
        
        <form action={formAction} className="login-form">
          <div className="form-group">
            <label htmlFor="domain">Jira Domain</label>
            <input 
              type="text" 
              id="domain" 
              name="domain" 
              placeholder="your-domain.atlassian.net" 
              required 
            />
            <small>Just the domain, e.g. "company.atlassian.net"</small>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="you@example.com" 
              required 
            />
          </div>

          <div className="form-group">
            <label htmlFor="apiToken">API Token</label>
            <input 
              type="password" 
              id="apiToken" 
              name="apiToken" 
              placeholder="Your Jira API Token" 
              required 
            />
            <small>
              <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer">
                Generate an API Token here
              </a>
            </small>
          </div>

          {state?.error && <div className="error-message">{state.error}</div>}

          <button type="submit" disabled={isPending}>
            {isPending ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
