import * as cdk from 'aws-cdk-lib';
import * as ec2 from "aws-cdk-lib/aws-ec2"
import * as lambda from "aws-cdk-lib/aws-lambda"
import * as iam from "aws-cdk-lib/aws-iam"
import * as apiGateway from "aws-cdk-lib/aws-apigatewayv2"
import * as apiGatewayIntegrations from "aws-cdk-lib/aws-apigatewayv2-integrations"
import { Construct } from 'constructs';
import path = require('path');

export class VscodeServerCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this,"VPC",{
      maxAzs:2,
    })

    const securityGroup = new ec2.SecurityGroup(this,"security-group",{
      vpc,
      description:"allow ssh and https port 8080",
      allowAllOutbound:true
    })
   
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'allow ssh access from the world');
    securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(8080))

    const instance = new ec2.Instance(this,"instance",{
      vpc,
      securityGroup,
      instanceType:ec2.InstanceType.of(ec2.InstanceClass.T3A,ec2.InstanceSize.LARGE),
      machineImage:ec2.MachineImage.latestAmazonLinux2023(),
    })

    const lambdaStart = new lambda.Function(this,"lambda-start-ec2",{
      runtime:lambda.Runtime.NODEJS_20_X,
      code:lambda.Code.fromAsset(path.resolve(__dirname,"../src/EC2/lib")),      
      handler:"index.startEc2Handler",
      environment:{
        INSTANCE_ID:instance.instanceId
      }
    })

     // Permisos para la Lambda de manejar la EC2
     const handleEc2Policy = new iam.PolicyStatement({
      actions: ['ec2:StartInstances', 'ec2:DescribeInstances'],
      resources: ["*"],  // Solo sobre esta instancia específica
    })
    lambdaStart.addToRolePolicy(handleEc2Policy)

    const httpApi = new apiGateway.HttpApi(this,"http-api",{
      description:"start ec2"
    })

    httpApi.addRoutes({
      path:"/start",
      methods:[apiGateway.HttpMethod.GET],
      integration:new apiGatewayIntegrations.HttpLambdaIntegration("ec2-start",lambdaStart)
    })

    // Salida de la URL del API
    new cdk.CfnOutput(this, 'HttpApiEndpoint', {
      value: httpApi.apiEndpoint,
    });

  }

  
}

