import ky from "ky";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FaGithub } from "react-icons/fa";
import { AlertCircleIcon, GlobeIcon, Loader2Icon, Trash2 } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import { useDeleteProject, useProjects } from "../hooks/use-projects";
import { Doc } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useConfirm } from "@/components/use-confirm";

interface ProjectsCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getProjectIcon = (project: Doc<"projects">) => {
  if (project.importStatus === "completed") {
    return <FaGithub className="size-4 text-muted-foreground" />;
  }

  if (project.importStatus === "failed") {
    return <AlertCircleIcon className="size-4 text-muted-foreground" />;
  }

  if (project.importStatus === "importing") {
    return (
      <Loader2Icon className="size-4 text-muted-foreground animate-spin" />
    );
  }

  return <GlobeIcon className="size-4 text-muted-foreground" />;
};

export const ProjectsCommandDialog = ({
  open,
  onOpenChange,
}: ProjectsCommandDialogProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const projects = useProjects();
  const deleteProject = useDeleteProject();
  const [ConfirmDialog, confirm] = useConfirm(
    "Please Confirm",
    "You are about to delete this project.",
  );

  const handleSelect = (projectId: string) => {
    router.push(`/projects/${projectId}`);
    onOpenChange(false);
  };

  return (
    <>
      <ConfirmDialog />
      <CommandDialog
        open={open}
        onOpenChange={onOpenChange}
        title="Search Projects"
        description="Search and navigate to your projects"
      >
        <CommandInput placeholder="Search projects..." />
        <CommandList>
          <CommandEmpty>No projects found.</CommandEmpty>
          <CommandGroup heading="Projects">
            {projects?.map((project) => (
              <CommandItem
                key={project._id}
                value={`${project.name}-${project._id}`} // value is used for searching
                onSelect={() => handleSelect(project._id)}
              >
                <div className="w-full flex items-center justify-between">
                  <div className="flex gap-2">
                    {getProjectIcon(project)}
                    <span>{project.name}</span>
                  </div>

                  <button
                    disabled={loading}
                    className="group/button p-1"
                    onClick={async (e) => {
                      try {
                        e.stopPropagation();

                        const ok = await confirm();
                        if (!ok) return;

                        setLoading(true);

                        // Before proceeding to delete the project and its data, we first stop any background agent from processing any message.
                        await ky.post("/api/messages/cancel", {
                          json: { projectId: project._id },
                        });

                        await deleteProject({ id: project._id });
                        toast.success("Project successfully deleted");
                      } catch {
                        toast.error("Failed to delete project");
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    <Trash2 className="opacity-70 group-hover/button:opacity-100 transition-opacity duration-150 size-4!" />
                  </button>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};
