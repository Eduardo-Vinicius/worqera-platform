"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  const { t } = useLanguage()

  return (
    <section id="faq" className="relative py-14 sm:py-16 lg:py-24">
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="lp-brand mb-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t.faq.title}
          </h2>
          <p className="text-base text-muted-foreground sm:text-lg">{t.faq.subtitle}</p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {t.faq.items.map((item, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border border-border rounded-xl bg-card/50 backdrop-blur-sm px-6 data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="text-left hover:no-underline py-5">
                <span className="font-semibold text-foreground">{item.question}</span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5">{item.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
