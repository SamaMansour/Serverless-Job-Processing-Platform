import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as path from 'path';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface ApiStackProps extends StackProps {
  jobsTable: dynamodb.Table;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const createJobLambda = new NodejsFunction(this, 'CreateJobLambda', {
      entry: path.join(__dirname, './lambda/create-job/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        JOBS_TABLE: props.jobsTable.tableName,
      },
    });

    props.jobsTable.grantWriteData(createJobLambda);

    const api = new apigateway.RestApi(this, 'JobsApi');

    const jobs = api.root.addResource('jobs');
    jobs.addMethod('POST', new apigateway.LambdaIntegration(createJobLambda));
  }
}