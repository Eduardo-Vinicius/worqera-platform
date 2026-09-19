"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Search, Upload, X, Plus } from "lucide-react"
import Link from "next/link"
import { createPedidoService, createClienteService, getClientesService, getPedidoIdFromCreateResponse, uploadPedidoItemFotosService } from "@/lib/apiService"
import { listServicesV1, listSectorsV1 } from "@/lib/apiV1"
import { normalizeWarranty } from "@/lib/warranty"
import {
  loadOrderTemplates,
  removeOrderTemplate,
  saveOrderTemplates,
  upsertOrderTemplate,
  type OrderTemplate,
} from "@/lib/orderTemplates"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AppHeader } from "@/components/shell/AppHeader"
import {
  emptyOrderItemDraft,
  filterFilledItems,
  mapItemsToCreatePayload,
  migrateDraftToItems,
  serializeItemsForDraft,
  servicesSum,
  suggestedTotal,
  validateOrderItems,
  type OrderItemDraft,
  type OrderItemPatch,
  type PhotoItem,
  type SelectedService,
} from "./orderItems"

// Fallback se o catálogo `/services` estiver vazio
const FALLBACK_SERVICES = [
  { id: "limpeza-simples", name: "Limpeza Simples", suggestedPrice: 30 },
  { id: "limpeza-completa", name: "Limpeza Completa", suggestedPrice: 50 },
  { id: "restauracao", name: "Restauração", suggestedPrice: 80 },
  { id: "reparo", name: "Reparo", suggestedPrice: 40 },
  { id: "customizacao", name: "Customização", suggestedPrice: 120 },
  { id: "pintura", name: "Pintura", suggestedPrice: 60 },
  { id: "troca-sola", name: "Troca de Sola", suggestedPrice: 70 },
  { id: "costura", name: "Costura", suggestedPrice: 35 },
]

// Acessórios disponíveis (vindos do env ou padrão)
const defaultAccessories = [
  "Cadarços originais",
  "Palmilhas",
  "Sola extra",
  "Etiquetas de marca",
  "Caixa original",
  "Sacola de proteção",
  "Manual de cuidados",
  "Certificado de garantia"
];

// Fallback de fluxo se a API de setores falhar
const FALLBACK_FLOW_SECTORS = [
  { id: "atendimento", name: "Atendimento", slug: "atendimento", isTerminal: false },
  { id: "sapataria", name: "Sapataria", slug: "sapataria", isTerminal: false },
  { id: "costura", name: "Costura", slug: "costura", isTerminal: false },
  { id: "lavagem", name: "Lavagem", slug: "lavagem", isTerminal: false },
  { id: "acabamento", name: "Acabamento", slug: "acabamento", isTerminal: false },
  { id: "pintura", name: "Pintura", slug: "pintura", isTerminal: false },
];

function dueInDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const RECENT_CLIENTS_KEY = "wq-recent-clients-v1"

type RecentClient = { id: string; name: string; phone?: string }

