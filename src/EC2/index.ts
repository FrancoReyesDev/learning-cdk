import { EC2Client, StartInstancesCommand } from "@aws-sdk/client-ec2";

const instanceId = process.env.INSTANCE_ID;

export async function startEc2Handler  (){
  const client = new EC2Client({});
  const command = new StartInstancesCommand({
    InstanceIds: [instanceId],
  });

  try {
    const { StartingInstances } = await client.send(command);
    const instanceIdList = (StartingInstances??[]).map(
      (instance) => ` • ${instance.InstanceId}`,
    );
    console.log("Starting instances:");
    console.log(instanceIdList.join("\n"));
  } catch (caught) {
    if (
      caught instanceof Error &&
      caught.name === "InvalidInstanceID.NotFound"
    ) {
      console.warn(`${caught.message}`);
    } else {
      throw caught;
    }
  }
};

