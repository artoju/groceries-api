import AWS from "aws-sdk";

export function call(action: string, params: any) {
  const dynamoDb = new AWS.DynamoDB.DocumentClient();

  return dynamoDb[action](params).promise();
}