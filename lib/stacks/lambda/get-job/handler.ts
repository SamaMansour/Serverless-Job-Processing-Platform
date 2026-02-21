import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobId = event.pathParameters?.id;

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Job ID is required' }),
      };
    }

    const result = await client.send(
      new GetItemCommand({
        TableName: process.env.JOBS_TABLE!,
        Key: {
          jobId: { S: jobId },
        },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Job not found' }),
      };
    }

    return {
    statusCode: 200,
    body: JSON.stringify({
        jobId: result.Item.jobId.S,
        status: result.Item.status.S,
        createdAt: result.Item.createdAt.S,
        type: result.Item.type.S,
        resultKey: result.Item.resultKey?.S || null,
    }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};