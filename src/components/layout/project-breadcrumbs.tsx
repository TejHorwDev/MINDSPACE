import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type ProjectBreadcrumbsProps = {
  projectId?: string;
  projectName?: string;
  isEditor?: boolean;
  isNew?: boolean;
  isAdmin?: boolean;
  className?: string;
};

export function ProjectBreadcrumbs({
  projectId,
  projectName,
  isEditor = false,
  isNew = false,
  isAdmin = false,
  className = "",
}: ProjectBreadcrumbsProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="text-xs text-muted-foreground">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard" className="flex items-center gap-1">
              <Home className="size-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {isNew && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>New Project</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {isAdmin && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage>Admin Panel</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {projectName && !isEditor && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
                {projectName}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}

        {projectName && isEditor && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  href={projectId ? `/project/${projectId}` : "/dashboard"}
                  className="truncate max-w-[150px] sm:max-w-[250px]"
                >
                  {projectName}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>
              <ChevronRight className="size-3" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">
                Editor
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
