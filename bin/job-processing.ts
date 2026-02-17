import * as cdk from 'aws-cdk-lib';
import { DataStack } from '../lib/stacks/data-stack';

const app = new cdk.App();

new DataStack(app, 'DataStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
