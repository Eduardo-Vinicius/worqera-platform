"use client"

import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { tidyMoneyTyping } from "@/lib/orderMoney"

export function MoneyField({
  id,
  value,
  onValue,
  disabled,
  className,
  placeholder = "0",
}: {
  id?: string
  value: number
  onValue: (next: number) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}) {
  const focused = useRef(false)
  const [text, setText] = useState(() => (value ? String(value) : ""))

  useEffect(() => {
    if (focused.current) return
    setText(value ? String(value) : "")
  }, [value])

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      value={text}
      onFocus={() => {
        focused.current = true
      }}
      onBlur={() => {
        focused.current = false
        setText(value ? String(value) : "")
      }}
      onChange={(e) => {
        const tidy = tidyMoneyTyping(e.target.value)
        setText(tidy)
        const n = tidy === "" || tidy === "0." ? 0 : Number(tidy)
        onValue(Number.isFinite(n) ? n : 0)
      }}
    />
  )
}
