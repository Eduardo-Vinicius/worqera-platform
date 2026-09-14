# 📤 Sistema de Upload

## Visão Geral

Sistema robusto de upload de arquivos integrado com AWS S3, focado no upload de fotos de calçados para os pedidos de reparo.

## Características Principais

- ✅ **Upload Múltiplo** (até 5 arquivos simultâneos)
- ✅ **Limite de Tamanho** (5MB por arquivo)
- ✅ **Integração S3** automática
- ✅ **Validação de Formatos** de imagem
- ✅ **URLs Públicas** retornadas
- ✅ **Middleware de Autenticação** obrigatório
- ✅ **Organização por Cliente** no S3

## Configuração AWS S3

### Variáveis de Ambiente:
```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=sua-access-key
AWS_SECRET_ACCESS_KEY=sua-secret-key
S3_BUCKET_NAME=shoe-repair-uploads

# Upload Limits
MAX_FILE_SIZE=5242880    # 5MB em bytes
MAX_FILES_PER_UPLOAD=5   # Máximo 5 arquivos
```

### Estrutura no S3:
```
shoe-repair-uploads/
├── uploads/
│   ├── 2024-10-03/
│   │   ├── foto_1696347600123.jpg
│   │   ├── foto_1696347601456.jpg
│   │   └── ...
│   └── 2024-10-04/
└── User/
    ├── cliente-123/
    │   ├── fotos/
    │   │   ├── tenis_antes_001.jpg
    │   │   └── tenis_depois_001.jpg
    │   └── pedidos/
    │       └── 10032024AB1C/
    │           └── pdf/
    └── cliente-456/
```

## Endpoints

### 📸 Upload de Fotos

#### `POST /upload/fotos`

**Descrição:** Upload de fotos de calçados (máximo 5 arquivos, 5MB cada).

**Autenticação:** Requerida (Bearer Token)

**Headers:**
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "multipart/form-data"
}
```

**Body (Form Data):**
```
fotos: [File1, File2, File3]  // Array de arquivos de imagem
```

**Formatos Aceitos:**
- JPG/JPEG
- PNG
- GIF
- WEBP

**Validações:**
- ✅ **Quantidade:** Máximo 5 arquivos por requisição
- ✅ **Tamanho:** Máximo 5MB por arquivo
- ✅ **Formato:** Apenas arquivos de imagem
- ✅ **Autenticação:** Token JWT válido obrigatório

**Response (200 - Sucesso):**
```json
{
  "success": true,
  "message": "3 fotos enviadas com sucesso",
  "urls": [
    "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347600123.jpg",
    "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347601456.jpg", 
    "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347602789.jpg"
  ],
  "details": [
    {
      "originalName": "tenis_antes.jpg",
      "s3Key": "uploads/2024-10-03/foto_1696347600123.jpg",
      "url": "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347600123.jpg",
      "size": 245760
    },
    {
      "originalName": "tenis_lateral.jpg", 
      "s3Key": "uploads/2024-10-03/foto_1696347601456.jpg",
      "url": "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347601456.jpg",
      "size": 189344
    },
    {
      "originalName": "tenis_sola.jpg",
      "s3Key": "uploads/2024-10-03/foto_1696347602789.jpg", 
      "url": "https://shoe-repair-uploads.s3.us-east-1.amazonaws.com/uploads/2024-10-03/foto_1696347602789.jpg",
      "size": 156672
    }
  ]
}
```

**Response (400 - Erro de Validação):**
```json
{
  "success": false,
  "error": "Máximo 5 arquivos permitidos por upload"
}
```

**Response (400 - Arquivo Muito Grande):**
```json
{
  "success": false,
  "error": "Arquivo 'tenis_grande.jpg' excede o limite de 5MB"
}
```

**Response (400 - Nenhum Arquivo):**
```json
{
  "success": false,
  "error": "Nenhuma foto foi enviada"
}
```

**Response (401 - Não Autenticado):**
```json
{
  "success": false,
  "error": "Token de acesso requerido"
}
```

**Response (500 - Erro S3):**
```json
{
  "success": false,
  "error": "Erro ao fazer upload para S3: Access Denied"
}
```

## Implementação Técnica

### Multer Configuration:

```javascript
const multer = require('multer');

const upload = multer({
  limits: { 
    fileSize: 5 * 1024 * 1024,  // 5MB
    files: 5                     // Máximo 5 arquivos
  },
  fileFilter: (req, file, cb) => {
    // Validar tipos de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'), false);
    }
  }
});

// Rota com middleware
router.post('/fotos', authMiddleware, upload.array('fotos', 5), uploadController.uploadFotos);
```

### Controller Implementation:

```javascript
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const s3 = new AWS.S3({
  region: process.env.AWS_REGION
});

