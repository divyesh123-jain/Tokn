"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar"
      className={cn("relative flex size-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<"img">) {
  return (
    <img
      data-slot="avatar-image"
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="avatar-fallback"
      className={cn(
        "flex size-full items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground",
        className,
      )}
      {...props}
    />
  );
}

type AvatarWithSourceProps = {
  src?: string | null;
  alt: string;
  fallback: string;
  className?: string;
};

function AvatarWithSource({ src, alt, fallback, className }: AvatarWithSourceProps) {
  const [hideImage, setHideImage] = React.useState(false);
  React.useEffect(() => {
    setHideImage(false);
  }, [src]);
  const text = fallback.trim().slice(0, 2).toUpperCase() || "?";
  return (
    <Avatar className={className}>
      <AvatarFallback className="absolute inset-0 z-0">{text}</AvatarFallback>
      {src && !hideImage ? (
        <AvatarImage
          src={src}
          alt={alt}
          className="absolute inset-0 z-10 size-full"
          onError={() => setHideImage(true)}
        />
      ) : null}
    </Avatar>
  );
}

export { Avatar, AvatarImage, AvatarFallback, AvatarWithSource };
