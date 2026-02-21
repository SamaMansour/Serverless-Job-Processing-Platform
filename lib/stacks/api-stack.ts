import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as s3 from 'aws-cdk-lib/aws-s3';


interface ApiStackProps extends StackProps {
  jobsTable: dynamodb.Table;
  jobResultsBucket: s3.Bucket;

}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const deadLetterQueue = new sqs.Queue(this, 'JobsDLQ', {
      retentionPeriod: cdk.Duration.days(14),
    });

    const jobsQueue = new sqs.Queue(this, 'JobsQueue', {
      visibilityTimeout: cdk.Duration.seconds(30),
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 3,
      },
    });

    const createJobLambda = new NodejsFunction(this, 'CreateJobLambda', {
      entry: path.join(process.cwd(), 'lib/stacks/lambda/create-job/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        JOBS_TABLE: props.jobsTable.tableName,
        JOBS_QUEUE_URL: jobsQueue.queueUrl,
      },
    });

   

    props.jobsTable.grantWriteData(createJobLambda);
    jobsQueue.grantSendMessages(createJobLambda);

    const workerLambda = new NodejsFunction(this, 'WorkerLambda', {
      entry: path.join(process.cwd(), 'lib/stacks/lambda/worker/handler.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        JOBS_TABLE: props.jobsTable.tableName,
        JOBS_QUEUE_URL: jobsQueue.queueUrl,
        RESULTS_BUCKET: props.jobResultsBucket.bucketName,

      },
    });

    props.jobsTable.grantWriteData(workerLambda);
    jobsQueue.grantSendMessages(createJobLambda);

    workerLambda.addEventSource(
      new lambdaEventSources.SqsEventSource(jobsQueue)
    );

     const getJobLambda = new NodejsFunction(this, 'GetJobLambda', {
        entry: path.join(process.cwd(), 'lib/stacks/lambda/get-job/handler.ts'),
        runtime: lambda.Runtime.NODEJS_20_X,
        environment: {
          JOBS_TABLE: props.jobsTable.tableName,
        },
      });

    props.jobsTable.grantReadData(getJobLambda);

    const downloadLambda = new NodejsFunction(this, 'DownloadJobLambda', {
      entry: path.join(process.cwd(), 'lib/stacks/lambda/download-job/handler.ts'),
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        JOBS_TABLE: props.jobsTable.tableName,
        RESULTS_BUCKET: props.jobResultsBucket.bucketName,
      },
    });

    props.jobsTable.grantReadData(downloadLambda);
    props.jobResultsBucket.grantRead(downloadLambda);

    const api = new apigateway.RestApi(this, 'JobsApi');

    const jobs = api.root.addResource('jobs');
    jobs.addMethod('POST', new apigateway.LambdaIntegration(createJobLambda));
    const jobById = jobs.addResource('{id}');
    jobById.addMethod('GET', new apigateway.LambdaIntegration(getJobLambda));

    const download = jobById.addResource('download');
    download.addMethod(
      'GET',
      new apigateway.LambdaIntegration(downloadLambda)
    );

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
    });
  }
}