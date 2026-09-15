"use client"

import { useLanguage } from "@/components/landing/language-provider"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function FaqSection() {
  const { t } = useLanguage()

  return (
    <section id="faq" className="py-20 lg:py-32 relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 text-balance">
            {t.faq.title}
          </h2>
          <p className="text-lg text-muted-foreground">{t.faq.subtitle}</p>
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