function loadRecentClients(): RecentClient[] {
  try {
    const raw = localStorage.getItem(RECENT_CLIENTS_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.slice(0, 6) : []
  } catch {
    return []
  }
}

function pushRecentClient(client: RecentClient) {
  try {
    const prev = loadRecentClients().filter((c) => c.id !== client.id)
    localStorage.setItem(RECENT_CLIENTS_KEY, JSON.stringify([client, ...prev].slice(0, 6)))
  } catch {}
}

export default function NewOrderPage() {
  const router = useRouter();
  const DRAFT_KEY = "new-order-draft-v1";
  const [formData, setFormData] = useState({
    clientId: "",
    expectedDate: "",
    department: "atendimento", // Departamento inicial fixo
    observations: "",
  })
  const [items, setItems] = useState([emptyOrderItemDraft()])
  const [activeItemIndex, setActiveItemIndex] = useState(0)
  const [flowObservation, setFlowObservation] = useState("");
  const [selectedFlowOptions, setSelectedFlowOptions] = useState<string[]>(["atendimento"]);
  const [flowSectors, setFlowSectors] = useState(FALLBACK_FLOW_SECTORS)
  const [prioridade, setPrioridade] = useState<string>("2")
  const [totalPrice, setTotalPrice] = useState(0)
  const [signalType, setSignalType] = useState("50") // "50", "100", "custom"
  const [signalValue, setSignalValue] = useState(0)
  const [hasWarranty, setHasWarranty] = useState(false)
  const [warrantyPrice, setWarrantyPrice] = useState(0) // Preço padrão da garantia
  const [selectedAccessories, setSelectedAccessories] = useState<string[]>([])
  const [customAccessory, setCustomAccessory] = useState("")
  const [clientSearch, setClientSearch] = useState("")
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [availableServices, setAvailableServices] = useState(FALLBACK_SERVICES);
  const [templates, setTemplates] = useState<OrderTemplate[]>([])
  const [showNewClient, setShowNewClient] = useState(false)
  const [savingClient, setSavingClient] = useState(false)
  const [newClient, setNewClient] = useState({
    nomeCompleto: "",
    telefone: "",
    cpf: "",
    email: "",
  })
  const [recentClients, setRecentClients] = useState<RecentClient[]>([])

  useEffect(() => {
    setTemplates(loadOrderTemplates())
    setRecentClients(loadRecentClients())
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listServicesV1()
        const list = (res.services || []).filter((s) => s.active !== false)
        if (!cancelled && list.length > 0) {
          setAvailableServices(
            list.map((s) => ({
              id: String(s._id || s.id || s.name),
              name: s.name,
              suggestedPrice: Number(s.defaultPrice) || 0,
            }))
          )
        }
      } catch {
        // keep fallback
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await listSectorsV1()
        const list = (res.sectors || [])
          .filter((s: any) => s.active !== false)
          .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
          .map((s: any) => ({
            id: String(s._id || s.id || s.slug || s.name),
            name: String(s.name || s.slug || "Setor"),
            slug: String(s.slug || s.name || "").toLowerCase(),
            isTerminal: Boolean(s.isTerminal),
          }))
        if (!cancelled && list.length) {
          setFlowSectors(list)
          setSelectedFlowOptions((prev) => {
            const kept = prev.filter((id) =>
              list.some((s) => s.id === id || s.slug === id)
            )
            if (kept.length) return kept
            const start = list.find((s) => !s.isTerminal) || list[0]
            return start ? [start.slug || start.id] : prev
          })
        }
      } catch {
        // keep fallback
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      setFormData((prev) => (prev.expectedDate ? prev : { ...prev, expectedDate: dueInDays(3) }))
      return
    }
    try {
      const draft = JSON.parse(raw);
      const { sneaker: _legacySneaker, ...restForm } = draft.formData || {};
      const nextForm = { ...restForm }
      if (!nextForm.expectedDate) nextForm.expectedDate = dueInDays(3)
      setFormData((prev) => ({ ...prev, ...nextForm }));
      setItems(migrateDraftToItems(draft));
      if (typeof draft.totalPrice === "number") setTotalPrice(draft.totalPrice);
      if (typeof draft.signalType === "string") setSignalType(draft.signalType);
      if (typeof draft.signalValue === "number") setSignalValue(draft.signalValue);
      if (typeof draft.hasWarranty === "boolean") setHasWarranty(draft.hasWarranty);
      if (typeof draft.warrantyPrice === "number") setWarrantyPrice(draft.warrantyPrice);
      if (Array.isArray(draft.selectedAccessories)) setSelectedAccessories(draft.selectedAccessories);
      if (typeof draft.flowObservation === "string") setFlowObservation(draft.flowObservation);
      if (Array.isArray(draft.selectedFlowOptions) && draft.selectedFlowOptions.length) {
        setSelectedFlowOptions(draft.selectedFlowOptions);
      }
      if (typeof draft.prioridade === "string") setPrioridade(draft.prioridade);
    } catch (err) {
      setFormData((prev) => (prev.expectedDate ? prev : { ...prev, expectedDate: dueInDays(3) }))
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      formData,
      items: serializeItemsForDraft(items),
      totalPrice,
      signalType,
      signalValue,
      hasWarranty,
      warrantyPrice,
      selectedAccessories,
      flowObservation,
      selectedFlowOptions,
      prioridade,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [formData, items, totalPrice, signalType, signalValue, hasWarranty, warrantyPrice, selectedAccessories, flowObservation, selectedFlowOptions, prioridade]);

  useEffect(() => {
    async function fetchdata() {
      try {
        const clientsData = await getClientesService({ limit: 200 });
        setClients(clientsData.data);
      } catch (err) {
        toast.error("Erro ao carregar clientes");
      } finally {
        setLoadingClients(false);
      }
    }
    fetchdata();
  }, []);

  // Fotos do tênis (armazenamos também a preview para poder revogar URLs e evitar leaks)
  const MAX_PHOTOS = parseInt(process.env.NEXT_PUBLIC_MAX_PHOTOS || "8", 10) || 8;
  const MAX_FILE_MB = 5; // limite por arquivo antes da compressão
  const [uploadProgress, setUploadProgress] = useState(0)

  const updateItemsAndTotal = (updater: (prev: OrderItemDraft[]) => OrderItemDraft[]) => {
    setItems((prev) => {
      const next = updater(prev)
      const newTotal = suggestedTotal(next, hasWarranty, warrantyPrice)
      setTotalPrice(newTotal)
      if (signalType === "50") setSignalValue(newTotal * 0.5)
      else if (signalType === "100") setSignalValue(newTotal)
      return next
    })
  }

  const patchItem = (itemIndex: number, patch: OrderItemPatch) => {
    setItems((prev) =>
      prev.map((item, index) => (index === itemIndex ? { ...item, ...patch } : item))
    )
  }

  const addItem = () => {
    setItems((prev) => {
      const next = [...prev, emptyOrderItemDraft()]
      setActiveItemIndex(next.length - 1)
      return next
    })
    toast.message("Novo par adicionado — preencha modelo e serviços")
  }

  const removeItem = (itemIndex: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      const target = prev[itemIndex]
      target?.photos.forEach((photo) => {
        if (photo.preview) URL.revokeObjectURL(photo.preview)
      })
      const next = prev.filter((_, index) => index !== itemIndex)
      const newTotal = suggestedTotal(next, hasWarranty, warrantyPrice)
      setTotalPrice(newTotal)
      if (signalType === "50") setSignalValue(newTotal * 0.5)
      else if (signalType === "100") setSignalValue(newTotal)
      setActiveItemIndex((cur) => {
        if (cur === itemIndex) return Math.max(0, itemIndex - 1)
        if (cur > itemIndex) return cur - 1
        return Math.min(cur, next.length - 1)
      })
      return next
    })
  }

  // Manipuladores de upload/remover foto
  // Faz resize/compress antes de adicionar ao estado para reduzir uso de memória
  const MAX_DIMENSION = 1280; // px
  const JPEG_QUALITY = 0.75;

  const handlePhotoUpload = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    const currentCount = items.find((item) => item.id === itemId)?.photos.length || 0;

    const slotsLeft = Math.max(0, MAX_PHOTOS - currentCount);
    const toProcess = filesArray.slice(0, slotsLeft);

    const processed: PhotoItem[] = [];

    for (const f of toProcess) {
      // skip huge files (even though we'll try to compress)
      if (f.size > MAX_FILE_MB * 1024 * 1024 * 10) {
        // very big file (safety) -> skip
        continue;
      }

      try {
        // try createImageBitmap for efficient decode
        const bitmap = await createImageBitmap(f as Blob);
        const maxSide = Math.max(bitmap.width, bitmap.height);
        const scale = maxSide > MAX_DIMENSION ? MAX_DIMENSION / maxSide : 1;
        const w = Math.round(bitmap.width * scale);
        const h = Math.round(bitmap.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          bitmap.close?.();
          continue;
        }
        ctx.drawImage(bitmap, 0, 0, w, h);
        bitmap.close?.();

        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
        );

        if (!blob) continue;

        const newFile = new File([blob], f.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" });
        const preview = URL.createObjectURL(blob);
        processed.push({ file: newFile, preview });
      } catch (err) {
        // fallback: use original file but still create preview URL
        const preview = URL.createObjectURL(f);
        processed.push({ file: f, preview });
      }
    }

    if (processed.length === 0) {
      // clear input so user can re-select same files if needed
      e.currentTarget.value = "";
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item
        const merged = [...item.photos, ...processed].slice(0, MAX_PHOTOS);
        if (!merged.some(p => p.isCover)) {
          if (merged[0]) merged[0].isCover = true;
        }
        return { ...item, photos: merged }
      })
    );

    // limpa input para permitir re-seleção do mesmo arquivo
    e.currentTarget.value = "";
  };

  const removePhoto = (itemIndex: number, index: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item
        const target = item.photos[index];
        if (target?.preview) URL.revokeObjectURL(target.preview);
        const next = item.photos.filter((_, i) => i !== index);
        if (next.length && !next.some(p => p.isCover)) {
          next[0].isCover = true;
        }
        return { ...item, photos: next }
      })
    );
  };

  const markAsCover = (itemIndex: number, index: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === itemIndex
          ? { ...item, photos: item.photos.map((p, i) => ({ ...p, isCover: i === index })) }
          : item
      )
    );
  };

  const movePhoto = (itemIndex: number, from: number, to: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== itemIndex) return item
        const arr = [...item.photos];
        const [photo] = arr.splice(from, 1);
        arr.splice(to, 0, photo);
        return { ...item, photos: arr }
      })
    );
  };
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadStatus, setUploadStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [uploadMessage, setUploadMessage] = useState("")

  const searchQuery = clientSearch.trim().toLowerCase()
  const searchDigits = clientSearch.replace(/\D/g, "")
  const filteredClients = clients.filter((client: any) => {
    if (!searchQuery) return false
    const nome = String(client.nomeCompleto || client.name || "").toLowerCase()
    const phone = String(client.telefone || client.phone || "")
    const cpf = String(client.cpf || "")
    const phoneDigits = phone.replace(/\D/g, "")
    const cpfDigits = cpf.replace(/\D/g, "")
    return (
      nome.includes(searchQuery) ||
      phone.toLowerCase().includes(searchQuery) ||
      cpf.toLowerCase().includes(searchQuery) ||
      (searchDigits.length > 0 && (phoneDigits.includes(searchDigits) || cpfDigits.includes(searchDigits)))
    )
  })

  const selectedClient = clients.find((client: any) => client.id === formData.clientId);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const selectClient = (client: any) => {
    const id = String(client.id || client._id || "")
    if (!id) return
    handleSelectChange("clientId", id)
    setClientSearch("")
    const entry: RecentClient = {
      id,
      name: String(client.nomeCompleto || client.name || "Cliente"),
      phone: String(client.telefone || client.phone || ""),
    }
    pushRecentClient(entry)
    setRecentClients(loadRecentClients())
  }

  const saveNewClient = async () => {
    const nomeCompleto = newClient.nomeCompleto.trim()
    const telefone = newClient.telefone.trim()
    if (!nomeCompleto) {
      toast.error("Nome é obrigatório")
      return
    }
    if (!telefone) {
      toast.error("Telefone é obrigatório")
      return
    }
    setSavingClient(true)
    try {
      const created = await createClienteService({
        nomeCompleto,
        telefone,
        cpf: newClient.cpf.trim(),
        email: newClient.email.trim(),
        cep: "",
        logradouro: "",
        numero: "",
        bairro: "",
        cidade: "",
        estado: "",
      })
      const listRes = await getClientesService({ forceRefresh: true, limit: 200 })
      const list = listRes.data
      setClients(list)
      const createdId = String(created?.id || created?._id || "")
      const match =
        list.find((client: any) => client.id === createdId) ||
        list.find((client: any) => String(client.nomeCompleto || "").toLowerCase() === nomeCompleto.toLowerCase())
      const email = newClient.email.trim()
      if (match?.id) {
        selectClient(match)
      } else if (createdId) {
        const fallback = {
          id: createdId,
          nomeCompleto,
          telefone,
          email: email || null,
        }
        setClients((prev: any[]) =>
          prev.some((c) => String(c.id) === createdId) ? prev : [fallback, ...prev]
        )
        selectClient(fallback)
      }
      setShowNewClient(false)
      setNewClient({ nomeCompleto: "", telefone: "", cpf: "", email: "" })
      setClientSearch("")
      toast.success("Cliente cadastrado")
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cadastrar cliente")
    } finally {
      setSavingClient(false)
    }
  }

  const toggleFlowOption = (id: string) => {
    setSelectedFlowOptions((prev) => {
      const sector = flowSectors.find((s) => s.id === id || s.slug === id)
      const key = sector?.slug || sector?.id || id
      if (prev.includes(key) || prev.includes(id)) {
        return prev.filter((item) => item !== key && item !== id)
      }
      return [...prev, key]
    })
  }

  // Funções para gerenciar serviços selecionados
  const applyTemplate = (tpl: OrderTemplate) => {
    const selected = availableServices
      .filter((s) => tpl.serviceIds.includes(s.id))
      .map((s) => ({
        id: s.id,
        name: s.name,
        price: Number(s.suggestedPrice) || 0,
        description: "",
      }))
    setItems((prev) => {
      const next = [...prev]
      const first = { ...next[0], selectedServices: selected }
      next[0] = first
      const newTotal = suggestedTotal(next, hasWarranty || Boolean(tpl.hasWarranty), warrantyPrice)
      setTotalPrice(newTotal)
      if (signalType === "50") setSignalValue(newTotal * 0.5)
      if (signalType === "100") setSignalValue(newTotal)
      return next
    })
    if (tpl.flowOptionIds.length) setSelectedFlowOptions(tpl.flowOptionIds)
    if (tpl.accessories.length) setSelectedAccessories(tpl.accessories)
    if (tpl.hasWarranty) setHasWarranty(true)
    toast.success(`Template “${tpl.name}” aplicado`)
  }

  const saveCurrentAsTemplate = () => {
    const name = window.prompt("Nome do template (ex.: Limpeza completa)")
    if (!name?.trim()) return
    const serviceIds = items[0]?.selectedServices.map((s) => s.id) || []
    if (!serviceIds.length) {
      toast.error("Selecione ao menos um serviço no 1º par")
      return
    }
    const next = upsertOrderTemplate(templates, {
      name: name.trim(),
      serviceIds,
      flowOptionIds: selectedFlowOptions,
      accessories: selectedAccessories,
      hasWarranty,
    })
    setTemplates(next)
    saveOrderTemplates(next)
    toast.success("Template salvo neste navegador")
  }

  const deleteTemplate = (id: string) => {
    const next = removeOrderTemplate(templates, id)
    setTemplates(next)
    saveOrderTemplates(next)
  }

  const toggleService = (itemIndex: number, serviceId: string, checked: boolean) => {
    const service = availableServices.find(s => s.id === serviceId);
    updateItemsAndTotal((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item
        if (checked) {
          if (!service || item.selectedServices.find(s => s.id === serviceId)) return item
          const newService: SelectedService = {
            id: service.id,
            name: service.name,
            price: service.suggestedPrice,
            description: ""
          };
          return { ...item, selectedServices: [...item.selectedServices, newService] }
        }
        return { ...item, selectedServices: item.selectedServices.filter(s => s.id !== serviceId) }
      })
    )
  };

  const updateService = (itemIndex: number, serviceId: string, field: 'price' | 'description', value: string | number) => {
    updateItemsAndTotal((prev) =>
      prev.map((item, index) => {
        if (index !== itemIndex) return item
        return {
          ...item,
          selectedServices: item.selectedServices.map((service) =>
            service.id === serviceId ? { ...service, [field]: value } : service
          ),
        }
      })
    )
  };

  const getTotalPrice = () => {
    return totalPrice;
  };

  // Função para atualizar valor do sinal baseado no tipo
  const updateSignalValue = (total: number) => {
    if (signalType === "50") {
      setSignalValue(total * 0.5);
    } else if (signalType === "100") {
      setSignalValue(total);
    }
    // Para "custom", mantém o valor atual
  };

  // Handler para mudança de preço total
  const handleTotalPriceChange = (newTotal: number) => {
    setTotalPrice(newTotal);
    updateSignalValue(newTotal);
  };

  // Handler para mudança de tipo de sinal
  const handleSignalTypeChange = (type: string) => {
    setSignalType(type);
    if (type === "50") {
      setSignalValue(totalPrice * 0.5);
    } else if (type === "100") {
      setSignalValue(totalPrice);
    }
    // Para "custom", mantém o valor atual
  };

  // Função para toggle da garantia
  const toggleWarranty = (checked: boolean) => {
    setHasWarranty(checked);
    const newTotal = suggestedTotal(items, checked, warrantyPrice);
    setTotalPrice(newTotal);
    updateSignalValue(newTotal);
  };

  // Função para atualizar preço da garantia
  const handleWarrantyPriceChange = (newPrice: number) => {
    setWarrantyPrice(newPrice);
    if (hasWarranty) {
      const newTotal = suggestedTotal(items, true, newPrice);
      setTotalPrice(newTotal);
      updateSignalValue(newTotal);
    }
  };

  // Função para toggle de acessório
  const toggleAccessory = (accessory: string, checked: boolean) => {
    if (checked) {
      setSelectedAccessories(prev => [...prev, accessory]);
    } else {
      setSelectedAccessories(prev => prev.filter(acc => acc !== accessory));
    }
  };

  // Função para adicionar acessório customizado
  const addCustomAccessory = () => {
    if (customAccessory.trim() && !selectedAccessories.includes(customAccessory.trim())) {
      setSelectedAccessories(prev => [...prev, customAccessory.trim()]);
      setCustomAccessory("");
    }
  };

  // Função para remover acessório
  const removeAccessory = (accessory: string) => {
    setSelectedAccessories(prev => prev.filter(acc => acc !== accessory));
  };

  const resetDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setFormData({
      clientId: "",
      expectedDate: dueInDays(3),
      department: "atendimento",
      observations: "",
    });
    items.forEach((item) => {
      item.photos.forEach((photo) => {
        if (photo.preview) URL.revokeObjectURL(photo.preview);
      });
    });
    setItems([emptyOrderItemDraft()]);
    setFlowObservation("");
    setSelectedFlowOptions(["atendimento"]);
    setTotalPrice(0);
    setSignalType("50");
    setSignalValue(0);
    setHasWarranty(false);
    setWarrantyPrice(0);
    setSelectedAccessories([]);
    setCustomAccessory("");
    setPrioridade("2");
    setClientSearch("");
    setShowNewClient(false);
    setNewClient({ nomeCompleto: "", telefone: "", cpf: "", email: "" });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.clientId || !selectedClient) {
      newErrors.clientId = "Cliente é obrigatório"
    }

    Object.assign(newErrors, validateOrderItems(items))

    if (!formData.expectedDate) {
      newErrors.expectedDate = "Data prevista é obrigatória"
    }

    if (!formData.department) {
      newErrors.department = "Departamento é obrigatório"
    }

    // Validar valor de sinal
    if (signalValue < 0 || signalValue > totalPrice) {
      newErrors.signal = "Valor de sinal deve estar entre R$ 0,00 e o valor total"
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

    const filledItems = filterFilledItems(items)
    const tooManyPhotos = filledItems.some((item) => item.photos.length > MAX_PHOTOS)
    if (tooManyPhotos) {
      toast.error(`Máximo de ${MAX_PHOTOS} fotos por item`);
      return;
    }

    setIsLoading(true);
    setErrors({});
    setUploadStatus("idle");
    setUploadMessage("");
    setUploadProgress(0);
    let uploadInProgress = false;
    let progressTimer: NodeJS.Timeout | null = null;

    try {
      // Preparar dados de garantia (nível pedido) — data = fim (+3 meses)
      const garantiaData = normalizeWarranty({
        ativa: hasWarranty,
        preco: hasWarranty ? warrantyPrice : 0,
        duracao: hasWarranty ? "3 meses" : "",
      })

      // Calcular valores de sinal e restante
      const valorRestante = Math.max(0, totalPrice - signalValue);

      // Observações apenas com o texto inserido pelo usuário
      const observacoesFinais = formData.observations || '';

      const flowSelections = selectedFlowOptions
        .map((opt) => {
          const found = flowSectors.find(
            (s) => s.id === opt || s.slug === opt || s.name.toLowerCase() === opt.toLowerCase()
          )
          if (found) return { id: found.slug || found.id, nome: found.name }
          return { id: opt, nome: opt }
        })
        .filter(Boolean) as Array<{ id: string; nome: string }>

      const observacoesFluxoPayload = flowObservation.trim()
        ? [{ observacao: flowObservation.trim() }]
        : [];

      const payload: any = {
        clienteId: formData.clientId,
        clientId: formData.clientId,
        clientName: selectedClient?.nomeCompleto || "",
        clientEmail:
          selectedClient?.email ||
          selectedClient?.clientEmail ||
          "",
        items: mapItemsToCreatePayload(filledItems),
        fotos: [],
        precoTotal: getTotalPrice(),
        valorSinal: signalValue,
        valorRestante: valorRestante,
        dataPrevistaEntrega: formData.expectedDate,
        departamento: formData.department,
        observacoes: observacoesFinais,
        prioridade: Number(prioridade),
        garantia: garantiaData,
        acessorios: selectedAccessories,
        // v1 business status (not sector/column name — that lives in currentSectorId)
        status: "open",
      };

      if (flowSelections.length > 0) {
        payload.departamentosSelecionados = flowSelections;
      }
      if (observacoesFluxoPayload.length > 0) {
        payload.observacoesFluxo = observacoesFluxoPayload;
      }

      const createdPedidoResponse = await createPedidoService(payload);

      const itemsWithPhotos = filledItems
        .map((item, index) => ({ index, files: item.photos.map((photo) => photo.file) }))
        .filter((entry) => entry.files.length > 0)

      if (itemsWithPhotos.length > 0) {
        const pedidoId = getPedidoIdFromCreateResponse(createdPedidoResponse);
        if (!pedidoId) {
          throw new Error("Pedido criado, mas não foi possível identificar o ID para upload das fotos");
        }

        uploadInProgress = true;
        setUploadStatus("loading");
        setUploadMessage("Enviando fotos...");
        setUploadProgress(10);
        progressTimer = setInterval(() => {
          setUploadProgress((prev) => Math.min(prev + 10, 90));
        }, 400);
        for (const entry of itemsWithPhotos) {
          await uploadPedidoItemFotosService(pedidoId, entry.index, entry.files);
        }
        uploadInProgress = false;
        setUploadStatus("success");
        setUploadMessage("Fotos enviadas com sucesso.");
        setUploadProgress(100);
      }

      const hasEmail = Boolean(
        selectedClient?.email || selectedClient?.clientEmail
      )
      toast.success(
        hasEmail
          ? "Pedido criado — e-mail com PDF e link público a caminho"
          : "Pedido criado com sucesso!"
      )
      setIsLoading(false);
      // revoke previews to free memory
      items.forEach((item) => {
        item.photos.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview); });
      });
      localStorage.removeItem(DRAFT_KEY);
      const pedidoId = getPedidoIdFromCreateResponse(createdPedidoResponse);
      if (pedidoId) {
        router.push(`/pedidos/${pedidoId}/sucesso`);
      } else {
        router.push("/kanban");
      }
    } catch (err: any) {
      setIsLoading(false);
      if (uploadInProgress) {
        setUploadStatus("error");
        setUploadMessage(err.message || "Erro ao enviar fotos");
      }
      const errMsg = err.message || "Erro ao criar pedido";
      setErrors({ api: errMsg });
      toast.error(errMsg);
    }
    finally {
      if (progressTimer) clearInterval(progressTimer);
    }
  }

  const itemsServicesTotal = servicesSum(items)
  const remaining = Math.max(0, totalPrice - signalValue)

  const renderSubmitButton = () => (
    <Button
      type="submit"
      disabled={isLoading}
      className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90 text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Criando...
        </>
      ) : (
        "Criar pedido"
      )}
    </Button>
  )

  return (
    <div className="-mx-3 -mt-4 sm:-mx-5 sm:-mt-6 md:-mx-8 md:-mt-7">
      <AppHeader
        title="Novo pedido"
        subtitle="Cliente, itens e pagamento no balcão"
        actions={
          <Button asChild variant="outline" size="sm" className="rounded-[10px]">
            <Link href="/pedidos">Voltar à lista</Link>
          </Button>
        }
      />

          <div className="mx-auto max-w-[1100px] px-5 py-6 pb-28 md:px-8">
        <div className="mb-4 rounded-2xl border border-[var(--wq-border)] bg-white p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--wq-text-muted)]">
              Pedido rápido
            </p>
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-[8px] text-xs" onClick={saveCurrentAsTemplate}>
              Salvar template
            </Button>
          </div>
          {templates.length === 0 ? (
            <p className="text-sm text-[var(--wq-text-muted)]">
              Monte serviços + fluxo e salve um template para reutilizar no balcão.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {templates.map((tpl) => (
                <div key={tpl.id} className="inline-flex items-center gap-1 rounded-full border border-[var(--wq-border)] bg-[var(--wq-paper)] pl-1">
                  <button
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--wq-text)] hover:bg-[var(--wq-brand-soft)]"
                  >
                    {tpl.name}
                  </button>
                  <button
                    type="button"
                    className="rounded-full px-2 py-1 text-xs text-[var(--wq-text-muted)] hover:text-[var(--wq-danger)]"
                    onClick={() => deleteTemplate(tpl.id)}
                    aria-label={`Remover ${tpl.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-8 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-5 md:p-6">
              {/* Block 1 — Cliente */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--wq-text)]">Cliente</h2>
                  <button
                    type="button"
                    className="text-sm font-medium text-[var(--wq-brand)] underline-offset-2 hover:underline"
                    onClick={() => setShowNewClient((open) => !open)}
                  >
                    {showNewClient ? "Fechar" : "+ Novo cliente"}
                  </button>
                </div>

                {selectedClient ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-brand-soft)] px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--wq-text)]">
                        {selectedClient.nomeCompleto || selectedClient.name}
                      </p>
                      <p className="truncate text-xs text-[var(--wq-text-muted)]">
                        {[
                          selectedClient.telefone || selectedClient.phone,
                          selectedClient.email,
                          selectedClient.cpf,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "Sem telefone/e-mail/CPF"}
                      </p>
                      {!(selectedClient.email || selectedClient.clientEmail) ? (
                        <p className="mt-1 text-[11px] text-[var(--wq-warn)]">
                          Sem e-mail — não enviaremos PDF/link automático. Cadastre o e-mail no cliente.
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-[var(--wq-text-muted)]">
                          Ao criar: e-mail com PDF + link público de acompanhamento.
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-sm font-medium text-[var(--wq-brand)] underline-offset-2 hover:underline"
                      onClick={() => {
                        handleSelectChange("clientId", "")
                        setClientSearch("")
                      }}
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {!clientSearch && recentClients.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {recentClients.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() =>
                              selectClient({
                                id: c.id,
                                nomeCompleto: c.name,
                                telefone: c.phone,
                              })
                            }
                            className="rounded-full border border-[var(--wq-border)] bg-[var(--wq-paper)] px-3 py-1 text-xs font-medium text-[var(--wq-text)] hover:border-[var(--wq-brand)]/40"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--wq-text-muted)]" />
                      <Input
                        placeholder="Buscar por nome, telefone ou CPF"
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        className="h-12 pl-11 text-base"
                        autoComplete="off"
                      />
                    </div>
                    {loadingClients && (
                      <p className="text-xs text-[var(--wq-text-muted)]">Carregando clientes…</p>
                    )}
                    {clientSearch && (
                      <div className="max-h-56 overflow-y-auto rounded-xl border border-[var(--wq-border)]">
                        {filteredClients.map((client) => (
                          <button
                            type="button"
                            key={client.id}
                            className={`flex w-full flex-col items-start gap-0.5 border-b border-[var(--wq-border)] px-3 py-1.5 text-left last:border-b-0 hover:bg-[var(--wq-paper)] ${
                              formData.clientId === client.id ? "bg-[var(--wq-brand-soft)]" : ""
                            }`}
                            onClick={() => selectClient(client)}
                          >
                            <span className="text-sm font-medium text-[var(--wq-text)]">
                              {client.nomeCompleto || client.name}
                            </span>
                            <span className="text-xs text-[var(--wq-text-muted)]">
                              {[client.telefone || client.phone, client.cpf].filter(Boolean).join(" · ") || "Sem telefone/CPF"}
                            </span>
                          </button>
                        ))}
                        {filteredClients.length === 0 && (
                          <div className="px-3 py-2 text-sm text-[var(--wq-text-muted)]">Nenhum cliente encontrado</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {showNewClient && (
                  <div className="space-y-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-3">
                    <p className="text-sm font-medium text-[var(--wq-text)]">Cadastro rápido</p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label htmlFor="new-client-name">Nome *</Label>
                        <Input
                          id="new-client-name"
                          value={newClient.nomeCompleto}
                          onChange={(e) => setNewClient((prev) => ({ ...prev, nomeCompleto: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void saveNewClient()
                            }
                          }}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-client-phone">Telefone *</Label>
                        <Input
                          id="new-client-phone"
                          value={newClient.telefone}
                          onChange={(e) => setNewClient((prev) => ({ ...prev, telefone: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault()
                              void saveNewClient()
                            }
                          }}
                          placeholder="(11) 99999-9999"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-client-cpf">CPF</Label>
                        <Input
                          id="new-client-cpf"
                          value={newClient.cpf}
                          onChange={(e) => setNewClient((prev) => ({ ...prev, cpf: e.target.value }))}
                          placeholder="Opcional"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="new-client-email">Email (PDF + link do pedido)</Label>
                        <Input
                          id="new-client-email"
                          type="email"
                          value={newClient.email}
                          onChange={(e) => setNewClient((prev) => ({ ...prev, email: e.target.value }))}
                          placeholder="cliente@email.com"
                        />
                        <p className="text-[11px] text-[var(--wq-text-muted)]">
                          Com e-mail, o cliente recebe o PDF e o link público ao criar o pedido.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-[10px] bg-[var(--wq-action)] hover:bg-[var(--wq-action)]/90"
                        disabled={savingClient}
                        onClick={() => void saveNewClient()}
                      >
                        {savingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar cliente"}
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => setShowNewClient(false)}>
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
                {errors.clientId && <p className="text-sm text-destructive">{errors.clientId}</p>}
              </section>

              {/* Block 2 — Pares */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--wq-text)]">
                      Pares
                    </h2>
                    <p className="text-xs text-[var(--wq-text-muted)]">
                      Um formulário por vez · {items.length}{" "}
                      {items.length === 1 ? "par" : "pares"}
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="rounded-[10px]" onClick={addItem}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Adicionar par
                  </Button>
                </div>
                {errors.items && <p className="text-sm text-destructive">{errors.items}</p>}

                {items.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((it, idx) => {
                      const label = it.sneaker?.trim() || `Par ${idx + 1}`
                      const active = idx === Math.min(activeItemIndex, items.length - 1)
                      return (
                        <button
                          key={it.id}
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={`max-w-[11rem] truncate rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                            active
                              ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                              : "border-[var(--wq-border)] bg-[var(--wq-paper)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/40"
                          }`}
                          title={label}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                {(() => {
                  const itemIndex = Math.min(activeItemIndex, Math.max(0, items.length - 1))
                  const item = items[itemIndex]
                  if (!item) return null
                  return (
                    <div className="space-y-4 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)]/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-[var(--wq-text)]">
                          Par {itemIndex + 1}
                          {item.sneaker?.trim() ? (
                            <span className="font-normal text-[var(--wq-text-muted)]"> · {item.sneaker}</span>
                          ) : null}
                        </h3>
                        {items.length > 1 ? (
                          <button
                            type="button"
                            className="text-sm text-[var(--wq-danger)] hover:underline"
                            onClick={() => removeItem(itemIndex)}
                          >
                            Remover este par
                          </button>
                        ) : null}
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`sneaker-${itemIndex}`}>Modelo *</Label>
                        <Input
                          id={`sneaker-${itemIndex}`}
                          value={item.sneaker}
                          onChange={(e) => {
                            patchItem(itemIndex, { sneaker: e.target.value })
                            if (errors.items) setErrors((prev) => ({ ...prev, items: "" }))
                          }}
                          placeholder="Ex: Nike Air Max 90"
                          className="bg-[var(--wq-surface)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor={`item-notes-${itemIndex}`}>Obs. deste par</Label>
                        <Input
                          id={`item-notes-${itemIndex}`}
                          value={item.notes}
                          onChange={(e) => patchItem(itemIndex, { notes: e.target.value })}
                          placeholder="Opcional"
                          className="bg-[var(--wq-surface)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Serviços</Label>
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {availableServices.map((service) => {
                            const isSelected = item.selectedServices.find((s) => s.id === service.id)
                            const inputId = `service-${itemIndex}-${service.id}`
                            return (
                              <label
                                key={service.id}
                                htmlFor={inputId}
                                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition ${
                                  isSelected
                                    ? "border-[var(--wq-brand)]/50 bg-[var(--wq-brand-soft)]"
                                    : "border-[var(--wq-border)] bg-[var(--wq-surface)] hover:bg-[var(--wq-paper)]"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  id={inputId}
                                  checked={!!isSelected}
                                  onChange={(e) => toggleService(itemIndex, service.id, e.target.checked)}
                                  className="h-4 w-4 rounded border-[var(--wq-border)] text-[var(--wq-action)] focus:ring-[var(--wq-action)]"
                                />
                                <span className="min-w-0 flex-1 leading-tight">
                                  <span className="block text-sm font-medium text-[var(--wq-text)]">{service.name}</span>
                                  <span className="text-xs text-[var(--wq-text-muted)]">
                                    R$ {service.suggestedPrice.toFixed(2)}
                                  </span>
                                </span>
                              </label>
                            )
                          })}
                        </div>

                        {item.selectedServices.length > 0 ? (
                          <div className="space-y-2 pt-1">
                            {item.selectedServices.map((service) => (
                              <div
                                key={service.id}
                                className="grid grid-cols-[1fr_auto] gap-2 rounded-lg border border-[var(--wq-border)] bg-[var(--wq-surface)] p-3 sm:grid-cols-[1fr_120px_auto]"
                              >
                                <div className="space-y-1 sm:col-span-1">
                                  <p className="text-sm font-medium text-[var(--wq-text)]">{service.name}</p>
                                  <Input
                                    value={service.description}
                                    onChange={(e) =>
                                      updateService(itemIndex, service.id, "description", e.target.value)
                                    }
                                    placeholder="Obs. do serviço"
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Preço</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={service.price}
                                    onChange={(e) =>
                                      updateService(itemIndex, service.id, "price", Number(e.target.value))
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <button
                                  type="button"
                                  className="self-end rounded-md p-2 text-[var(--wq-text-muted)] hover:bg-[var(--wq-paper)] hover:text-[var(--wq-danger)]"
                                  onClick={() => toggleService(itemIndex, service.id, false)}
                                  aria-label="Remover serviço"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <Label>Fotos</Label>
                        <div className="rounded-lg border border-dashed border-[var(--wq-border)] bg-[var(--wq-surface)] p-3 text-center">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            capture="environment"
                            onChange={(e) => handlePhotoUpload(item.id, e)}
                            className="hidden"
                            id={`photo-upload-${itemIndex}`}
                          />
                          <label
                            htmlFor={`photo-upload-${itemIndex}`}
                            className="inline-flex cursor-pointer items-center gap-2 text-sm text-[var(--wq-brand)] hover:underline"
                          >
                            <Upload className="h-4 w-4" />
                            Adicionar fotos (máx. {MAX_PHOTOS})
                          </label>
                        </div>

                        {item.photos.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {item.photos.map((photo, index) => (
                              <div
                                key={index}
                                className="group relative overflow-hidden rounded-lg border border-[var(--wq-border)]"
                                draggable
                                onDragStart={(e) => e.dataTransfer.setData("text/plain", index.toString())}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  const from = Number(e.dataTransfer.getData("text/plain"))
                                  if (!Number.isNaN(from)) movePhoto(itemIndex, from, index)
                                }}
                              >
                                <img
                                  src={photo.preview || "/placeholder.svg"}
                                  alt={`Foto ${index + 1}`}
                                  className="h-24 w-full object-cover"
                                />
                                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-[var(--wq-ink)]/55 p-1">
                                  <button
                                    type="button"
                                    className="rounded px-1.5 text-[10px] font-semibold text-white"
                                    onClick={() => markAsCover(itemIndex, index)}
                                  >
                                    {photo.isCover ? "Capa" : "Capa?"}
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded px-1.5 text-[10px] font-semibold text-white"
                                    onClick={() => removePhoto(itemIndex, index)}
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )
                })()}
              </section>

              {/* Block 2b — Rota e extras (sempre visível) */}
              <section className="space-y-4">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--wq-text)]">
                    Rota na oficina
                  </h2>
                  <p className="text-xs text-[var(--wq-text-muted)]">
                    Começa em Atendimento · a última etapa Final entra sozinha
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {flowSectors
                    .filter((s) => !s.isTerminal)
                    .map((sector) => {
                      const key = sector.slug || sector.id
                      const checked = selectedFlowOptions.includes(key) || selectedFlowOptions.includes(sector.id)
                      return (
                        <button
                          key={sector.id}
                          type="button"
                          onClick={() => toggleFlowOption(key)}
                          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                            checked
                              ? "border-[var(--wq-brand)] bg-[var(--wq-brand)] text-white"
                              : "border-[var(--wq-border)] bg-[var(--wq-surface)] text-[var(--wq-text)] hover:border-[var(--wq-brand)]/40"
                          }`}
                        >
                          {sector.name}
                        </button>
                      )
                    })}
                </div>
                {errors.department ? (
                  <p className="text-sm text-destructive">{errors.department}</p>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="flowObservation">Obs. do fluxo</Label>
                  <Textarea
                    id="flowObservation"
                    placeholder="Ex.: reforçar pintura nas laterais"
                    value={flowObservation}
                    onChange={(e) => setFlowObservation(e.target.value)}
                    className="min-h-[72px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Acessórios deixados</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {defaultAccessories.map((accessory) => {
                      const isSelected = selectedAccessories.includes(accessory)
                      return (
                        <button
                          key={accessory}
                          type="button"
                          onClick={() => toggleAccessory(accessory, !isSelected)}
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                            isSelected
                              ? "border-[var(--wq-brand)]/40 bg-[var(--wq-brand-soft)] text-[var(--wq-text)]"
                              : "border-[var(--wq-border)] text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/30"
                          }`}
                        >
                          {accessory}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Outro acessório…"
                      value={customAccessory}
                      onChange={(e) => setCustomAccessory(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          addCustomAccessory()
                        }
                      }}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      onClick={addCustomAccessory}
                      disabled={!customAccessory.trim()}
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedAccessories.length > 0 &&
                  selectedAccessories.some((a) => !defaultAccessories.includes(a)) ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAccessories
                        .filter((a) => !defaultAccessories.includes(a))
                        .map((accessory) => (
                          <span
                            key={accessory}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--wq-brand-soft)] px-2.5 py-1 text-xs"
                          >
                            {accessory}
                            <button type="button" onClick={() => removeAccessory(accessory)} aria-label="Remover">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Block 3 — Pagamento + enviar */}
              <section className="space-y-4">
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--wq-text)]">Pagamento</h2>

                <div className="space-y-3 rounded-xl border border-[var(--wq-border)] bg-[var(--wq-paper)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="warranty"
                        checked={hasWarranty}
                        onChange={(e) => toggleWarranty(e.target.checked)}
                        className="h-4 w-4 rounded border-[var(--wq-border)] text-[var(--wq-action)] focus:ring-[var(--wq-action)]"
                      />
                      <label htmlFor="warranty" className="cursor-pointer font-medium">
                        Garantia de 3 meses
                      </label>
                    </div>
                    <span className="text-sm text-[var(--wq-text-muted)]">Proteção adicional</span>
                  </div>
                  {hasWarranty && (
                    <div className="grid grid-cols-1 gap-3 border-t border-[var(--wq-border)] pt-3 md:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="warrantyPrice">Preço da garantia (R$)</Label>
                        <Input
                          id="warrantyPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={warrantyPrice}
                          onChange={(e) => handleWarrantyPriceChange(Number(e.target.value))}
                          placeholder="0.00"
                          className="bg-[var(--wq-surface)]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm text-[var(--wq-text-muted)]">Cobertura</Label>
                        <div className="rounded-lg bg-[var(--wq-surface)] p-2 text-sm text-[var(--wq-text)]">
                          <p>Retrabalho gratuito por defeitos</p>
                          <p>Troca de peças com defeito</p>
                          <p>Suporte técnico especializado</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {(itemsServicesTotal > 0 || hasWarranty) && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="totalPrice">Preço total (R$) *</Label>
                        <Input
                          id="totalPrice"
                          type="number"
                          step="0.01"
                          min="0"
                          value={totalPrice}
                          onChange={(e) => handleTotalPriceChange(Number(e.target.value))}
                          placeholder="0.00"
                          className="w-36 text-lg font-semibold"
                        />
                      </div>
                      <div className="text-right text-sm text-[var(--wq-text-muted)]">
                        <p>Soma dos serviços: R$ {itemsServicesTotal.toFixed(2)}</p>
                        {hasWarranty && <p>Garantia (3 meses): R$ {warrantyPrice.toFixed(2)}</p>}
                        <p className="font-semibold text-[var(--wq-text)]">
                          Subtotal: R$ {suggestedTotal(items, hasWarranty, warrantyPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Valor de sinal</Label>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="signal50"
                              name="signalType"
                              value="50"
                              checked={signalType === "50"}
                              onChange={(e) => handleSignalTypeChange(e.target.value)}
                              className="h-4 w-4 border-[var(--wq-border)] text-[var(--wq-action)]"
                            />
                            <label htmlFor="signal50" className="cursor-pointer text-sm font-medium">
                              50% do total
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="signal100"
                              name="signalType"
                              value="100"
                              checked={signalType === "100"}
                              onChange={(e) => handleSignalTypeChange(e.target.value)}
                              className="h-4 w-4 border-[var(--wq-border)] text-[var(--wq-action)]"
                            />
                            <label htmlFor="signal100" className="cursor-pointer text-sm font-medium">
                              100% do total (à vista)
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              id="signalCustom"
                              name="signalType"
                              value="custom"
                              checked={signalType === "custom"}
                              onChange={(e) => handleSignalTypeChange(e.target.value)}
                              className="h-4 w-4 border-[var(--wq-border)] text-[var(--wq-action)]"
                            />
                            <label htmlFor="signalCustom" className="cursor-pointer text-sm font-medium">
                              Valor personalizado
                            </label>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="signalValue">Sinal (R$)</Label>
                          <Input
                            id="signalValue"
                            type="number"
                            step="0.01"
                            min="0"
                            max={totalPrice}
                            value={signalValue}
                            onChange={(e) => setSignalValue(Number(e.target.value))}
                            placeholder="0.00"
                            disabled={signalType !== "custom"}
                            className={`text-lg font-semibold ${signalType !== "custom" ? "bg-[var(--wq-paper)]" : ""}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm text-[var(--wq-text-muted)]">Restante</Label>
                          <div className="rounded-lg bg-[var(--wq-paper)] p-3 text-center">
                            <p className="text-lg font-semibold text-[var(--wq-text)]">R$ {remaining.toFixed(2)}</p>
                            <p className="text-xs text-[var(--wq-text-muted)]">
                              {signalValue >= totalPrice ? "Pago integralmente" : "A pagar na entrega"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {errors.services && <p className="text-sm text-destructive">{errors.services}</p>}
                {errors.signal && <p className="text-sm text-destructive">{errors.signal}</p>}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="expectedDate">Data prevista *</Label>
                    <Input
                      id="expectedDate"
                      name="expectedDate"
                      type="date"
                      value={formData.expectedDate}
                      onChange={handleInputChange}
                      className={errors.expectedDate ? "border-destructive" : ""}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { d: 3, label: "+3 dias" },
                        { d: 5, label: "+5 dias" },
                        { d: 7, label: "+7 dias" },
                      ].map((opt) => (
                        <button
                          key={opt.d}
                          type="button"
                          className="rounded-full border border-[var(--wq-border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--wq-text-muted)] hover:border-[var(--wq-brand)]/40 hover:text-[var(--wq-text)]"
                          onClick={() => {
                            handleSelectChange("expectedDate", dueInDays(opt.d))
                            if (errors.expectedDate) {
                              setErrors((prev) => ({ ...prev, expectedDate: "" }))
                            }
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {errors.expectedDate && <p className="text-sm text-destructive">{errors.expectedDate}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select value={prioridade} onValueChange={(value) => setPrioridade(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Alta (I) - Urgente</SelectItem>
                        <SelectItem value="2">Média (II) - Normal</SelectItem>
                        <SelectItem value="3">Baixa (III) - Sem pressa</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[var(--wq-text-muted)]">Se não informado, assume Média (II).</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="observations">Observações gerais</Label>
                  <Textarea
                    id="observations"
                    name="observations"
                    value={formData.observations}
                    onChange={handleInputChange}
                    placeholder="Observações adicionais sobre o pedido..."
                    rows={2}
                  />
                </div>

                {(uploadStatus !== "idle" || uploadMessage) && (
                  <div className="space-y-2">
                    <p
                      className={`text-sm ${
                        uploadStatus === "error"
                          ? "text-[var(--wq-danger)]"
                          : uploadStatus === "success"
                            ? "text-[var(--wq-success)]"
                            : "text-[var(--wq-text-muted)]"
                      }`}
                    >
                      {uploadStatus === "loading" ? "Fazendo upload das fotos..." : uploadMessage}
                    </p>
                    {uploadStatus === "loading" && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--wq-paper)]">
                        <div
                          className="h-full bg-[var(--wq-action)]"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="hidden gap-3 pt-2 lg:flex">
                  <Link href="/pedidos">
                    <Button type="button" variant="outline">
                      Cancelar
                    </Button>
                  </Link>
                  <Button type="button" variant="outline" onClick={resetDraft}>
                    Limpar rascunho
                  </Button>
                </div>
              </section>
            </div>

            <aside className="hidden lg:block">
              <div className="sticky top-20 space-y-3 rounded-2xl border border-[var(--wq-border)] bg-[var(--wq-surface)] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--wq-text-muted)]">Resumo</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[var(--wq-text-muted)]">Total</span>
                    <span className="font-semibold">R$ {getTotalPrice().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--wq-text-muted)]">Sinal</span>
                    <span className="font-semibold">R$ {signalValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--wq-text-muted)]">Restante</span>
                    <span className="font-semibold">R$ {remaining.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--wq-text-muted)]">Pares</span>
                    <span className="font-semibold">{items.length}</span>
                  </div>
                </div>
                <div className="pt-1">{renderSubmitButton()}</div>
              </div>
            </aside>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--wq-border)] bg-[color-mix(in_srgb,var(--wq-surface)_92%,transparent)] px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-4 md:left-[246px]">
            <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-2 sm:gap-3">
              <div className="min-w-0 flex-1 text-xs text-[var(--wq-text-muted)]">
                <p className="truncate font-semibold text-[var(--wq-text)]">
                  Total R$ {getTotalPrice().toFixed(2)} · Sinal R$ {signalValue.toFixed(2)}
                </p>
                <p className="truncate">
                  Restante R$ {remaining.toFixed(2)} · {items.length} {items.length === 1 ? "par" : "pares"}
                </p>
              </div>
              {renderSubmitButton()}
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
