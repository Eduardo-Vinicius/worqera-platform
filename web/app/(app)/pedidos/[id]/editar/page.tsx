"use client"

import { useParams } from "next/navigation"
import { OrderForm } from "@/components/orders/OrderForm"

export default function EditOrderPage() {
  const params = useParams()
  const orderId = String(params?.id || "")
  return <OrderForm mode="edit" orderId={orderId} />
}
