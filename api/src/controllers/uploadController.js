const AWS = require('aws-sdk');
const s3 = new AWS.S3();

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

function gerarUrlPresignedFoto(foto) {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) return foto;

  const key = extrairS3KeyDaFoto(foto, bucket);
  if (!key) return foto;

  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: key,
    Expires: PRESIGNED_URL_EXPIRES_SECONDS
  });
}

exports.uploadFotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhuma foto enviada.' });
    }
    if (req.files.length > 8) {
      return res.status(400).json({ error: 'Máximo de 8 fotos permitido.' });
    }
    const bucket = process.env.S3_BUCKET_NAME;
    const { pedidoId } = req.body;
    
    if (!pedidoId) {
      return res.status(400).json({ error: 'pedidoId é obrigatório no body.' });
    }

    // Buscar o clienteId do pedido
    const pedidoService = require('../services/pedidoService');
    const pedido = await pedidoService.getPedido(pedidoId);
    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado.' });
    }
    const clienteId = pedido.clienteId;

    console.log('[UploadController] Fazendo upload de fotos:', {
      pedidoId,
      clienteId,
      quantidade: req.files.length
    });

    // CORREÇÃO: Limpa APENAS a pasta de fotos (não remove PDFs!)
    const fotosPrefix = `clientes/${clienteId}/pedidos/${pedidoId}/fotos/`;
    const listParams = {
      Bucket: bucket,
      Prefix: fotosPrefix
    };
    const listedObjects = await s3.listObjectsV2(listParams).promise();
    if (listedObjects.Contents.length > 0) {
      const deleteParams = {
        Bucket: bucket,
        Delete: { Objects: listedObjects.Contents.map(obj => ({ Key: obj.Key })) }
      };
      await s3.deleteObjects(deleteParams).promise();
      console.log(`[UploadController] ${listedObjects.Contents.length} fotos antigas removidas`);
    }

    // Salva as fotos na nova estrutura organizada
    const uploadedUrls = [];
    let idx = 1;
    for (const file of req.files) {
      const key = `clientes/${clienteId}/pedidos/${pedidoId}/fotos/foto-${idx}${getFileExtension(file.originalname)}`;
      const params = {
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };
      const data = await s3.upload(params).promise();
      uploadedUrls.push(data.Location);
      console.log(`[UploadController] Foto ${idx} salva: ${key}`);
      idx++;
    }

    // Atualiza o pedido no DynamoDB com as URLs das imagens
    await pedidoService.updatePedido(pedidoId, { fotos: uploadedUrls });

    console.log('[UploadController] ✅ Pedido atualizado com URLs das fotos:', {
      pedidoId,
      urls: uploadedUrls
    });

    const presignedUrls = uploadedUrls.map(gerarUrlPresignedFoto);

    res.status(200).json({ 
      success: true,
      urls: presignedUrls,
      message: `${uploadedUrls.length} foto(s) salva(s) com sucesso`
    });

// Função auxiliar para pegar a extensão do arquivo
function getFileExtension(filename) {
  const dot = filename.lastIndexOf('.');
  return dot !== -1 ? filename.substring(dot) : '';
}
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
