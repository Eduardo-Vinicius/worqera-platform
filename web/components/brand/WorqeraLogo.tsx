"use client"

import { useId } from "react"

export function WorqeraLogo({
  className = "h-8 w-8",
  title = "Worqera",
}: {
  className?: string
  title?: string
}) {
  const rawId = useId().replace(/:/g, "")
  const gradientId = `wq-logo-grad-${rawId}`

  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
    >
      <rect width="100" height="100" rx="20" fill={`url(#${gradientId})`} />
      <path
        d="M25 35L35 65L50 45L65 65L75 35"
        stroke="white"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="50" cy="55" r="8" fill="white" />
      <defs>
        <linearGradient
          id={gradientId}
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#AE50FD" />
          <stop offset="0.5" stopColor="#7D26DE" />
          <stop offset="1" stopColor="#4F0FA6" />
        </linearGradient>
      </defs>
    </svg>
  )
}
