import DraggableTitle from "../../components/DraggableTitle";
import ProjectsWithPreview from "../../components/ProjectsWithPreview";
import { projects } from "../../data/projects";

export const metadata = {
  title: "Projects | Steven",
  description: "Case studies with problem, approach, architecture, tradeoffs, and outcomes.",
};

export default function ProjectsPage() {
  return (
    <DraggableTitle
      lines={[
        "Projects",
        "Case studies in pragmatic engineering and architecture.",
      ]}
      fill={false}
    >
      <div className="mt-8 sm:mt-12">
        <ProjectsWithPreview projects={projects} />
      </div>
    </DraggableTitle>
  );
}
