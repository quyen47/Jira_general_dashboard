# Jira API Usage & Optimization

## Current API Setup

**Library:** `jira.js` (npm package)  
**Client:** `Version3Client` - Official Jira REST API v3 client  
**Authentication:** Basic auth (email + API token)

## API Calls for Burn Down Chart

### Current Implementation
```typescript
await jira.issueSearch.searchForIssuesUsingJqlEnhancedSearchPost({
  jql: `project = "${projectKey}"`,
  maxResults: 1000,
  fields: ['worklog']
})
```

**Endpoint:** `/rest/api/3/search` (Jira REST API v3)  
**Limit:** 1000 issues per request (Jira hard limit)  
**Rate Limit:** Varies by Jira Cloud plan (typically 10 requests/second)

### Optimization: Weekly Grouping

**Before (Daily):**
- Grouped worklogs by day
- More data points = more calculations
- Example: 90-day project = ~90 data points

**After (Weekly):**
- Group worklogs by week (Monday start)
- Fewer data points = faster rendering
- Example: 90-day project = ~13 data points
- **~85% reduction in data points**

## Benefits

✅ **Reduced Calculation:** ~7x fewer data points  
✅ **Faster Chart Rendering:** Less data for Recharts to process  
✅ **Better Performance:** Especially for long-running projects  
✅ **Same API Calls:** Still 1 API call, just smarter grouping  
✅ **Cleaner Charts:** Weekly trend more readable than daily noise

## API Limits to Consider

- **Search API:** 1000 issues max per request
- **Pagination:** If project has >1000 issues, need to paginate
- **Rate Limits:** 10 req/sec for most Jira Cloud instances
- **Worklog Field:** Only returns recent worklogs (not all historical)

## Future Optimizations (if needed)

1. **Cache worklog data** in backend database
2. **Incremental updates** - only fetch recent worklogs
3. **Pagination** - handle projects with >1000 issues
4. **Date range filtering** - use JQL `worklogDate` to reduce data fetched
