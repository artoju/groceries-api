import { DynamoDB } from "aws-sdk";
import { Context, Callback, APIGatewayEvent } from 'aws-lambda';
import { success, failure } from "./libs/response-lib";
import { v1 as uuid } from "uuid";

export async function create(event: APIGatewayEvent, context: Context, callback: Callback) {
  const dynamoDb = new DynamoDB();
  const data = JSON.parse(event.body || '{}');
  console.info("AddRequest listId: " + data.listId + " item: " + data.name)
  const params: DynamoDB.PutItemInput = {
    TableName: "groceries",
    Item: {
      groceryId: {
        S: uuid()
      },
      listId: {
        S: data.listId
      },
      name: {
        S: data.name
      },
      createdAt: {
        S: Date.now().toString()
      },
      checked: {
        BOOL: false
      }
    }
  };

  try {
    let res = await dynamoDb.putItem(params).promise();
    return success({ item: params.Item, res });
  } catch (e) {
    console.error(e);
    return failure({ status: false, error: e });
  }
};

export async function list(event: APIGatewayEvent, context: Context, callback: Callback) {
  const dynamoDb = new DynamoDB();
  // const data = JSON.parse(event.body || '{}');
  const id = event.pathParameters?.listId
  console.info("ListRequest for id: " + id)
  const params: DynamoDB.QueryInput = {
    KeyConditionExpression: "listId = :listId",
    ExpressionAttributeValues: {
      ":listId": {
        S: id
      }
    },
    TableName: "groceries",

  };

  try {
    let res = await dynamoDb.query(params).promise();
    const items = res.Items?.map(g => {
      return { id: g.groceryId.S, name: g.name?.S, checked: g.checked?.BOOL }
    })
    return success({ items });
  } catch (e) {
    console.error(e);
    return failure({ status: false, error: e });
  }
};

export async function update(event: APIGatewayEvent, context: Context, callback: Callback) {
  const dynamoDb = new DynamoDB();
  const data = JSON.parse(event.body || '{}');
  console.info("UpdateRequest groceryId: " + data.id + " listId: " + data.listId)
  const params: DynamoDB.UpdateItemInput = {
    TableName: "groceries",
    Key: {
      groceryId: { S: data.id },
      listId: { S: data.listId }
    },

    UpdateExpression: "SET #nm = :name, checked = :checked",

    ExpressionAttributeValues: {
      ":name": { S: data.name },
      ":checked": { BOOL: data.checked }
    },
    ExpressionAttributeNames: {
      "#nm": "name",

    },
    ReturnValues: "ALL_NEW"
  };

  try {
    let res = await dynamoDb.updateItem(params).promise();
    return success({ item: res });
  } catch (e) {
    console.error(e);
    return failure({ status: false, error: e });
  }
};

export async function remove(event: APIGatewayEvent, context: Context, callback: Callback) {
  const dynamoDb = new DynamoDB();
  const data = JSON.parse(event.body || '{}');
  console.info("DeleteRequest groceryId: " + data.id + " listId: " + data.listId)
  const params: DynamoDB.DeleteItemInput = {
    TableName: "groceries",
    Key: {
      groceryId: { S: data.id },
      listId: { S: data.listId }
    },
  };

  try {
    await dynamoDb.deleteItem(params).promise();
    return success({ status: true });
  } catch (e) {
    console.error(e);
    return failure({ status: false, error: e });
  }
};

export async function removeAll(event: APIGatewayEvent, context: Context, callback: Callback) {
  const dynamoDb = new DynamoDB();
  const id = event.pathParameters?.listId
  console.info("ClearRequest listId: " + id)
  console.info("Get list items for remove: listId: " + id)
  const queryParams: DynamoDB.QueryInput = {
    KeyConditionExpression: "listId = :listId",
    ExpressionAttributeValues: {
      ":listId": {
        S: id
      }
    },
    TableName: "groceries",

  };

  try {
    let res = await dynamoDb.query(queryParams).promise();
    const keys = res.Items?.map(g => {
      return g.groceryId.S
    })

    if (keys && keys.length > 0) {
      const params: DynamoDB.BatchWriteItemInput = {
        RequestItems: {
          "groceries":
            keys.map(k => {
              return {
                DeleteRequest: {
                  Key: {
                    "groceryId": { "S": k },
                    "listId": { "S": id }
                  }
                }
              }
            })
        }
      };
      await dynamoDb.batchWriteItem(params).promise()
      return success({ status: true });

    } else {
      return success({ status: true });
    }

  } catch (e) {
    console.error(e);
    return failure({ status: false, error: e });
  }

};
