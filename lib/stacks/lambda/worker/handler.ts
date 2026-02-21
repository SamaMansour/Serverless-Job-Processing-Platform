import { SQSEvent } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const jobId = body.jobId;

    console.log(`Processing job ${jobId}`);

    // simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await client.send(
      new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE!,
        Key: { jobId: { S: jobId } },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: 'COMPLETED' },
        },
      })
    );
  }
};