exports.uploadFotos = async (req, res) => {
  try {
    // Verificar se arquivos foram enviados
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Nenhuma foto foi enviada'
      });
    }

    const uploadPromises = req.files.map(async (file) => {
      // Gerar nome único para o arquivo
      const timestamp = Date.now();
      const randomId = uuidv4().split('-')[0];
      const extension = path.extname(file.originalname);
      const fileName = `foto_${timestamp}_${randomId}${extension}`;
      
      // Definir pasta baseada na data
      const today = new Date().toISOString().split('T')[0];
      const s3Key = `uploads/${today}/${fileName}`;

      const uploadParams = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read'  // Tornar arquivo público
      };

      const result = await s3.upload(uploadParams).promise();
      
      return {
        originalName: file.originalname,
        s3Key: s3Key,
        url: result.Location,
        size: file.size
      };
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map(r => r.url);

    res.json({
      success: true,
      message: `${results.length} fotos enviadas com sucesso`,
      urls: urls,
      details: results
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({
      success: false,
      error: `Erro ao fazer upload: ${error.message}`
    });
  }
};
```

### Route Configuration:

```javascript
const express = require('express');
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'), false);
    }
  }
});

router.post('/fotos', authMiddleware, upload.array('fotos', 5), uploadController.uploadFotos);

module.exports = router;
```

## Geração de Nomes de Arquivo

### Estratégia de Nomenclatura:

```javascript
// Formato: foto_TIMESTAMP_RANDOMID.extensão
// Exemplo: foto_1696347600123_a1b2c3d4.jpg

function generateFileName(originalName) {
  const timestamp = Date.now();                    // 1696347600123
  const randomId = uuidv4().split('-')[0];         // a1b2c3d4
  const extension = path.extname(originalName);    // .jpg
  
  return `foto_${timestamp}_${randomId}${extension}`;
}
```

**Vantagens:**
- ✅ **Único:** Timestamp + UUID evita colisões
- ✅ **Ordenável:** Timestamp permite ordenação cronológica  
- ✅ **Identificável:** Prefixo "foto_" facilita busca
- ✅ **Compatível:** Mantém extensão original

## Organização por Data

### Estrutura Hierárquica:

```
uploads/
├── 2024-10-01/
│   ├── foto_1696176000123_a1b2c3.jpg
│   ├── foto_1696176001456_d4e5f6.jpg
│   └── foto_1696176002789_g7h8i9.jpg
├── 2024-10-02/
│   ├── foto_1696262400321_j0k1l2.jpg
│   └── foto_1696262401654_m3n4o5.jpg
└── 2024-10-03/
    └── foto_1696348800987_p6q7r8.jpg
```

**Benefícios:**
- 🗂️ **Organização** visual por data
- 🔍 **Busca** mais eficiente
- 🧹 **Limpeza** automática por período
- 📊 **Análise** de uso por período

## Segurança

### Validações Implementadas:

1. **Autenticação Obrigatória:**
   ```javascript
   router.post('/fotos', authMiddleware, upload.array('fotos', 5), controller);
   ```

2. **Validação de Tipo MIME:**
   ```javascript
   fileFilter: (req, file, cb) => {
     const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
     
     if (allowedTypes.includes(file.mimetype)) {
       cb(null, true);
     } else {
       cb(new Error('Apenas arquivos de imagem são permitidos'), false);
     }
   }
   ```

3. **Limite de Tamanho:**
   ```javascript
   limits: { 
     fileSize: 5 * 1024 * 1024,  // 5MB por arquivo
     files: 5                     // Máximo 5 arquivos
   }
   ```

4. **Sanitização de Nome:**
   ```javascript
   // Remove caracteres especiais e usa UUID
   const fileName = `foto_${timestamp}_${randomId}${extension}`;
   ```

### Permissões S3:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::shoe-repair-uploads/uploads/*"
    },
    {
      "Effect": "Allow", 
      "Principal": {
        "AWS": "arn:aws:iam::ACCOUNT:user/shoe-repair-api"
      },
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": "arn:aws:s3:::shoe-repair-uploads/*"
    }
  ]
}
```

## Integração com Pedidos

### Fluxo de Uso:

1. **Cliente/Funcionário** faz upload das fotos
2. **API retorna URLs** das fotos no S3
3. **URLs são incluídas** na criação do pedido
4. **Pedido é salvo** com referências às fotos

### Exemplo de Integração:

```javascript
// 1. Upload das fotos
const uploadResponse = await fetch('/upload/fotos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData  // FormData com arquivos
});

const { urls } = await uploadResponse.json();

// 2. Criar pedido com as fotos
const pedidoResponse = await fetch('/pedidos', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    clienteId: 'cliente-123',
    clientName: 'João Silva',
    modeloTenis: 'Nike Air Max',
    fotos: urls,  // ← URLs retornadas do upload
    // ... demais campos
  })
});
```

## Tratamento de Erros

### Erros do Multer:

