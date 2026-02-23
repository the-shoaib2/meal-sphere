import { Button, ButtonProps } from "@/components/ui/button";
import { AlertCircle, Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode } from 'react';
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string | ReactNode;
  actionText?: string;
  actionHref?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export type EmptyStateTemplate = 'no-group' | 'no-period' | 'no-items';

const TEMPLATES: Record<EmptyStateTemplate, Partial<EmptyStateProps>> = {
  'no-group': {
    title: "No active group",
    description: "You are not a member of any group yet. Join one or create a new group to get started.",
    actionText: "Browse Groups",
    actionHref: "/groups?tab=public"
  },
  'no-period': {
    title: "No active period",
    description: "An active period is required to track meals and expenses. Please start a new period.",
    actionText: "Manage Periods",
    actionHref: "/periods"
  },
  'no-items': {
    title: "No items found",
    description: "There are no items to display right now.",
    actionText: "Create New"
  }
};

export function EmptyState(props: EmptyStateProps & { template?: EmptyStateTemplate }) {
  const { template, ...otherProps } = props;
  const templateProps = template ? TEMPLATES[template] : {};
  const {
    title = "No items found",
    description = "Get started by creating a new item.",
    actionText = "Create New",
    actionHref,
    action,
    icon,
    className = "",
  } = { ...templateProps, ...otherProps };

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        {icon || <AlertCircle className="h-6 w-6 text-muted-foreground" />}
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">{description}</p>
      {action || (actionHref && actionText) ? (
        <div className="mt-6">
          {action || (
            <Link href={actionHref!}>
              <Button className="group transition-all duration-300 hover:shadow-md">
                <Plus className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                {actionText}
              </Button>
            </Link>
          )}
        </div>
      ) : null}
    </div>
  );
}
