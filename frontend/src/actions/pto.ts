'use server';

import { getJiraClient } from '@/lib/jira';

export interface PTOEntry {
  id: string;
  issueKey: string;
  reporter: {
    accountId: string;
    displayName: string;
  };
  startDate: string; // YYYY-MM-DD
  duration: number; // 0.5 or 1 (days)
  status: string; // Backlog or Approved
  summary: string;
}

export interface PTOData {
  [accountId: string]: {
    [date: string]: PTOEntry;
  };
}

/**
 * Fetch PTO (Paid Time Off) data from PMI project
 * @param accountIds - Array of Jira account IDs to fetch PTO for
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns PTOData grouped by accountId and date
 */
export async function getPTOData(
  accountIds: string[],
  startDate: string,
  endDate: string
): Promise<PTOData> {
  try {
    if (accountIds.length === 0) {
      return {};
    }

    const jira = await getJiraClient();
    
    console.log('[PTO] Fetching PTO data for', accountIds.length, 'users');
    console.log('[PTO] Date range:', startDate, 'to', endDate);
    
    // Build JQL query for Day-Off issues
    // Use IN operator for reporter filter (matches user confirmed JQL)
    const reporterFilter = `reporter IN (${accountIds.map(id => `"${id}"`).join(', ')})`;
    
    const jql = `
      project = PMI
      AND type = "Day-Off"
      AND status IN (Backlog, Approved)
      AND ${reporterFilter}
      AND "start date:[date]" >= "${startDate}"
      AND "start date:[date]" <= "${endDate}"
      ORDER BY created DESC
    `.trim().replace(/\s+/g, ' ');
    
    console.log('[PTO] JQL:', jql);
    
    // Fetch Day-Off issues
    const search = await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
      jql,
      maxResults: 500,
      fields: ['summary', 'reporter', 'status', 'customfield_*', 'created'] // Fetch all custom fields + created for context
    });
    
    const issues = search.issues || [];
    console.log('[PTO] Found', issues.length, 'Day-Off issues');
    
    const ptoData: PTOData = {};
    
    for (const issue of issues) {
      const fields = issue.fields as any;
      
      // Extract reporter info
      const reporter = fields.reporter;
      if (!reporter || !reporter.accountId) {
        console.warn('[PTO] Issue', issue.key, 'has no reporter, skipping');
        continue;
      }
      
      const accountId = reporter.accountId;
      
      // Find the "start date:[date]" custom field
      // This field name suggests it's a custom field, need to find the actual field key
      let startDateValue: string | null = null;
      let durationValue: number = 1; // Default to 1 day
      
      // Search through all custom fields to find start date and duration
      for (const [fieldKey, fieldValue] of Object.entries(fields)) {
        if (fieldKey.startsWith('customfield_')) {
          // Check if this is the start date field (usually a date string)
          if (fieldValue && typeof fieldValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(fieldValue)) {
            // This looks like a date field
            if (!startDateValue) {
              startDateValue = fieldValue.split('T')[0]; // Get YYYY-MM-DD part
            }
          }
          
          // Check if this is the duration field (usually a number or string like "0.5" or "1")
          if (fieldValue && (typeof fieldValue === 'number' || !isNaN(parseFloat(fieldValue as string)))) {
            const numValue = typeof fieldValue === 'number' ? fieldValue : parseFloat(fieldValue as string);
            if (numValue === 0.5 || numValue === 1) {
              durationValue = numValue;
            }
          }
        }
      }
      
      if (!startDateValue) {
        // Fallback: Try to extract date from summary
        // Formats: "15/01/2026" or "Jan 19"
        const summary = fields.summary || '';
        
        // Regex for DD/MM/YYYY
        const ddmmyyyy = summary.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (ddmmyyyy) {
          const [_, day, month, year] = ddmmyyyy;
          // Ensure padding
          const pad = (n: string) => n.padStart(2, '0');
          startDateValue = `${year}-${pad(month)}-${pad(day)}`;
          console.log(`[PTO] Extracted date ${startDateValue} from summary: "${summary}" (DD/MM/YYYY)`);
        } else {
            // Regex for Month DD (e.g. Jan 19)
            // Need to guess year. Use the year from the passed startDate filter or current year.
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const monthRegex = new RegExp(`(${monthNames.join('|')})[a-z]*\\s+(\\d{1,2})`, 'i');
            const match = summary.match(monthRegex);
            
            if (match) {
                const [_, monStr, dayStr] = match;
                const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monStr.toLowerCase().substring(0, 3));
                if (monthIndex !== -1) {
                    const year = startDate.split('-')[0]; // Use year from query start date
                    const month = (monthIndex + 1).toString().padStart(2, '0');
                    const day = dayStr.padStart(2, '0');
                    startDateValue = `${year}-${month}-${day}`;
                     console.log(`[PTO] Extracted date ${startDateValue} from summary: "${summary}" (Month DD)`);
                }
            }
        }
      }

      if (!startDateValue) {
        console.warn('[PTO] Issue', issue.key, 'has no start date (checked custom fields and summary), skipping');
        continue;
      }
      
      // Verify start date is within range
      if (startDateValue < startDate || startDateValue > endDate) {
        continue;
      }
      
      // Initialize data structure
      if (!ptoData[accountId]) {
        ptoData[accountId] = {};
      }
      
      // Store PTO entry
      const ptoEntry: PTOEntry = {
        id: issue.id,
        issueKey: issue.key,
        reporter: {
          accountId: reporter.accountId,
          displayName: reporter.displayName || 'Unknown'
        },
        startDate: startDateValue,
        duration: durationValue,
        status: fields.status?.name || 'Unknown',
        summary: fields.summary || ''
      };
      
      ptoData[accountId][startDateValue] = ptoEntry;
      
      console.log('[PTO] Added PTO:', issue.key, 'for', reporter.displayName, 'on', startDateValue, `(${durationValue} day)`);
    }
    
    console.log('[PTO] Processed PTO for', Object.keys(ptoData).length, 'users');
    
    return ptoData;
  } catch (e) {
    console.error('Failed to fetch PTO data:', e);
    return {};
  }
}
