const { jsPDF } = require('jspdf');
const axios = require('axios');
const pedidoService = require('./pedidoService');
const clienteService = require('./clienteService');
const AWS = require('aws-sdk');
const StringSanitizer = require('../utils/stringSanitizer');

// Configurar S3 com região explícita
const s3 = new AWS.S3({ region: process.env.AWS_REGION || 'us-east-1' });
const MAX_FOTOS_PDF = Number(process.env.PDF_MAX_EMBEDDED_FOTOS || 6);
const PRESIGNED_URL_EXPIRES_SECONDS = Number(process.env.S3_PRESIGNED_EXPIRES_SECONDS || 3600);

function extrairS3KeyDaFoto(foto, bucket) {
  if (!foto || typeof foto !== 'string') return null;

  if (!foto.startsWith('http')) {
    return foto.replace(/^\/+/, '');
  }

  try {
    const url = new URL(foto);
    const pathname = decodeURIComponent(url.pathname || '');
    const pathLimpo = pathname.replace(/^\/+/, '');
    const host = (url.hostname || '').toLowerCase();
    const bucketLower = (bucket || '').toLowerCase();
    const isS3Host = host === 's3.amazonaws.com' || /^s3[.-].*\.amazonaws\.com$/.test(host);

    if (bucketLower && host.startsWith(`${bucketLower}.s3`)) {
      return pathLimpo;
    }

    if (bucketLower && host === bucketLower) {
      return pathLimpo;
    }

    if (bucketLower && isS3Host) {
      if (pathLimpo.startsWith(`${bucket}/`)) {
        return pathLimpo.slice(bucket.length + 1);
      }
      return null;
    }

    return null;
  } catch (_error) {
    return null;
  }
}

function resolverBucketEKey(foto) {
  const envBucket = process.env.S3_BUCKET_NAME;

  if (envBucket) {
    const key = extrairS3KeyDaFoto(foto, envBucket);
    if (key) return { bucket: envBucket, key };
  }

  try {
    const url = new URL(foto);
    const host = (url.hostname || '').toLowerCase();
    const pathLimpo = decodeURIComponent((url.pathname || '').replace(/^\/+/u, ''));

    // Formatos: bucket.s3.amazonaws.com/key ou bucket.s3-<region>.amazonaws.com/key
    const hostMatch = host.match(/^(.+)\.s3[.-][a-z0-9-]+\.amazonaws\.com$/);
    if (hostMatch && hostMatch[1]) {
      return { bucket: hostMatch[1], key: pathLimpo };
    }

    // Formato: s3.amazonaws.com/bucket/key
    if (host === 's3.amazonaws.com') {
      const [bucketFromPath, ...rest] = pathLimpo.split('/');
      if (bucketFromPath && rest.length > 0) {
        return { bucket: bucketFromPath, key: rest.join('/') };
      }
    }
  } catch (_error) {
    // Ignora erro de parsing e retorna null
  }

  return null;
}

class PdfService {
  getFormatoImagem(contentType = '', key = '') {
    const contentTypeLower = String(contentType || '').toLowerCase();
    const keyLower = String(key || '').toLowerCase();

    if (contentTypeLower.includes('png') || keyLower.endsWith('.png')) {
      return 'PNG';
    }

    if (contentTypeLower.includes('jpeg') || contentTypeLower.includes('jpg') || keyLower.endsWith('.jpg') || keyLower.endsWith('.jpeg')) {
      return 'JPEG';
    }

    return null;
  }

