const bcrypt = require('bcryptjs');
const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const tableName = process.env.DYNAMODB_USER_TABLE || 'ShoeRepairUsers';
const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 10);

function looksHashed(password) {
  return typeof password === 'string' && /^\$2[aby]\$/.test(password);
}

async function hashPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

async function verifyPassword(plain, stored) {
  if (!stored) return false;
  if (looksHashed(stored)) {
    return bcrypt.compare(String(plain), stored);
  }
  // Legado plaintext — aceita uma vez e permite rehash no login
  return String(stored) === String(plain);
}

exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.looksHashed = looksHashed;

exports.createUser = async ({ email, password, nome, role }) => {
  const passwordHash = await hashPassword(password);
  const user = {
    id: uuidv4(),
    email,
    password: passwordHash,
    passwordHash,
    nome,
    role,
  };
  const params = { TableName: tableName, Item: user };
  await dynamoDb.put(params).promise();
  return { id: user.id, email: user.email, nome: user.nome, role: user.role };
};

exports.getUserByEmail = async (email) => {
  const params = {
    TableName: tableName,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  };
  const data = await dynamoDb.query(params).promise();
  return data.Items[0];
};

exports.getUserById = async (id) => {
  const params = { TableName: tableName, Key: { id } };
  const data = await dynamoDb.get(params).promise();
  return data.Item;
};

exports.updateUserPasswordHash = async (id, passwordHash) => {
  const params = {
    TableName: tableName,
    Key: { id },
    UpdateExpression: 'SET #password = :p, passwordHash = :p',
    ExpressionAttributeNames: { '#password': 'password' },
    ExpressionAttributeValues: { ':p': passwordHash },
    ReturnValues: 'ALL_NEW',
  };
  const data = await dynamoDb.update(params).promise();
  return data.Attributes;
};
