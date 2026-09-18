"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"
import Link from "next/link"

import { createClienteService } from "@/lib/apiService"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"

const fieldClass = "rounded-[10px] border-[var(--wq-border)] bg-white"
const errorClass = "border-[var(--wq-danger)]"

export default function NewClientPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    address: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "").slice(0, 8)
    setFormData((prev) => ({ ...prev, cep }))
    if (errors.cep) {
      setErrors((prev) => ({ ...prev, cep: "" }))
    }
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setFormData((prev) => ({
            ...prev,
            logradouro: data.logradouro || "",
            bairro: data.bairro || "",
            cidade: data.localidade || "",
            estado: data.uf || "",
            address: `${data.logradouro || ''}, ${data.bairro || ''}, ${data.localidade || ''} - ${data.uf || ''}`.replace(/^, |, ,/g, '')
          }))
        }
      } catch (err) {
        // erro ao buscar cep
      }
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Telefone é obrigatório"
    }

    const cpfDigits = formData.cpf.replace(/\D/g, "")
    if (cpfDigits && cpfDigits.length !== 11) {
      newErrors.cpf = "CPF deve ter 11 dígitos"
    }

    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Email deve ter um formato válido"
    }

    const firstError = Object.values(newErrors)[0]
    setErrors(newErrors)
    return { isValid: Object.keys(newErrors).length === 0, firstError }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { isValid, firstError } = validateForm();
    if (!isValid) {
      if (firstError) toast.error(firstError);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      await createClienteService({
        nomeCompleto: formData.name,
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.phone.replace(/\D/g, ""),
        email: formData.email,
        cep: formData.cep,
        logradouro: formData.logradouro,
        numero: formData.numero,
        bairro: formData.bairro,
        cidade: formData.cidade,
        estado: formData.estado,
        complemento: formData.complemento,
        observacoes: formData.notes,
      });
      setIsLoading(false);
      toast.success("Cliente cadastrado com sucesso!");
      router.push("/clientes");
    } catch (err: any) {
      setIsLoading(false);
      setErrors({ api: err.message || "Erro ao cadastrar cliente" });
      toast.error(err.message || "Erro ao cadastrar cliente");
    }
  }

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11)
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  }

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11)
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
  }

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value)
    setFormData((prev) => ({ ...prev, cpf: formatted }))
    if (errors.cpf) {
      setErrors((prev) => ({ ...prev, cpf: "" }))
    }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value)
    setFormData((prev) => ({ ...prev, phone: formatted }))
    if (errors.phone) {
      setErrors((prev) => ({ ...prev, phone: "" }))
    }
  }

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader title="Novo cliente" />

      <div className="mx-auto max-w-[640px] px-5 py-6 md:px-8">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-[10px] border border-[var(--wq-border)] bg-white p-5 md:p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nome completo"
                className={`${fieldClass} ${errors.name ? errorClass : ""}`}
              />
              {errors.name && <p className="text-sm text-[var(--wq-danger)]">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className={`${fieldClass} ${errors.phone ? errorClass : ""}`}
              />
              {errors.phone && <p className="text-sm text-[var(--wq-danger)]">{errors.phone}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                name="cpf"
                value={formData.cpf}
                onChange={handleCPFChange}
                placeholder="000.000.000-00"
                maxLength={14}
                className={`${fieldClass} ${errors.cpf ? errorClass : ""}`}
              />
              {errors.cpf && <p className="text-sm text-[var(--wq-danger)]">{errors.cpf}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="cliente@email.com"
                className={`${fieldClass} ${errors.email ? errorClass : ""}`}
              />
              {errors.email && <p className="text-sm text-[var(--wq-danger)]">{errors.email}</p>}
            </div>
          </div>

          <details className="rounded-[10px] border border-[var(--wq-border)] bg-[var(--wq-paper)]/60 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-[var(--wq-text)]">
              Endereço (opcional)
            </summary>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    name="cep"
                    value={formData.cep}
                    onChange={handleCepChange}
                    placeholder="00000000"
                    maxLength={8}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="logradouro">Logradouro</Label>
                  <Input
                    id="logradouro"
                    name="logradouro"
                    value={formData.logradouro}
                    onChange={handleInputChange}
                    placeholder="Rua"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="numero">Número</Label>
                  <Input
                    id="numero"
                    name="numero"
                    value={formData.numero}
                    onChange={handleInputChange}
                    placeholder="Nº"
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    name="bairro"
                    value={formData.bairro}
                    onChange={handleInputChange}
                    placeholder="Bairro"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    name="cidade"
                    value={formData.cidade}
                    onChange={handleInputChange}
                    placeholder="Cidade"
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    name="estado"
                    value={formData.estado}
                    onChange={handleInputChange}
                    placeholder="UF"
                    maxLength={2}
                    className={fieldClass}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  name="complemento"
                  value={formData.complemento}
                  onChange={handleInputChange}
                  placeholder="Apto, bloco…"
                  className={fieldClass}
                />
              </div>
            </div>
          </details>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Informações adicionais (opcional)"
              rows={3}
              className={fieldClass}
            />
          </div>

          {errors.api && <p className="text-sm text-[var(--wq-danger)]">{errors.api}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              asChild
              className="text-[var(--wq-text)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-text)]"
            >
              <Link href="/clientes">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[var(--wq-action)] text-white hover:bg-[var(--wq-action)]/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando…
                </>
              ) : (
                "Salvar cliente"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
