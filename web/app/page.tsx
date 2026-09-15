import { Outfit } from "next/font/google"
import { LandingPage } from "@/components/landing/LandingPage"

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lp",
})

export default function HomePage() {
  return (
    <div className={outfit.variable}>
      <LandingPage />
    </div>
  )
}