  async carregarFotoParaPdf(foto) {
    const resolved = resolverBucketEKey(foto);
    const bucket = resolved?.bucket;
    const key = resolved?.key;
    const envBucket = process.env.S3_BUCKET_NAME;

    // Lista de candidatos para tentar no S3 (resolver + env)
    const s3Candidates = [];
    if (bucket && key) s3Candidates.push({ bucket, key });
    if (envBucket) {
      const keyEnv = extrairS3KeyDaFoto(foto, envBucket);
      if (keyEnv) s3Candidates.push({ bucket: envBucket, key: keyEnv });
    }

    console.log('[PdfService] Tentando carregar foto', {
      fotoPreview: typeof foto === 'string' ? foto.slice(0, 120) : 'non-string',
      resolvedBucket: bucket,
      resolvedKey: key,
      envBucket,
      s3CandidatesCount: s3Candidates.length
    });

    // 1) Tentar S3 direto primeiro (usa credencial da Lambda, evita 403 de URL presigned expirada)
    for (const candidate of s3Candidates) {
      try {
        const result = await s3.getObject({ Bucket: candidate.bucket, Key: candidate.key }).promise();
        const formato = this.getFormatoImagem(result.ContentType, candidate.key);
        if (!formato) {
          console.warn('[PdfService] Formato não suportado para foto (S3):', result.ContentType, 'key:', candidate.key);
          continue;
        }

        const base64 = result.Body.toString('base64');
        console.log('[PdfService] Foto carregada via S3', { bucket: candidate.bucket, key: candidate.key, contentType: result.ContentType });
        return {
          formato,
          dataUrl: `data:${result.ContentType || (formato === 'PNG' ? 'image/png' : 'image/jpeg')};base64,${base64}`
        };
      } catch (s3Error) {
        console.warn('[PdfService] Falha ao carregar foto do S3', {
          bucket: candidate.bucket,
          key: candidate.key,
          code: s3Error.code,
          statusCode: s3Error.statusCode,
          region: process.env.AWS_REGION || 'us-east-1',
          message: s3Error.message
        });
      }
    }

    // 2) Fallback: baixar a URL presigned/pública
    if (foto && foto.startsWith('http')) {
      try {
        const response = await axios.get(foto, { responseType: 'arraybuffer', timeout: 10000 });
        const contentType = response.headers['content-type'] || '';
        const formato = this.getFormatoImagem(contentType, key || foto);
        if (!formato) {
          console.warn('[PdfService] Formato não suportado para foto (URL):', contentType, 'key:', key || 'sem-key');
          return null;
        }

        const base64 = Buffer.from(response.data).toString('base64');
        return {
          formato,
          dataUrl: `data:${contentType || (formato === 'PNG' ? 'image/png' : 'image/jpeg')};base64,${base64}`
        };
      } catch (httpError) {
        console.warn('[PdfService] Falha ao baixar foto via URL', {
          status: httpError.response?.status,
          statusText: httpError.response?.statusText,
          message: httpError.message
        });
      }
    }

    console.warn('[PdfService] Não foi possível carregar foto para PDF:', foto);
    return null;
  }
  
