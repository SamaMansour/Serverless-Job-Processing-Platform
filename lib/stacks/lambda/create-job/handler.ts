import { APIGatewayProxyHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({});
const sqsClient = new SQSClient({});

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

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.JOBS_QUEUE_URL!,
        MessageBody: JSON.stringify({ jobId }),
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