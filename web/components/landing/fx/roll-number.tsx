import { cn } from "@/lib/utils"

const DIGITS = "0123456789"

/**
 * Text where every digit sits on a 0–9 reel, so changing "18" to "17" or "R$ 147" to "R$ 122,50"
 * rolls the digits instead of swapping the text. Keys count from the right so units stay on units.
 */
export function RollNumber({ value, className }: { value: string; className?: string }) {
  const chars = value.split("")
  return (
    <span className={cn("lp-roll tabular-nums", className)}>
      <span className="sr-only">{value}</span>
      {chars.map((char, index) => {
        const key = chars.length - index
        const digit = DIGITS.indexOf(char)
        if (digit < 0) {
          return (
            <span key={`c${key}`} aria-hidden className="whitespace-pre">
              {char}
            </span>
          )
        }
        return (
          <span key={`d${key}`} aria-hidden className="lp-reel">
            <span className="invisible">{char}</span>
            <span className="lp-reel-win">
              <span className="lp-reel-strip" style={{ transform: `translateY(-${digit * 10}%)` }}>
                {DIGITS.split("").map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          </span>
        )
      })}
    </span>
  )
}