  // Função para fazer upload do PDF para S3
  async uploadPdfToS3(pdfBuffer, pedidoId, clienteId) {
    try {
      const bucket = process.env.S3_BUCKET_NAME;
      if (!bucket) {
        throw new Error('Bucket S3 não configurado');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const key = `clientes/${clienteId}/pedidos/${pedidoId}/pdfs/pedido-${pedidoId}-${timestamp}.pdf`;
      
      const params = {
        Bucket: bucket,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: `attachment; filename="pedido-${pedidoId}.pdf"`
      };

      console.log('Fazendo upload do PDF para S3:', key);
      const result = await s3.upload(params).promise();
      console.log('PDF enviado para S3 com sucesso:', result.Location);
      
      return {
        url: result.Location,
        key: key,
        bucket: bucket
      };
    } catch (error) {
      console.error('Erro ao fazer upload do PDF para S3:', error);
      throw error;
    }
  }
  
  // Método de teste para verificar se jsPDF está funcionando
  testPdfGeneration() {
    try {
      console.log('=== TESTE BÁSICO DO JSPDF ===');
      const doc = new jsPDF();
      doc.text('Teste básico', 20, 20);
      const buffer = Buffer.from(doc.output('arraybuffer'));
      console.log('Teste básico concluído. Buffer size:', buffer.length);
      return buffer;
    } catch (error) {
      console.error('Erro no teste básico do jsPDF:', error);
      throw error;
    }
  }
  
  
  // Função para formatar data para exibição
  formatDate(dateString) {
    try {
      if (!dateString) return 'Não informado';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return 'Erro na data';
    }
  }

  // Função para formatar valor monetário
  formatCurrency(value) {
    try {
      if (!value || isNaN(value)) return 'R$ 0,00';
      return `R$ ${Number(value).toFixed(2).replace('.', ',')}`;
    } catch (error) {
      console.error('Erro ao formatar valor:', error);
      return 'R$ 0,00';
    }
  }

  // Versão simplificada para teste
  async generateSimplePdf(pedidoId, clienteId = 'unknown') {
    try {
      console.log('=== GERAÇÃO SIMPLIFICADA DE PDF ===');
      
      const doc = new jsPDF();
      
      // Apenas texto simples
      doc.setFontSize(16);
      doc.text('SHOE REPAIR', 20, 30);
      doc.text('Ordem de Servico', 20, 50);
      doc.text(`Pedido ID: ${pedidoId}`, 20, 70);
      doc.text('Documento de Teste', 20, 90);
      
      const buffer = Buffer.from(doc.output('arraybuffer'));
      console.log('PDF simplificado gerado, tamanho:', buffer.length);
      
      // Fazer upload para S3
      let s3Info = null;
      try {
        s3Info = await this.uploadPdfToS3(buffer, pedidoId, clienteId);
        console.log('PDF simplificado salvo no S3:', s3Info.url);
      } catch (s3Error) {
        console.error('Erro ao salvar PDF simplificado no S3 (continuando sem salvar):', s3Error.message);
      }
      
      return {
        buffer: buffer,
        s3: s3Info
      };
    } catch (error) {
      console.error('Erro no PDF simplificado:', error);
      throw error;
    }
  }

  // Função principal para gerar PDF do pedido
  async generatePedidoPdf(pedidoId) {
    try {
      console.log('=== INICIANDO GERAÇÃO DE PDF ===');
      console.log('pedidoId:', pedidoId);
      
      // Buscar dados do pedido
      const pedidoRaw = await pedidoService.getPedido(pedidoId);
      console.log('Dados do pedido retornados (antes da sanitização):', JSON.stringify(pedidoRaw, null, 2));
      
      if (!pedidoRaw) {
        throw new Error(`Pedido com ID ${pedidoId} não encontrado`);
      }

      // Sanitizar dados do pedido
      const pedido = StringSanitizer.sanitizeObject(pedidoRaw);
      console.log('Dados do pedido sanitizados:', JSON.stringify(pedido, null, 2));

      // Buscar dados do cliente
      const clienteRaw = await clienteService.getCliente(pedido.clienteId);
      console.log('Dados do cliente retornados (antes da sanitização):', JSON.stringify(clienteRaw, null, 2));
      
      if (!clienteRaw) {
        throw new Error(`Cliente com ID ${pedido.clienteId} não encontrado`);
      }

      // Sanitizar dados do cliente
      const cliente = StringSanitizer.sanitizeObject(clienteRaw);
      console.log('Dados do cliente sanitizados:', JSON.stringify(cliente, null, 2));

      // Criar documento PDF
      console.log('Criando documento PDF...');
      const doc = new jsPDF();
      console.log('Documento PDF criado com sucesso');
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      console.log('Dimensões da página - Width:', pageWidth, 'Height:', pageHeight);
      
      let yPosition = 20;

      // Configurar fonte padrão
      doc.setFont('helvetica', 'normal');
      console.log('Fonte configurada');

      // Cabeçalho
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(44, 90, 160); // Cor azul
      
      // Verificar se o texto está sendo adicionado
      console.log('Adicionando texto do cabeçalho...');
      try {
        doc.text('SHOE REPAIR', pageWidth / 2, yPosition, { align: 'center' });
        console.log('Texto do cabeçalho adicionado com align center');
      } catch (alignError) {
        console.log('Erro com align center, tentando sem align:', alignError.message);
        // Calcular posição manual para centralizar
        const textWidth = doc.getTextWidth('SHOE REPAIR');
        const centerX = (pageWidth - textWidth) / 2;
        doc.text('SHOE REPAIR', centerX, yPosition);
        console.log('Texto do cabeçalho adicionado sem align');
      }
      
      yPosition += 10;
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      try {
        doc.text('Ordem de Servico', pageWidth / 2, yPosition, { align: 'center' });
      } catch (alignError) {
        const textWidth = doc.getTextWidth('Ordem de Servico');
        const centerX = (pageWidth - textWidth) / 2;
        doc.text('Ordem de Servico', centerX, yPosition);
      }
      yPosition += 20;

      // Linha separadora
      doc.setDrawColor(44, 90, 160);
      doc.setLineWidth(1);
      doc.line(20, yPosition, pageWidth - 20, yPosition);
      yPosition += 15;

      // Informações do Pedido
      doc.setFontSize(14);
      doc.setTextColor(44, 90, 160);
      doc.text('Informacoes do Pedido', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      
      console.log('Formatando informações do pedido...');
      const pedidoInfo = [
        `Codigo do Pedido: ${pedido.codigo || pedido.id || 'N/A'}`,
        `ID Interno: ${pedido.id}`,
        `Data de Criacao: ${this.formatDate(pedido.createdAt || pedido.dataCriacao)}`,
        `Data Prevista: ${this.formatDate(pedido.dataPrevistaEntrega)}`,
        `Status Atual: ${pedido.status || 'Nao informado'}`,
        `Departamento: ${pedido.departamento || 'Nao informado'}`
      ];
      
      console.log('Informações do pedido formatadas:', pedidoInfo);

      pedidoInfo.forEach(info => {
        doc.text(info, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Dados do Cliente
      doc.setFontSize(14);
      doc.setTextColor(44, 90, 160);
      doc.text('Dados do Cliente', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      console.log('Formatando informações do cliente...');
      const clienteInfo = [
        `Nome: ${cliente.nome || 'Nao informado'}`,
        `CPF: ${cliente.cpf || 'Nao informado'}`,
        `Telefone: ${cliente.telefone || 'Nao informado'}`,
        `Email: ${cliente.email || 'Nao informado'}`,
        `Endereco: ${this.formatClienteEndereco(cliente)}`
      ];
      
      console.log('Informações do cliente formatadas:', clienteInfo);

      clienteInfo.forEach(info => {
        doc.text(info, 25, yPosition);
        yPosition += 6;
      });

      yPosition += 10;

      // Detalhes do Serviço
      doc.setFontSize(14);
      doc.setTextColor(44, 90, 160);
      doc.text('Detalhes do Servico', 20, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Modelo do Tenis: ${pedido.modeloTenis || 'Nao informado'}`, 25, yPosition);
      yPosition += 10;

      // Serviços
      doc.text('Servicos Solicitados:', 25, yPosition);
      yPosition += 8;

      if (pedido.servicos && pedido.servicos.length > 0) {
        pedido.servicos.forEach(servico => {
          // Sanitizar nome e descrição do serviço antes de usar
          const nomeServico = StringSanitizer.sanitizeString(servico.nome || 'Servico');
          const descricaoServico = servico.descricao ? StringSanitizer.sanitizeString(servico.descricao) : null;
          
          doc.text(`- ${nomeServico} - ${this.formatCurrency(servico.preco)}`, 30, yPosition);
          if (descricaoServico) {
            yPosition += 5;
            doc.setFontSize(9);
            doc.text(`  ${descricaoServico}`, 35, yPosition);
            doc.setFontSize(10);
          }
          yPosition += 6;
        });
      } else {
        const tipoServico = StringSanitizer.sanitizeString(pedido.tipoServico || 'Servico não especificado');
        doc.text(`- ${tipoServico} - ${this.formatCurrency(pedido.preco)}`, 30, yPosition);
        yPosition += 6;
      }

      yPosition += 5;

      // Total
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const totalText = `Total: ${this.formatCurrency(pedido.precoTotal || pedido.preco)}`;
      try {
        doc.text(totalText, pageWidth - 60, yPosition, { align: 'right' });
      } catch (alignError) {
        const textWidth = doc.getTextWidth(totalText);
        doc.text(totalText, pageWidth - 20 - textWidth, yPosition);
      }
      yPosition += 15;

      // Observações
      if (pedido.observacoes || pedido.descricaoServicos) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 90, 160);
        doc.text('Observacoes:', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Sanitizar observações antes de usar
        const observacoes = StringSanitizer.sanitizeString(pedido.observacoes || pedido.descricaoServicos);
        const splitText = doc.splitTextToSize(observacoes, pageWidth - 40);
        doc.text(splitText, 25, yPosition);
        yPosition += splitText.length * 5 + 10;
      }

      // Histórico de Status (se há espaço)
      if (pedido.statusHistory && pedido.statusHistory.length > 0 && yPosition < pageHeight - 60) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 90, 160);
        doc.text('Historico de Status:', 20, yPosition);
        yPosition += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);

        pedido.statusHistory.slice(0, 5).forEach(item => { // Mostrar apenas os 5 mais recentes
          const statusText = `${item.status} - ${this.formatDate(item.date)} ${item.time || ''}`;
          doc.text(statusText, 25, yPosition);
          yPosition += 5;
        });
      }

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Documento gerado em ${this.formatDate(new Date().toISOString())}`, 20, pageHeight - 20);
      
      const footerText = 'Shoe Repair - Sistema de Gerenciamento';
      try {
        doc.text(footerText, pageWidth - 20, pageHeight - 20, { align: 'right' });
      } catch (alignError) {
        const textWidth = doc.getTextWidth(footerText);
        doc.text(footerText, pageWidth - 20 - textWidth, pageHeight - 20);
      }

      const fotosPedido = Array.isArray(pedido.fotos) ? pedido.fotos.slice(0, MAX_FOTOS_PDF) : [];
      if (fotosPedido.length > 0) {
        doc.addPage();
        let fotoY = 20;
        let totalRenderizadas = 0;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 90, 160);
        doc.text('Fotos do Pedido', 20, fotoY);
        fotoY += 12;

        for (let index = 0; index < fotosPedido.length; index++) {
          try {
            const fotoCarregada = await this.carregarFotoParaPdf(fotosPedido[index]);
            if (!fotoCarregada) {
              console.warn(`[PdfService] Foto ${index + 1} ignorada (não carregou)`);
              continue;
            }

            const props = doc.getImageProperties(fotoCarregada.dataUrl);
            const maxWidth = pageWidth - 40;
            const maxHeight = 75;
            const escala = Math.min(maxWidth / props.width, maxHeight / props.height);
            const width = props.width * escala;
            const height = props.height * escala;

            console.log(`[PdfService] Foto ${index + 1} propriedades:`, {
              width: props.width,
              height: props.height,
              scaledWidth: width,
              scaledHeight: height,
              format: fotoCarregada.formato
            });

            if (fotoY + height + 12 > pageHeight - 20) {
              doc.addPage();
              fotoY = 20;
            }

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(`Foto ${index + 1}`, 20, fotoY);
            fotoY += 4;

            const posX = (pageWidth - width) / 2;
            doc.addImage(fotoCarregada.dataUrl, fotoCarregada.formato, posX, fotoY, width, height);
            fotoY += height + 10;
            totalRenderizadas += 1;
          } catch (fotoError) {
            console.warn(`[PdfService] Falha ao inserir foto ${index + 1} no PDF:`, fotoError.message);
          }
        }

        if (totalRenderizadas === 0) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(80, 80, 80);
          doc.text('Nenhuma foto disponível para exibição no PDF.', 20, fotoY);
        }
      }

      // Retornar buffer do PDF
      const pdfArrayBuffer = doc.output('arraybuffer');
      console.log('PDF ArrayBuffer gerado, tamanho:', pdfArrayBuffer.byteLength, 'bytes');
      
      const pdfBuffer = Buffer.from(pdfArrayBuffer);
      console.log('Buffer convertido, tamanho:', pdfBuffer.length, 'bytes');
      
      // Fazer upload para S3
      let s3Info = null;
      try {
        s3Info = await this.uploadPdfToS3(pdfBuffer, pedido.id, pedido.clienteId);
        console.log('PDF salvo no S3:', s3Info.url);
      } catch (s3Error) {
        console.error('Erro ao salvar PDF no S3 (continuando sem salvar):', s3Error.message);
      }
      
      console.log('=== PDF GERADO COM SUCESSO ===');
      
      return {
        buffer: pdfBuffer,
        s3: s3Info
      };

    } catch (error) {
      console.error('Erro ao gerar PDF do pedido:', error);
      throw error;
    }
  }

  // Função auxiliar para formatar endereço do cliente
  formatClienteEndereco(cliente) {
    try {
      const enderecoParts = [];
      
      if (cliente && cliente.logradouro) enderecoParts.push(cliente.logradouro);
      if (cliente && cliente.numero) enderecoParts.push(`nº ${cliente.numero}`);
      if (cliente && cliente.bairro) enderecoParts.push(cliente.bairro);
      if (cliente && cliente.cidade) enderecoParts.push(cliente.cidade);
      if (cliente && cliente.estado) enderecoParts.push(cliente.estado);
      if (cliente && cliente.cep) enderecoParts.push(`CEP: ${cliente.cep}`);
      
      return enderecoParts.length > 0 ? enderecoParts.join(', ') : 'Não informado';
    } catch (error) {
      console.error('Erro ao formatar endereço do cliente:', error);
      return 'Erro ao formatar endereço';
    }
  }
}

module.exports = new PdfService();