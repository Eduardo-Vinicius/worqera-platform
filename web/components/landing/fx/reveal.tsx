"use client"

import { m, type Variants } from "motion/react"
import type { ReactNode } from "react"

const EASE = [0.22, 1, 0.36, 1] as const

type Tag = "div" | "li" | "ul" | "ol" | "section" | "p" | "h2" | "span"

/** Fades and lifts its content once, when it scrolls into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 16,
  as = "div",
}: {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  as?: Tag
}) {
  const Comp = m[as]
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </Comp>
  )
}

const group: Variants = {
  hidden: {},
  show: (stagger: number) => ({ transition: { staggerChildren: stagger } }),
}

const item: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

/** A list whose `RevealItem` children come in one after the other. */
export function RevealGroup({
  children,
  className,
  stagger = 0.07,
  as = "ul",
}: {
  children: ReactNode
  className?: string
  stagger?: number
  as?: Tag
}) {
  const Comp = m[as]
  return (
    <Comp
      className={className}
      variants={group}
      custom={stagger}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "0px 0px -60px 0px" }}
    >
      {children}
    </Comp>
  )
}

export function RevealItem({ children, className, as = "li" }: { children: ReactNode; className?: string; as?: Tag }) {
  const Comp = m[as]
  return (
    <Comp className={className} variants={item}>
      {children}
    </Comp>
  )
}
