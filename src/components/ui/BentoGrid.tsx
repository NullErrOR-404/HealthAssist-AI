import React from "react"
import { cn } from "@/lib/utils"

interface BentoGridProps {
  children: React.ReactNode
  className?: string
}

interface BentoCardProps {
  id?: string
  children: React.ReactNode
  className?: string
}

interface BentoTitleProps {
  children?: React.ReactNode
  className?: string
}

interface BentoDescriptionProps {
  children?: React.ReactNode
  className?: string
}

interface BentoContentProps {
  children: React.ReactNode
  className?: string
}

export interface BentoFeature {
  id: string
  title?: string
  description?: string
  content: React.ReactNode
  className?: string
}

interface BentoGridWithFeaturesProps {
  features: BentoFeature[]
  className?: string
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-6 lg:grid-cols-6 gap-4 rounded-3xl", className)}>
      {children}
    </div>
  )
}

export const BentoCard = ({ id, children, className }: BentoCardProps) => {
  return (
    <div
      id={id}
      className={cn("relative overflow-hidden p-6 rounded-[24px] bg-card/70 backdrop-blur-xl border border-border shadow-sm group hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/30 flex flex-col", className)}
    >
      {children}
    </div>
  )
}

export const BentoTitle = ({ children, className }: BentoTitleProps) => {
  if (!children) return null
  
  return (
    <h3 className={cn("text-left text-xl font-bold tracking-tight text-card-foreground md:text-2xl md:leading-snug", className)}>
      {children}
    </h3>
  )
}

export const BentoDescription = ({ children, className }: BentoDescriptionProps) => {
  if (!children) return null
  
  return (
    <p className={cn(
      "text-left text-sm md:text-base",
      "font-medium text-muted-foreground",
      "mx-0 my-2 max-w-sm text-left md:text-sm",
      className
    )}>
      {children}
    </p>
  )
}

export const BentoContent = ({ children, className }: BentoContentProps) => {
  return (
    <div className={cn("mt-4 flex-1 overflow-hidden rounded-xl h-full flex flex-col", className)}>
      {children}
    </div>
  )
}

export const BentoGridWithFeatures = ({ features, className }: BentoGridWithFeaturesProps) => {
  return (
    <div className="relative mb-6">
      <BentoGrid className={className}>
        {features.map((feature) => (
          <BentoCard
            key={feature.id}
            id={feature.id}
            className={feature.className}
          >
            <BentoTitle>{feature.title}</BentoTitle>
            <BentoDescription>{feature.description}</BentoDescription>
            <BentoContent>{feature.content}</BentoContent>
          </BentoCard>
        ))}
      </BentoGrid>
    </div>
  )
}
