import { SQSEvent } from 'aws-lambda';
import {
  DynamoDBClient,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    const body = JSON.parse(record.body);
    const jobId = body.jobId;

    console.log(`Processing job ${jobId}`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulated result
    const resultData = {
      jobId,
      processedAt: new Date().toISOString(),
      message: 'Job successfully processed',
    };

    const s3Key = `results/${jobId}.json`;

    // Upload to S3
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.RESULTS_BUCKET!,
        Key: s3Key,
        Body: JSON.stringify(resultData),
        ContentType: 'application/json',
      })
    );

    // Update DynamoDB with result key
    await dynamo.send(
      new UpdateItemCommand({
        TableName: process.env.JOBS_TABLE!,
        Key: { jobId: { S: jobId } },
        UpdateExpression:
          'SET #status = :status, resultKey = :resultKey',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':status': { S: 'COMPLETED' },
          ':resultKey': { S: s3Key },
        },
      })
    );
  }
};