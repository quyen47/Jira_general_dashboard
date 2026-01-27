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
  // Default to 10 if not specified, or parses limit param
  const limit = typeof resolvedParams.limit === 'string' ? parseInt(resolvedParams.limit, 10) : 10;
  const search = typeof resolvedParams.search === 'string' ? resolvedParams.search : '';
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';

  // Server Action call
  const { projects, pagination } = await getAllProjectsOverview({
    page,
    limit,
    search,
    status,
    enrich: true,
  });

  return (
    <div className="dashboard-container">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
         <SyncProjectsButton />
      </div>
      <PortfolioSummary />
      <ProjectTable projects={projects} pagination={pagination} />
    </div>
  );
}
