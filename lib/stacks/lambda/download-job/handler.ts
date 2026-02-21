import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  DynamoDBClient,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const dynamo = new DynamoDBClient({});
const s3 = new S3Client({});

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const jobId = event.pathParameters?.id;

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Job ID is required' }),
      };
    }

    const result = await dynamo.send(
      new GetItemCommand({
        TableName: process.env.JOBS_TABLE!,
        Key: { jobId: { S: jobId } },
      })
    );

    if (!result.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Job not found' }),
      };
    }

    if (result.Item.status.S !== 'COMPLETED') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Job not completed yet' }),
      };
    }

    const resultKey = result.Item.resultKey?.S;

    if (!resultKey) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Result not available' }),
      };
    }

    const command = new GetObjectCommand({
      Bucket: process.env.RESULTS_BUCKET!,
      Key: resultKey,
    });

    const signedUrl = await getSignedUrl(s3, command, {
      expiresIn: 300, // 5 minutes
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ downloadUrl: signedUrl }),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
  }
};