"use client"

import { useEffect, useState } from "react"
import { useLanguage } from "@/components/landing/language-provider"

export function ClientsSection() {
  const { t } = useLanguage()
  const stories = t.clients.stories
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const story = stories[index]

  useEffect(() => {
    if (paused || stories.length < 2) return
    const tick = window.setInterval(() => {
      setIndex((current) => (current + 1) % stories.length)
    }, 8000)
    return () => window.clearInterval(tick)
  }, [paused, stories.length])

  return (
    <section id="clientes" className="scroll-mt-24 border-t border-[var(--border)] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="lp-display text-3xl font-semibold tracking-tight text-[var(--ink)] sm:text-4xl">
          {t.clients.title}
        </h2>
        <p className="mt-3 max-w-xl text-base text-[var(--muted-foreground)] sm:text-lg">{t.clients.subtitle}</p>

        <figure
          className="relative mt-8 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-7 sm:px-10 sm:py-10"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <p className="lp-display text-5xl leading-none text-[var(--primary)]" aria-hidden>
            “
          </p>
          <blockquote
            key={story.quote}
            className="lp-animate-in mt-4 max-w-3xl text-pretty text-xl font-medium leading-snug tracking-tight text-[var(--ink)] sm:text-2xl"
          >
            {story.quote}
          </blockquote>
          <figcaption className="mt-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="font-semibold text-[var(--ink)]">{story.name}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                {story.role}, {story.href ? (
                  <a href={story.href} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {story.company}
                  </a>
                ) : (
                  story.company
                )}
                {story.place ? ` · ${story.place}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {stories.map((item, i) => (
                <button
                  key={item.name}
                  type="button"
                  aria-label={item.company}
                  className={`h-2 w-2 rounded-full ${i === index ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
          </figcaption>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--border)]">
            <div key={`${index}-${paused}`} className={paused ? "h-full w-0" : "lp-story-bar h-full bg-[var(--primary)]"} />
          </div>
        </figure>

      </div>
    </section>
  )
}
