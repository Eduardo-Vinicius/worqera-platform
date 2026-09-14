const AWS = require('aws-sdk');

exports.getDynamoDbClient = () => {
  return new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
};
