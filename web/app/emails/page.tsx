'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getEmailLogsService,
  getEmailSummaryService,
  getEmailStatisticsService,
  EmailLog,
  EmailSummary,
  EmailStatistics,
  EmailLogsResponse,
} from '@/lib/apiService';

const EMAIL_TIPOS = [
  { value: 'confirmacao', label: 'Confirmação' },
  { value: 'atualizacao', label: 'Atualização' },
  { value: 'conclusao', label: 'Conclusão' },
  { value: 'coleta', label: 'Coleta' },
  { value: 'notificacao', label: 'Notificação' },
  { value: 'outro', label: 'Outro' },
];

const EMAIL_STATUS = [
  { value: 'sucesso', label: 'Sucesso' },
  { value: 'erro', label: 'Erro' },
  { value: 'pendente', label: 'Pendente' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'sucesso':
      return 'bg-green-100 text-green-800';
    case 'erro':
      return 'bg-red-100 text-red-800';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
}

function formatDuration(ms?: number) {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

interface FilterState {
  email: string;
  pedidoId: string;
  codigoPedido: string;
  status: string;
  tipo: string;
  dataInicio: string;
  dataFim: string;
}

export default function EmailsPage() {
  const [filters, setFilters] = useState<FilterState>({
    email: '',
    pedidoId: '',
    codigoPedido: '',
    status: '',
    tipo: '',
    dataInicio: '',
    dataFim: '',
  });

  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [statistics, setStatistics] = useState<EmailStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Fetch email logs
  const fetchEmails = useCallback(async (pageToken?: string) => {
    try {
      setLoading(true);
      const params: Record<string, string | number | undefined> = {};

      if (filters.email.trim()) params.email = filters.email.trim();
      if (filters.pedidoId.trim()) params.pedidoId = filters.pedidoId.trim();
      if (filters.codigoPedido.trim()) params.codigoPedido = filters.codigoPedido.trim();
      if (filters.status) params.status = filters.status;
      if (filters.tipo) params.tipo = filters.tipo;
      if (filters.dataInicio) params.dataInicio = filters.dataInicio;
      if (filters.dataFim) params.dataFim = filters.dataFim;

      params.limit = 50;
      if (pageToken) params.lastKey = pageToken;

      const response: EmailLogsResponse = await getEmailLogsService(
        params as Parameters<typeof getEmailLogsService>[0]
      );

      setEmails(response.data);
      setNextToken(response.nextToken);
      setTotalCount(response.total || response.count);
      setCurrentPage(1);
    } catch (error) {
      console.error('Erro ao buscar emails:', error);
      toast.error('Erro ao buscar logs de emails');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    try {
      const data = await getEmailSummaryService();
      setSummary(data);
    } catch (error) {
      console.error('Erro ao buscar resumo:', error);
    }
  }, []);

  // Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const data = await getEmailStatisticsService({
        dias: 30,
      });
      setStatistics(data);
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchEmails();
    fetchSummary();
    fetchStatistics();
  }, []);

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    fetchEmails();
  };

  const handleReset = () => {
    setFilters({
      email: '',
      pedidoId: '',
      codigoPedido: '',
      status: '',
      tipo: '',
      dataInicio: '',
      dataFim: '',
    });
  };

  const handleNextPage = () => {
    if (nextToken) {
      fetchEmails(nextToken);
      setCurrentPage(p => p + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      // Note: Going to previous page would require storing history of tokens
      // For simplicity, reset to first page
      setCurrentPage(1);
      fetchEmails();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Auditoria de Emails</h1>
          <p className="mt-2 text-gray-600">Rastreie e monitore todos os emails enviados pelo sistema</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-5">
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-600">Total Enviados</div>
              <div className="mt-2 text-2xl font-bold text-green-600">{summary.totalEnviados}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-600">Total Erros</div>
              <div className="mt-2 text-2xl font-bold text-red-600">{summary.totalErros}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-600">Pendentes</div>
              <div className="mt-2 text-2xl font-bold text-yellow-600">{summary.totalPendentes}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-600">Taxa de Erro</div>
              <div className="mt-2 text-2xl font-bold text-orange-600">
                {(summary.taxaDeErro * 100).toFixed(2)}%
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-medium text-gray-600">Duração Média</div>
              <div className="mt-2 text-2xl font-bold text-blue-600">
                {formatDuration(summary.duracionMediaMs)}
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-8 p-6">
          <h2 className="mb-4 text-lg font-semibold">Filtros</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
            <div>
              <Label htmlFor="email">Email do Cliente</Label>
              <Input
                id="email"
                placeholder="exemplo@email.com"
                value={filters.email}
                onChange={(e) => handleFilterChange('email', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="codigoPedido">Código do Pedido</Label>
              <Input
                id="codigoPedido"
                placeholder="PED-001"
                value={filters.codigoPedido}
                onChange={(e) => handleFilterChange('codigoPedido', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="pedidoId">ID do Pedido</Label>
              <Input
                id="pedidoId"
                placeholder="abc123xyz"
                value={filters.pedidoId}
                onChange={(e) => handleFilterChange('pedidoId', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="status">Status do Email</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <option value="">Todos</option>
                {EMAIL_STATUS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="tipo">Tipo de Email</Label>
              <Select
                value={filters.tipo}
                onValueChange={(value) => handleFilterChange('tipo', value)}
              >
                <option value="">Todos</option>
                {EMAIL_TIPOS.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={filters.dataInicio}
                onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleFilterChange('dataFim', e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading} className="flex-1">
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button onClick={handleReset} variant="outline" className="flex-1">
                Limpar
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Cliente</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Assunto</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Duração</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {emails.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      {loading ? 'Carregando...' : 'Nenhum email encontrado'}
                    </td>
                  </tr>
                ) : (
                  emails.map((email) => (
                    <tr key={email.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {formatDate(email.dataEnvio || email.dataSolicitacao)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{email.codigoPedido}</td>
                      <td className="px-4 py-3 text-gray-700">{email.nomeCliente}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{email.emailCliente}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{email.assunto}</td>
                      <td className="px-4 py-3 text-gray-600">{email.tipo}</td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(email.status)}>
                          {email.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {formatDuration(email.duracaoMs)}
                      </td>
                      <td className="px-4 py-3">
                        {email.status === 'erro' && email.mensagemErro && (
                          <span className="text-xs text-red-600 cursor-help" title={email.mensagemErro}>
                            ⚠️ Erro
                          </span>
                        )}
                        {email.tentativas > 1 && (
                          <span className="text-xs text-blue-600 ml-2" title={`${email.tentativas} tentativas`}>
                            🔄 {email.tentativas}x
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(nextToken || currentPage > 1) && (
            <div className="border-t bg-white px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Página {currentPage} · {emails.length} resultados exibidos
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  ← Anterior
                </Button>
                <Button
                  onClick={handleNextPage}
                  disabled={!nextToken}
                  variant="outline"
                  size="sm"
                >
                  Próxima →
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Statistics Section */}
        {statistics && (
          <div className="mt-8">
            <h2 className="mb-4 text-2xl font-bold">Estatísticas Detalhadas</h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Top Clientes com Erro */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Clientes com Erros</h3>
                <div className="space-y-3">
                  {statistics.topClientesNoErro.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum erro registrado</p>
                  ) : (
                    statistics.topClientesNoErro.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate">{item.email}</span>
                        <Badge className="bg-red-100 text-red-800">{item.totalErros}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Top Tipos de Erro */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Tipos de Erro Mais Frequentes</h3>
                <div className="space-y-3">
                  {statistics.topTiposErro.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum erro registrado</p>
                  ) : (
                    statistics.topTiposErro.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate text-xs" title={item.mensagemErro}>
                          {item.mensagemErro.length > 50
                            ? item.mensagemErro.substring(0, 47) + '...'
                            : item.mensagemErro}
                        </span>
                        <Badge className="bg-orange-100 text-orange-800">{item.frequencia}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>

            {/* Evolution Graph */}
            {statistics.evolucaoTempo.length > 0 && (
              <Card className="mt-6 p-6">
                <h3 className="mb-4 text-lg font-semibold">Evolução Temporal (últimos 30 dias)</h3>
                <div className="space-y-4">
                  {statistics.evolucaoTempo.slice(-14).map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-20 text-sm font-medium text-gray-700">
                        {formatDate(item.data).split(' ')[0]}
                      </div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 bg-green-500" style={{ width: `${Math.min(item.enviados * 2, 200)}px` }} />
                          <span className="text-sm text-green-600">{item.enviados}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 bg-red-500" style={{ width: `${Math.min(item.erros * 4, 200)}px` }} />
                          <span className="text-sm text-red-600">{item.erros}</span>
                        </div>
                        {item.pendentes > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="h-6 bg-yellow-500" style={{ width: `${Math.min(item.pendentes * 3, 200)}px` }} />
                            <span className="text-sm text-yellow-600">{item.pendentes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-green-500" />
                    <span>Enviados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-red-500" />
                    <span>Erros</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 bg-yellow-500" />
                    <span>Pendentes</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
