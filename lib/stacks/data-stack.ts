import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class DataStack extends Stack {
  public readonly jobsTable: dynamodb.Table;
  public readonly jobResultsBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.jobsTable = new dynamodb.Table(this, 'JobsTable', {
      partitionKey: { name: 'jobId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: undefined, // we fix later for prod safety
    });

    this.jobResultsBucket = new s3.Bucket(this, 'JobResultsBucket', {
      versioned: false,
      removalPolicy: undefined,
    });
  }
}
