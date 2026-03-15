import { prisma } from "@/lib/prisma";
import ProjectFilters from "./ProjectFilters";
import ProjectsHeader from "./ProjectsHeader";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  try {
    const projects = await prisma.project.findMany({
      include: { tasks: true, contentInventory: { select: { id: true } } },
    });

    // Sort oldest startDate first (nulls go to end)
    (projects as any[]).sort((a: any, b: any) => {
      const aDate = a.startDate || (a.createdAt ? new Date(a.createdAt).toISOString() : "");
      const bDate = b.startDate || (b.createdAt ? new Date(b.createdAt).toISOString() : "");
      return String(aDate).localeCompare(String(bDate));
    });

    return (
      <div>
        <ProjectsHeader />
        <ProjectFilters projects={projects} />
      </div>
    );
  } catch (error: any) {
    console.error("Projects page error:", error);
    return (
      <div className="p-8">
        <ProjectsHeader />
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
          <h2 className="text-red-800 font-semibold mb-2">Error loading projects</h2>
          <pre className="text-red-600 text-sm whitespace-pre-wrap">{error.message || String(error)}</pre>
        </div>
      </div>
    );
  }
}
