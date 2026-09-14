const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const tableName = process.env.DYNAMODB_FUNCIONARIO_TABLE || 'ShoeRepairFuncionarios';
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

function normalizeAtivo(value) {
  if (value === false || value === 'false' || value === 0 || value === '0') return 'false';
  return 'true';
}

exports.createFuncionario = async ({ nome, setorId, email, telefone, cargo, observacoes, ativo = true }) => {
  const agora = new Date().toISOString();
  const item = {
    id: uuidv4(),
    nome,
    setorId,
    email: email || '',
    telefone: telefone || '',
    cargo: cargo || '',
    observacoes: observacoes || '',
    ativo: normalizeAtivo(ativo),
    createdAt: agora,
    updatedAt: agora
  };

  await dynamoDb.put({ TableName: tableName, Item: item }).promise();
  return item;
};

exports.getFuncionario = async (id) => {
  const res = await dynamoDb.get({ TableName: tableName, Key: { id } }).promise();
  return res.Item;
};

exports.listFuncionarios = async ({ setorId, ativo = 'true', limit = 200 } = {}) => {
  const ativos = normalizeAtivo(ativo);

  if (setorId) {
    const params = {
      TableName: tableName,
      IndexName: 'setorId-index',
      KeyConditionExpression: '#setorId = :setorId AND #ativo = :ativo',
      ExpressionAttributeNames: {
        '#setorId': 'setorId',
        '#ativo': 'ativo'
      },
      ExpressionAttributeValues: {
        ':setorId': setorId,
        ':ativo': ativos
      },
      Limit: Number(limit) || 200
    };

    const res = await dynamoDb.query(params).promise();
    return res.Items || [];
  }

  const params = {
    TableName: tableName,
    Limit: Number(limit) || 200
  };

  const filters = [];
  const names = {};
  const values = {};

  if (ativo !== undefined) {
    names['#ativo'] = 'ativo';
    values[':ativo'] = ativos;
    filters.push('#ativo = :ativo');
  }

  if (filters.length > 0) {
    params.FilterExpression = filters.join(' AND ');
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }

  const res = await dynamoDb.scan(params).promise();
  return res.Items || [];
};

exports.updateFuncionario = async (id, updates) => {
  const allowed = ['nome', 'setorId', 'email', 'telefone', 'cargo', 'observacoes', 'ativo'];
  const entries = Object.entries(updates || {}).filter(([k, v]) => allowed.includes(k) && v !== undefined);

  if (entries.length === 0) {
    return await exports.getFuncionario(id);
  }

  const names = { '#updatedAt': 'updatedAt' };
  const values = { ':updatedAt': new Date().toISOString() };
  const setParts = [];

  for (const [key, value] of entries) {
    names[`#${key}`] = key;
    values[`:${key}`] = key === 'ativo' ? normalizeAtivo(value) : value;
    setParts.push(`#${key} = :${key}`);
  }

  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: `SET ${setParts.join(', ')}, #updatedAt = :updatedAt`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW'
  };

  const res = await dynamoDb.update(params).promise();
  return res.Attributes;
};

exports.softDeleteFuncionario = async (id) => {
  return exports.updateFuncionario(id, { ativo: 'false' });
};
