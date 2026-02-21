import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');

    const jobId = uuidv4();

    await client.send(
      new PutItemCommand({
        TableName: process.env.JOBS_TABLE!,
        Item: {
          jobId: { S: jobId },
          status: { S: 'PENDING' },
          createdAt: { S: new Date().toISOString() },
          type: { S: body.type || 'GENERIC' },
        },
      })
    );

    return {
      statusCode: 201,
      body: JSON.stringify({ jobId }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};