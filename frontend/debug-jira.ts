import { Version3Client } from 'jira.js';

const client = new Version3Client({ host: 'https://test.atlassian.net' });
console.log('Methods on issueSearch:', Object.getOwnPropertyNames(Object.getPrototypeOf(client.issueSearch)));
