import { getAllProjectsOverview } from '@/actions/portfolio';
import ProjectTable from '@/components/ProjectListTable';
import PortfolioSummary from '@/components/PortfolioSummary';
import SyncProjectsButton from '@/components/SyncProjectsButton';

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const page = typeof resolvedParams.page === 'string' ? parseInt(resolvedParams.page, 10) : 1;
  const limit = typeof resolvedParams.limit === 'string' ? parseInt(resolvedParams.limit, 10) : 10;
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  const { projects, pagination } = await getAllProjectsOverview({
    page,
    limit,
    search,
    status,
    enrich: true,
  });

  return (
    <div className="dashboard-container">
      {/* Page header with branding + sync */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '12px',
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '1.5rem', 
            fontWeight: 700, 
            color: '#0F172A',
            letterSpacing: '-0.02em',
          }}>
            Portfolio Dashboard
          </h1>
          <p style={{ 
            margin: '4px 0 0', 
            fontSize: '0.85rem', 
            color: '#64748B',
          }}>
            Monitor and manage all your Jira projects
          </p>
        </div>
        <SyncProjectsButton />
      </div>

      <PortfolioSummary />
      <ProjectTable projects={projects} pagination={pagination} />
    </div>
  );
}