```javascript
// Middleware para capturar erros do multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Arquivo excede o limite de 5MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Máximo 5 arquivos permitidos'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Campo de arquivo não esperado'
      });
    }
  }
  
  next(error);
});
```

### Erros do AWS S3:

```javascript
try {
  const result = await s3.upload(uploadParams).promise();
  // ... sucesso
} catch (error) {
  console.error('Erro S3:', error);
  
  if (error.code === 'NoSuchBucket') {
    return res.status(500).json({
      success: false,
      error: 'Bucket S3 não encontrado'
    });
  }
  
  if (error.code === 'AccessDenied') {
    return res.status(500).json({
      success: false,
      error: 'Acesso negado ao S3'
    });
  }
  
  return res.status(500).json({
    success: false,
    error: `Erro ao fazer upload: ${error.message}`
  });
}
```

## Monitoramento e Logs

### Logs Detalhados:

```javascript
exports.uploadFotos = async (req, res) => {
  const startTime = Date.now();
  const userId = req.user?.sub;
  
  console.log(`[Upload] Iniciado por usuário ${userId}:`, {
    fileCount: req.files?.length || 0,
    totalSize: req.files?.reduce((acc, f) => acc + f.size, 0) || 0
  });
  
  try {
    // ... processo de upload
    
    const duration = Date.now() - startTime;
    console.log(`[Upload] Concluído em ${duration}ms:`, {
      userId,
      fileCount: results.length,
      urls: results.map(r => r.url)
    });
    
  } catch (error) {
    console.error(`[Upload] Erro para usuário ${userId}:`, {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });
  }
};
```

## 🚀 Exemplos de Uso

### 1. Upload via cURL:

```bash
# Upload de uma foto
curl -X POST https://api.shoerepair.com/dev/upload/fotos \
  -H "Authorization: Bearer eyJhbGci..." \
  -F "fotos=@tenis_antes.jpg"

# Upload de múltiplas fotos
curl -X POST https://api.shoerepair.com/dev/upload/fotos \
  -H "Authorization: Bearer eyJhbGci..." \
  -F "fotos=@tenis_antes.jpg" \
  -F "fotos=@tenis_lateral.jpg" \
  -F "fotos=@tenis_sola.jpg"
```

### 2. Upload via JavaScript (Frontend):

```javascript
// Função de upload
async function uploadFotos(files, token) {
  const formData = new FormData();
  
  // Adicionar arquivos ao FormData
  Array.from(files).forEach(file => {
    formData.append('fotos', file);
  });
  
  try {
    const response = await fetch('/upload/fotos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    return result.urls;
    
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error;
  }
}

// Uso com input file
const fileInput = document.getElementById('fotosInput');
const files = fileInput.files;
const token = localStorage.getItem('token');

uploadFotos(files, token)
  .then(urls => {
    console.log('Fotos enviadas:', urls);
    // Usar URLs para criar pedido
  })
  .catch(error => {
    console.error('Falha no upload:', error);
  });
```

### 3. Upload com React:

```jsx
import React, { useState } from 'react';

function PhotoUpload() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  
  const handleUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('fotos', file);
      });
      
      const response = await fetch('/upload/fotos', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUploadedUrls(result.urls);
        console.log('Upload concluído:', result.urls);
      } else {
        console.error('Erro:', result.error);
      }
      
    } catch (error) {
      console.error('Erro no upload:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      
      {uploading && <p>Enviando fotos...</p>}
      
      {uploadedUrls.length > 0 && (
        <div>
          <h3>Fotos enviadas:</h3>
          {uploadedUrls.map((url, index) => (
            <img 
              key={index} 
              src={url} 
              alt={`Foto ${index + 1}`}
              style={{ width: '100px', height: '100px', margin: '5px' }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PhotoUpload;
```

## Otimizações e Melhorias Futuras

### Possíveis Implementações:

1. **Compressão de Imagem:**
   ```javascript
   const sharp = require('sharp');
   
   // Comprimir imagem antes do upload
   const compressedBuffer = await sharp(file.buffer)
     .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
     .jpeg({ quality: 85 })
     .toBuffer();
   ```

2. **Upload Progressivo:**
   ```javascript
   // WebSocket para progresso em tempo real
   const uploadWithProgress = (file, onProgress) => {
     return new Promise((resolve, reject) => {
       // Implementar chunks e progresso
     });
   };
   ```

3. **Validação de Conteúdo:**
   ```javascript
   const fileType = await FileType.fromBuffer(file.buffer);
   if (!fileType || !fileType.mime.startsWith('image/')) {
     throw new Error('Arquivo não é uma imagem válida');
   }
   ```

4. **CDN Integration:**
   ```javascript
   // CloudFront para entrega otimizada
   const cdnUrl = `https://cdn.shoerepair.com/${s3Key}`;
   ```

---

**Arquivos Relacionados:**
- `src/controllers/uploadController.js`
- `src/routes/uploadRoutes.js`
- `src/middleware/authMiddleware.js`