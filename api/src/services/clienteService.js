const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const tableName = process.env.DYNAMODB_CLIENTE_TABLE || 'shoeRepairClientes';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.listClientes = async () => {
  const params = { TableName: tableName };
  const data = await dynamoDb.scan(params).promise();
  return data.Items;
};

exports.getCliente = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  return data.Item;
};

exports.createCliente = async (cliente) => {
  const novoCliente = { ...cliente, id: uuidv4() };
  const params = { TableName: tableName, Item: novoCliente };
  await dynamoDb.put(params).promise();
  return novoCliente;
};

exports.updateCliente = async (id, updates) => {
  // Atualiza todos os campos exceto id
  let updateExp = 'set ';
  const attrNames = {};
  const attrValues = {};
  let prefix = '';
  for (const key in updates) {
    if (key === 'id') continue;
    updateExp += `${prefix}#${key} = :${key}`;
    attrNames[`#${key}`] = key;
    attrValues[`:${key}`] = updates[key];
    prefix = ', ';
  }
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: updateExp,
    ExpressionAttributeNames: attrNames,
    ExpressionAttributeValues: attrValues,
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};

exports.deleteCliente = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  await dynamoDb.delete(params).promise();
  return true;
};
