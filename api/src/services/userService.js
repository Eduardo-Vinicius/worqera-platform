const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');
const tableName = process.env.DYNAMODB_USER_TABLE || 'ShoeRepairUsers';

const dynamoDb = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });

exports.createUser = async ({ email, password, nome, role }) => {
  const user = { id: uuidv4(), email, password, nome, role };
  const params = { TableName: tableName, Item: user };
  await dynamoDb.put(params).promise();
  return user;
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
