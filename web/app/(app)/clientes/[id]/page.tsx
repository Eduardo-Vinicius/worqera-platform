"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getClienteByIdService } from "@/lib/apiService";
import Link from "next/link";

interface Cliente {
  id: string;
  nomeCompleto: string;
  cpf: string;
  telefone: string;
  email: string;
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  observacoes?: string;
}

export default function ClienteDetalhesPage() {
  const params = useParams();
  const id = decodeURIComponent(params?.id as string);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchCliente = async () => {
      try {
        setLoading(true);
        const data = await getClienteByIdService(id);
        setCliente(data);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar cliente");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCliente();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Carregando...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="max-w-xl mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Cliente não encontrado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-500 mb-4">{error || "Cliente não encontrado"}</p>
            <Link href="/clientes">
              <Button variant="outline">Voltar para lista de clientes</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Cliente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div><strong>Nome:</strong> {cliente.nomeCompleto}</div>
          <div><strong>CPF:</strong> {cliente.cpf}</div>
          <div><strong>Telefone:</strong> {cliente.telefone}</div>
          <div><strong>Email:</strong> {cliente.email}</div>
          <div>
            <strong>Endereço:</strong> {cliente.logradouro}, {cliente.numero}
            {cliente.complemento && `, ${cliente.complemento}`}
            <br />
            {cliente.bairro}, {cliente.cidade} - {cliente.estado}
            <br />
            CEP: {cliente.cep}
          </div>
          {cliente.observacoes && (
            <div><strong>Observações:</strong> {cliente.observacoes}</div>
          )}
          <Link href="/clientes">
            <Button variant="outline" className="mt-4">Voltar</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
